// car.js — arcade rally physics. Loose by default: the car is meant to be sideways
// most of the time, so grip is low and rotation is cheap.
//
// Auto-throttle: there is no gas pedal. You are always flat out unless the handbrake
// is down. The two ways to rotate the car are the handbrake (blunt, kills speed) and
// a downshift (scalpel, keeps speed).

export const CAR = {
  power: 14.0,          // forward accel at a standstill, m/s^2
  powerFalloff: 0.011,  // how fast power dies off with speed. 0.055 strangled it:
                        // 0-60 took 11s and it topped out at 61mph.
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
  brakeDrag: 0.60,      // speed scrubbed by the handbrake. 1.65 was 4.5g of
                        // deceleration, which is why a tap threw the car forward.

  downshiftYaw: 2.35,   // one-shot rotation kick from a downshift
  downshiftCost: 0.035, // fraction of speed given up for it
  downshiftCooldown: 0.42,

  // Going off is NOT a speed penalty. It's a feel penalty: the car goes light and
  // loose and the whole picture starts shaking so hard you can't place it. The drag
  // used to be 3.4, which just quietly slowed you down and taught nothing.
  offroadGrip: 0.46,    // grip multiplier off the road
  offroadDrag: 0.8,     // extra drag off the road

  understeerScrub: 2.2, // m/s^2 of speed lost per unit of over-turning
  leanPerG: 0.010,      // how far the body leans per m/s^2 of cornering load. 0.038 gave
                        // 19 degrees at the limit, which banks like an aircraft — a real
                        // car rolls 3-7 degrees.
  rollTrip: 8.5,        // sideways m/s that tips the car when a wheel digs in off-road
  rollLanding: 0.90,    // landing severity that puts it on its roof
  // Rigid-body wreck. Half-extents of the shell, the moment of inertia per unit mass,
  // and how bouncy / grippy the panels are against the ground.
  boxW: 0.85, boxH: 0.62, boxL: 1.95,
  inertia: 1.55,
  restitution: 0.30,
  bodyFriction: 0.95,

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
    this.settled = false;    // finished tumbling and come to rest
    // Orientation as a quaternion so it can tumble on any axis, not just roll.
    this.q = { x: 0, y: 0, z: 0, w: 1 };
    this.wx = 0; this.wy = 0; this.wz = 0;   // angular velocity, world space, rad/s
    this.rollTime = 0;
    this._rest = 0;
    this._wasContact = false;
    this.impact = 0;         // set on each ground hit, consumed for a crunch
    this.accelLong = 0;
    this.pitch = 0;        // visual only, from suspension + air
    this.roll = 0;
  }

  get speed() { return Math.hypot(this.vf, this.vr); }
  get speedFactor() { return Math.min(1, this.speed / CAR.topSpeed); }
  get slip() { return Math.atan2(this.vr, Math.max(1, Math.abs(this.vf))); }
  get bodyRoll() { return this.roll * 0.75; }
  // Consume the one-shot impact magnitude.
  takeImpact() { const i = this.impact; this.impact = 0; return i; }

  downshift() {
    if (this._dsCool > 0 || this.airborne) return false;
    this._dsCool = CAR.downshiftCooldown;
    this._dsFire = true;
    return true;
  }

  // Once it's over it is a rigid body, not an animation. Eight corners of the shell
  // are tested against the ground every tick; any that are through it get a proper
  // contact impulse, which changes both the linear velocity AND the spin about the
  // centre of mass. So it lands on a corner and that corner flips it, it can end up
  // on its roof, and it settles because the impulses take the energy out — none of
  // that is scripted.
  _tumbleStep(dt, ground) {
    // --- integrate orientation from angular velocity ---------------------------
    const q = this.q;
    const hx = this.wx * dt * 0.5, hy = this.wy * dt * 0.5, hz = this.wz * dt * 0.5;
    const nx = q.w * hx + q.y * hz - q.z * hy;
    const ny = q.w * hy + q.z * hx - q.x * hz;
    const nz = q.w * hz + q.x * hy - q.y * hx;
    const nw = -(q.x * hx + q.y * hy + q.z * hz);
    q.x += nx; q.y += ny; q.z += nz; q.w += nw;
    const inv = 1 / Math.hypot(q.x, q.y, q.z, q.w);
    q.x *= inv; q.y *= inv; q.z *= inv; q.w *= inv;

    // --- gravity ---------------------------------------------------------------
    this.vy -= CAR.gravity * dt;

    // world velocity of the centre of mass
    let vx = this.vf * Math.sin(this.yaw) + this.vr * Math.cos(this.yaw);
    let vz = this.vf * Math.cos(this.yaw) - this.vr * Math.sin(this.yaw);
    let vy = this.vy;

    // centre of mass sits a body-height above the wheels
    let cx = this.x, cy = this.y + CAR.boxH, cz = this.z;
    cx += vx * dt; cy += vy * dt; cz += vz * dt;

    // --- contacts: every corner of the shell ----------------------------------
    const I = CAR.inertia;
    let worstPen = 0;

    // Find every corner that's through the ground first, so the impulses can be
    // shared between them properly instead of the first one taking the whole hit.
    const contacts = [];
    for (let i = 0; i < 8; i++) {
      const lx = (i & 1 ? 1 : -1) * CAR.boxW;
      const ly = (i & 2 ? 1 : -1) * CAR.boxH;
      const lz = (i & 4 ? 1 : -1) * CAR.boxL;
      const r = this.rotate(lx, ly, lz);
      const pen = ground.height - (cy + r.y);
      if (pen > 0) { contacts.push(r); worstPen = Math.max(worstPen, pen); }
    }
    const hit = contacts.length;
    // NOT divided between corners. denom already carries the rotational effective mass
    // for each contact point, so splitting it again left contacts unresolved: the body
    // sank, the position fix teleported it back out, and that handed it free energy
    // every tick — the spin climbed instead of decaying.
    const share = 1;

    for (const r of contacts) {
      // velocity of that corner = linear + spin about the centre of mass
      const pvy = vy + (this.wz * r.x - this.wx * r.z);
      if (pvy >= 0) continue;

      // Restitution only above a threshold. Below it the body must NOT bounce, or it
      // trades tiny hops with the ground forever and never comes to rest.
      const e = -pvy > 2.0 ? CAR.restitution : 0;
      const denom = 1 + (r.x * r.x + r.z * r.z) / I;
      const j = (-(1 + e) * pvy / denom) * share;
      vy += j;
      this.wx += (-r.z * j) / I;
      this.wz += (r.x * j) / I;

      // friction: panels dragging on dirt, which is what actually stops it
      const pvx = vx + (this.wy * r.z - this.wz * r.y);
      const pvz = vz + (this.wx * r.y - this.wy * r.x);
      const tmag = Math.hypot(pvx, pvz);
      if (tmag > 0.01) {
        const jf = Math.min(CAR.bodyFriction * Math.abs(j), tmag * 0.5);
        vx -= (pvx / tmag) * jf;
        vz -= (pvz / tmag) * jf;
        this.wy -= ((r.x * (pvz / tmag) - r.z * (pvx / tmag)) * jf) / I;
      }
    }

    // Allow a little penetration (slop) and only take out a fraction of the excess, so
    // resting contact doesn't jitter and the correction can't act as an energy source.
    if (worstPen > 0.015) cy += (worstPen - 0.015) * 0.30;

    // An impact is ARRIVING at the ground, not being on it. Without this every tick
    // spent in contact counted as a hit and it crunched ~2000 times per roll.
    const touching = hit > 0;
    if (touching && !this._wasContact) {
      const impact = Math.min(1, -Math.min(0, this.vy) / 13);
      if (impact > 0.10) this.impact = Math.max(this.impact, impact);
    }
    this._wasContact = touching;

    // --- write back ------------------------------------------------------------
    this.vy = vy;
    this.x = cx; this.z = cz; this.y = cy - CAR.boxH;
    this.vf = vx * Math.sin(this.yaw) + vz * Math.cos(this.yaw);
    this.vr = vx * Math.cos(this.yaw) - vz * Math.sin(this.yaw);

    // A wreck has a top tumbling speed; without a ceiling a bad solve can run away.
    const spinMag = Math.hypot(this.wx, this.wy, this.wz);
    if (spinMag > 13) {
      const s = 13 / spinMag;
      this.wx *= s; this.wy *= s; this.wz *= s;
    }

    // air drag on the spin, so it doesn't windmill forever
    const spinDamp = Math.exp(-(hit ? 2.6 : 0.15) * dt);
    this.wx *= spinDamp; this.wy *= spinDamp; this.wz *= spinDamp;

    // Resting: once it's slow and touching, bleed the last of it out hard, or the
    // solver trades tiny impulses back and forth forever and it never sleeps.
    let spin = Math.hypot(this.wx, this.wy, this.wz);
    const slide = Math.hypot(this.vf, this.vr);
    if (hit && spin < 3.6 && slide < 7) {
      const k = Math.exp(-5.5 * dt);
      this.wx *= k; this.wy *= k; this.wz *= k;
      this.vf *= k; this.vr *= k;
      spin = Math.hypot(this.wx, this.wy, this.wz);
    }

    this.rollTime = (this.rollTime || 0) + dt;
    if (!this.settled) {
      const still = hit && spin < 0.95 && Math.hypot(this.vf, this.vr) < 1.4 && Math.abs(this.vy) < 1.4;
      this._rest = still ? (this._rest || 0) + dt : 0;
      if (this._rest > 0.25 || this.rollTime > 5.0) this.settled = true;
    }
  }

  // Rotate a body-local vector into the world by the current orientation.
  rotate(x, y, z) {
    const { x: qx, y: qy, z: qz, w } = this.q;
    const tx = 2 * (qy * z - qz * y);
    const ty = 2 * (qz * x - qx * z);
    const tz = 2 * (qx * y - qy * x);
    return {
      x: x + w * tx + (qy * tz - qz * ty),
      y: y + w * ty + (qz * tx - qx * tz),
      z: z + w * tz + (qx * ty - qy * tx),
    };
  }

  // ground: { height, onRoad } sampled from the stage at the car's position.
  step(dt, wheelPos, handbrake, ground) {
    if (this.rolled) return this._tumbleStep(dt, ground);
    if (this._dsCool > 0) this._dsCool -= dt;
    const vfBefore = this.vf;

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
    const trippedOffRoad = !ground.onRoad && Math.abs(this.vr) > CAR.rollTrip && this.speed > 11;
    if (trippedOffRoad || this.landingHit > CAR.rollLanding) {
      this.rolled = true;
      // Hand the rigid body its starting state: current heading as the orientation,
      // and a spin about the roll axis from however sideways it was going. Everything
      // after this is contacts and gravity.
      const h = this.yaw * 0.5;
      this.q = { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) };
      const dir = Math.sign(this.vr || 1);
      const f = this.rotate(0, 0, 1);
      this.wx = f.x * dir * (5.5 + this.speed * 0.16);
      this.wz = f.z * dir * (5.5 + this.speed * 0.16);
      this.wy = dir * 1.1;
      this.vy = 3.2;
      this.impact = 0.8;
    }

    // ---- body attitude, visual only -----------------------------------------
    // Lean is driven by cornering load, so hard corners genuinely feel like they're
    // about to put you over even though grip caps the real thing.
    const latAccel = this.vf * this.yawRate;
    const targetRoll = Math.max(-0.5, Math.min(0.5, latAccel * CAR.leanPerG)) - this.vr * 0.004;
    this.roll += (targetRoll - this.roll) * Math.min(1, 9 * dt);
    // PITCH = the angle of the direction you are actually travelling. While planted vy
    // is the road's gradient, so the car tilts with the hill; in the air it's the flight
    // path, so the nose follows the arc. One formula, continuous across takeoff and
    // landing, and cresting swings the view through ~30 degrees.
    //
    // This used to be hardcoded to 0 on the ground, which pinned the horizon to the
    // exact centre of the screen for the whole stage — a gyro-stabilised drone holding
    // altitude over terrain. That, not the lean, was why it felt like a plane.
    const travelPitch = Math.atan2(this.vy, Math.max(5, Math.abs(this.vf)));
    // Weight transfer on top: it squats under power and dives under braking.
    // Weight transfer is a SUSPENSION response, so it has to lag and stay small. Reading
    // raw per-tick acceleration made a downshift (an instant speed change) spike it and
    // slam the nose down on a tap.
    const rawAccel = (this.vf - vfBefore) / Math.max(dt, 1e-6);
    this.accelLong += (rawAccel - this.accelLong) * Math.min(1, 4 * dt);
    const transfer = this.airborne ? 0 : Math.max(-0.045, Math.min(0.045, this.accelLong * 0.0045));
    const targetPitch = Math.max(-0.55, Math.min(0.55, travelPitch * 0.85 + transfer));
    this.pitch += (targetPitch - this.pitch) * Math.min(1, 12 * dt);
  }
}
