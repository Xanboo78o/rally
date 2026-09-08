// car.js — arcade rally physics. Loose by default: the car is meant to be sideways
// most of the time, so grip is low and rotation is cheap.
//
// Auto-throttle: there is no gas pedal. You are always flat out unless the handbrake
// is down. The two ways to rotate the car are the handbrake (blunt, kills speed) and
// a downshift (scalpel, keeps speed).

export const CAR = {
  power: 15.5,          // forward accel at a standstill, m/s^2
  powerFalloff: 0.055,  // how fast power dies off with speed
  topSpeed: 47,         // m/s, ~105 mph
  drag: 0.0042,
  rollResist: 0.42,

  maxSteer: 0.62,       // radians of front wheel angle at full lock, ~35 degrees
  wheelbase: 2.55,      // metres. With maxSteer this sets the geometric turning circle.
  steerAuthority: 1.05, // fudge on top of the geometry
  maxLatAccel: 9.5,     // m/s^2 the tyres can hold. THIS is what makes slow corners
                        // sharp and fast ones wide — the old model had neither.
  yawResponse: 7.5,     // how fast yaw rate chases its target
  yawDamp: 3.1,

  gripLat: 3.05,        // lateral grip on gravel. Lower = slidier.
  gripLatBrake: 0.42,   // lateral grip with the handbrake down
  brakeDrag: 1.65,      // speed scrubbed by the handbrake

  downshiftYaw: 2.35,   // one-shot rotation kick from a downshift
  downshiftCost: 0.055, // fraction of speed given up for it
  downshiftCooldown: 0.42,

  offroadGrip: 0.55,    // grip multiplier off the road
  offroadDrag: 3.4,     // extra drag off the road

  understeerScrub: 2.2, // m/s^2 of speed lost per unit of over-turning
  leanPerG: 0.038,      // how far the body leans per m/s^2 of cornering load
  rollTrip: 8.5,        // sideways m/s that tips the car when a wheel digs in off-road
  rollLanding: 0.90,    // landing severity that puts it on its roof

  gravity: 22.5,        // exaggerated, so jumps come down decisively
  airYaw: 1.35,         // how much the wheel can rotate you in mid-air
};

export class Car {
  constructor() {
    this.x = 0; this.z = 0; this.y = 0;
    this.yaw = 0;
    this.vy = 0;
    this.vf = 0;          // velocity along the car's nose
    this.vr = 0;          // velocity out the car's side — this is the slide
    this.yawRate = 0;
    this.airborne = false;
    this.airTime = 0;
    this.lastAirTime = 0;
    this.landingHit = 0;   // set on touchdown: 0 clean .. 1 disaster
    this.justLanded = false;
    this._dsCool = 0;
    this.rolled = false;
    this.rollSpin = 0;
    this.pitch = 0;        // visual only, from suspension + air
    this.roll = 0;
  }

  get speed() { return Math.hypot(this.vf, this.vr); }
  get speedFactor() { return Math.min(1, this.speed / CAR.topSpeed); }
  get slip() { return Math.atan2(this.vr, Math.max(1, Math.abs(this.vf))); }

  downshift() {
    if (this._dsCool > 0 || this.airborne) return false;
    this._dsCool = CAR.downshiftCooldown;
    this._dsFire = true;
    return true;
  }

  // ground: { height, onRoad } sampled from the stage at the car's position.
  step(dt, wheelPos, handbrake, ground) {
    if (this._dsCool > 0) this._dsCool -= dt;

    // ---- vertical: follow the road, launch off crests, land ------------------
    const wasAir = this.airborne;
    this.vy -= CAR.gravity * dt;
    this.y += this.vy * dt;

    // The vertical speed the road is asking the car to travel at right now.
    const followVy = this.vf * (ground.slope || 0);

    if (!wasAir) {
      // Planted. The car can only be pulled down as fast as gravity manages, so if
      // the road drops away faster than that — a crest — it leaves the ground
      // carrying whatever upward momentum the ramp just gave it. That is the jump.
      if (followVy >= this.vy) {
        this.y = ground.height;
        this.vy = followVy;
        this.airTime = 0;
      } else {
        this.airborne = true;
        this.airTime += dt;
      }
    } else if (this.y <= ground.height) {
      this.y = ground.height;
      // Landing quality: how far sideways were we, and how hard did we come down.
      const sideways = Math.min(1, Math.abs(this.slip) / 0.85);
      const drop = Math.min(1, Math.max(0, -this.vy - 6) / 22);
      this.landingHit = Math.min(1, sideways * 0.65 + drop * 0.7);
      this.justLanded = true;
      this.lastAirTime = this.airTime;
      // A bad landing scrubs speed and kicks the car loose.
      this.vf *= 1 - 0.45 * this.landingHit;
      this.vr += (Math.random() - 0.5) * 6 * this.landingHit;
      this.vy = this.vf * (ground.slope || 0);
      this.airborne = false;
      this.airTime = 0;
    } else {
      this.airTime += dt;
    }

    // ---- rotation ------------------------------------------------------------
    // Negated so a wheel swept RIGHT turns the car toward screen-right. The camera
    // looks along +heading via rotateY(PI + yaw), whose local +X is world (-cos, sin),
    // so the car's on-screen right is the direction of DECREASING yaw.
    const steer = -wheelPos * CAR.maxSteer;

    if (this.airborne) {
      // Mid-air the wheel still rotates you. This is the thing to DO up there:
      // get the nose straight before you touch down.
      this.yawRate += steer * CAR.airYaw * dt * 4;
      this.yawRate *= Math.exp(-1.2 * dt);
    } else {
      // Bicycle model: yaw rate = v * tan(steer) / wheelbase. Then cap it by how much
      // lateral acceleration the tyres can actually hold. That cap is the whole feel —
      // at 20mph full lock is a genuine hairpin, at 60 the same lock barely bends you.
      const geometric = (this.vf / CAR.wheelbase) * Math.tan(steer) * CAR.steerAuthority;
      const gripCap = CAR.maxLatAccel / Math.max(4, Math.abs(this.vf));
      // Soft saturation, not a hard clamp. A hard cap made half lock and full lock
      // produce exactly the same corner, which killed most of the wheel's travel.
      // tanh means more lock always buys a little more rotation, with diminishing returns.
      const ratio = geometric / gripCap;
      let targetYaw = gripCap * Math.tanh(ratio);
      // Past the limit the front washes out: you don't rotate more, you scrub speed and
      // run wide. That's what stops over-turning being free.
      const excess = Math.max(0, Math.abs(ratio) - 1);
      this.vf -= Math.min(excess, 3) * CAR.understeerScrub * dt;
      // The handbrake lets you exceed what grip alone would allow. That's the point of it.
      targetYaw *= 1 + 1.15 * handbrake;
      if (this._dsFire) {
        this.yawRate += Math.sign(steer || 0.001) * Math.min(1, Math.abs(wheelPos) * 1.4 + 0.25) * CAR.downshiftYaw;
        this.vf *= 1 - CAR.downshiftCost;
        this._dsFire = false;
      }
      const k = 1 - Math.exp(-CAR.yawResponse * dt);
      this.yawRate += (targetYaw - this.yawRate) * k;
      this.yawRate *= Math.exp(-CAR.yawDamp * dt * 0.25);
    }
    this.yaw += this.yawRate * dt;

    // ---- longitudinal --------------------------------------------------------
    if (!this.airborne) {
      const surf = ground.onRoad ? 1 : CAR.offroadGrip;

      const push = CAR.power * Math.exp(-CAR.powerFalloff * Math.max(0, this.vf)) * surf;
      if (!this.rolled) this.vf += push * (1 - handbrake) * dt;
      this.vf -= CAR.brakeDrag * this.vf * handbrake * dt;

      this.vf -= CAR.drag * this.vf * Math.abs(this.vf) * dt;
      this.vf -= CAR.rollResist * dt * Math.sign(this.vf);
      if (!ground.onRoad) this.vf -= CAR.offroadDrag * dt;

      // ---- grip: the slide decays, and yaw feeds it -------------------------
      const grip = (CAR.gripLat + (CAR.gripLatBrake - CAR.gripLat) * handbrake) * surf;
      this.vr -= this.yawRate * this.vf * dt * 0.85;   // rotating throws the tail out
      this.vr *= Math.exp(-grip * dt);
    } else {
      this.vr *= Math.exp(-0.15 * dt);
    }

    if (this.vf > CAR.topSpeed) this.vf = CAR.topSpeed;
    if (this.vf < 0) this.vf = 0;

    // ---- integrate position --------------------------------------------------
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this.x += (this.vf * s + this.vr * c) * dt;
    this.z += (this.vf * c - this.vr * s) * dt;

    // ---- tipping over --------------------------------------------------------
    // You can't roll a car with steering alone — grip runs out first. What actually
    // rolls one is TRIPPING: sliding sideways and having a wheel dig into something.
    if (!this.rolled) {
      const trippedOffRoad = !ground.onRoad && Math.abs(this.vr) > CAR.rollTrip && this.speed > 11;
      if (trippedOffRoad || this.landingHit > CAR.rollLanding) {
        this.rolled = true;
        this.rollSpin = Math.sign(this.vr || 1) * 5.5;
      }
    } else {
      this.rollSpin *= Math.exp(-1.1 * dt);
      this.vf *= Math.exp(-1.9 * dt);
      this.vr *= Math.exp(-1.9 * dt);
    }

    // ---- body attitude, visual only -----------------------------------------
    // Lean is driven by cornering load, so hard corners genuinely feel like they're
    // about to put you over even though grip caps the real thing.
    const latAccel = this.vf * this.yawRate;
    const targetRoll = this.rolled
      ? this.roll + this.rollSpin * dt
      : Math.max(-0.5, Math.min(0.5, latAccel * CAR.leanPerG)) - this.vr * 0.004;
    this.roll += (targetRoll - this.roll) * Math.min(1, 9 * dt);
    const targetPitch = this.airborne ? Math.max(-0.22, Math.min(0.22, -this.vy * 0.012)) : 0;
    this.pitch += (targetPitch - this.pitch) * Math.min(1, 7 * dt);
  }
}
