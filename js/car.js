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
  maxReverse: 7.0,      // m/s the car can roll backwards down something it can't climb
  reverseEngage: 4.0,   // ...and the speed below which you're allowed to SELECT reverse
  reversePower: 0.45,   // reverse is a crawl, not a second forward gear

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
  // Sideways m/s that tips the car when a wheel digs in off-road. Was 8.5, which is
  // nineteen mph of lateral — i.e. any half-decent drift that touched the verge put you
  // on your roof and ended the run. Adam: "the second i go off ive been instantly
  // getting straight to menu, even though i can 100% recover." At 15 it takes a genuine
  // twenty-degree slide at ninety, and it has to be SUSTAINED: a car trips because a
  // wheel is buried and stays buried, not because of one spike in one tick.
  rollTrip: 15.0,
  rollTripHold: 0.18,   // seconds of that before it goes over
  rollLanding: 0.95,    // landing severity that puts it on its roof
  // How upright you have to end up to be allowed to drive out of it. DESIGN.md always
  // wanted this: "once in a blue moon someone tumbles down the hill, lands on all four
  // wheels and drives out of it." It was never wired up — every tumble was terminal.
  rollRecover: 0.55,    // body up-vector Y at rest, 1 = perfectly upright
  // Rigid-body wreck. Half-extents of the shell, the moment of inertia per unit mass,
  // and how bouncy / grippy the panels are against the ground.
  boxW: 0.85, boxH: 0.62, boxL: 1.95,
  inertia: 1.55,
  restitution: 0.30,
  bodyFriction: 0.95,

  gravity: 22.5,        // exaggerated, so jumps come down decisively
  // How much of gravity fights you along a slope. Adam, on driving onto a bank in the
  // pines: "it should take lots of power to go up a hill that steep and therefore
  // unlikely." Nothing used to resist a climb at all — the car followed the ground up
  // whatever it met, for free, which is how you float up the side of a valley at ninety.
  slopeGrav: 1.0,
  camberFeel: 0.55,     // how much of a cross-slope you feel as body roll
  airYaw: 1.35,         // how much the wheel can rotate you in mid-air

  // Hitting something solid. There are no walls as objects in this game — what there is,
  // since bank went into stage.js, is ground that RISES beside the road: a cut face, the
  // rock in the gorge, the side of a cave. main.js probes the ground a few metres ahead
  // ALONG THE CAR'S HEADING and hands the gradient over as `ground.wall`, which means
  // the angle sorts itself out for free: run parallel to a face and the ground ahead of
  // you is level, so there's no wall; turn into it and there is.
  // Measured, not guessed: driving straight down the whole stage the probe never reads
  // above 0.22, a 25-degree clip of a 6m bank reads 0.34, 45 degrees reads 0.59 and
  // square-on reads 0.82. So the line between "scrubbed a verge" and "hit a wall" sits
  // at 0.45, which leaves twice the margin over anything the road itself does.
  wallSlope: 0.45,
  wallRange: 0.40,      // ...and 0.45 -> 0.85 is glancing -> square-on
  wallScrub: 0.78,      // fraction of speed a full hit takes
  wallDamage: 1.0,      // a square hit at ninety folds the bonnet in one go
  wallSpin: 2.2,        // and throws the car round
  wallCool: 0.40,       // seconds before you can be hit again — one bang, then scraping
  wallBounce: 0.18,     // how much of the closing speed comes back at you off a solid face
  carRadius: 1.05,      // the car, as a circle, for hitting things that are boxes
};

// The ONE piece of randomness in the physics: how much a bad landing kicks the tail.
// It has to be seedable, because tools/simcheck.mjs drives the whole stage and a gate
// that fails one run in five is worse than no gate at all — you learn to re-run it
// instead of reading it. `carSeed()` makes a run reproducible; the game leaves it alone
// and gets a different kick every time, which is the point in the game.
let _rnd = Math.random;
export function carSeed(n) {
  if (n === undefined) { _rnd = Math.random; return; }
  let s = (n | 0) || 1;
  _rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

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
    this.reverse = false;    // double tap the right thumb
    this.landedUpright = false;
    this.recovered = false;
    this._dig = 0;
    // Orientation as a quaternion so it can tumble on any axis, not just roll.
    this.q = { x: 0, y: 0, z: 0, w: 1 };
    this.wx = 0; this.wy = 0; this.wz = 0;   // angular velocity, world space, rad/s
    this.rollTime = 0;
    this._rest = 0;
    this._wasContact = false;
    this.impact = 0;         // set on each ground hit, consumed for a crunch
    // Damage is for the whole run and never heals. 0 is a clean car, 1 is a bonnet
    // folded back to the scuttle. `damageBias` is which corner took it: -1 all left.
    this.damage = 0;
    this.damageBias = 0;
    this._wallCool = 0;
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

  // Double tap the right thumb. There's no gearbox to model and no gear number anywhere
  // in this game — this is one bit: is the engine pushing you forwards or backwards.
  //
  // It only engages at a crawl, the way a real box does, which also means it can never
  // be used as a brake: double-tapping at ninety does nothing at all.
  toggleReverse() {
    if (this.reverse) { this.reverse = false; return true; }
    if (this.rolled || this.speed > CAR.reverseEngage) return false;
    this.reverse = true;
    return true;
  }

  // ---- hitting something solid ---------------------------------------------
  // (nx, nz) is the world-space normal pointing OUT of whatever you hit. Only the
  // velocity along that normal is taken; everything across it survives, so clipping the
  // corner of a house scrapes you down the wall and costs you a tenth, and driving
  // square into one does not. That difference is the whole thing — a wall that always
  // stops you dead is a wall nobody drives near, and this stage is made of them.
  shunt(nx, nz, depth) {
    // Push back out first, or the next tick finds you still inside it.
    this.x += nx * depth;
    this.z += nz * depth;

    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let vx = this.vf * sy + this.vr * cy;
    let vz = this.vf * cy - this.vr * sy;
    const closing = -(vx * nx + vz * nz);
    if (closing <= 0.5) return;                       // sliding along it, or leaving

    // Kill the component going into the wall, keep a little of it as a bounce.
    const take = closing * (1 + CAR.wallBounce);
    vx += nx * take;
    vz += nz * take;
    this.vf = vx * sy + vz * cy;
    this.vr = vx * cy - vz * sy;

    if (this._wallCool > 0) return;                   // one bang, then you're scraping
    const hit = Math.min(1, closing / (CAR.topSpeed * 0.55));
    this.impact = Math.max(this.impact, hit);
    const bias = Math.sign((nx * cy - nz * sy) || 0.001);   // which side of the car it was
    this.damageBias = this.damage > 0.02 ? this.damageBias * 0.7 + bias * 0.3 : bias;
    this.damage = Math.min(1, this.damage + hit * CAR.wallDamage);
    this.yawRate += bias * hit * CAR.wallSpin * 0.8;
    this._wallCool = CAR.wallCool;
  }

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
      // Looser than it was, and capped far lower. Five seconds of tumble plus a car
      // that never quite met the old thresholds is where "and for 10 seconds after it
      // ends THEN fade to black" came from.
      const still = hit && spin < 1.5 && Math.hypot(this.vf, this.vr) < 2.4 && Math.abs(this.vy) < 2.0;
      this._rest = still ? (this._rest || 0) + dt : 0;
      if (this._rest > 0.18 || this.rollTime > 2.8) {
        this.settled = true;
        // Which way up did it stop? Rotate the body's own up-vector into the world.
        const up = this.rotate(0, 1, 0);
        this.landedUpright = up.y > CAR.rollRecover;
        if (this.landedUpright) {
          // On your wheels. Straighten it out, keep whatever you were carrying, and go.
          // The whole roll becomes a moment instead of the end of the run.
          this.rolled = false;
          this.settled = false;
          this.rollTime = 0;
          this._rest = 0;
          this._dig = 0;
          this.q = { x: 0, y: 0, z: 0, w: 1 };
          this.wx = this.wy = this.wz = 0;
          this.yaw = Math.atan2(this.vf * Math.sin(this.yaw) + this.vr * Math.cos(this.yaw),
                                this.vf * Math.cos(this.yaw) - this.vr * Math.sin(this.yaw));
          this.vf = Math.min(CAR.topSpeed, Math.hypot(this.vf, this.vr) * 0.55);
          this.vr = 0;
          this.yawRate = 0;
          this.recovered = true;      // consumed by main.js for a noise and a shake
        }
      }
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

    // ---- driving into something solid ----------------------------------------
    if (this._wallCool > 0) this._wallCool -= dt;
    const wall = ground.wall || 0;
    if (!this.airborne && wall > CAR.wallSlope && this.vf > 5) {
      if (this._wallCool > 0) {
        // Already had the bang; now you're dragging down the face of it.
        this.vf *= 1 - 1.7 * dt;
      } else {
        // How fast you were going into it, and how square-on you were. A glance at
        // thirty should mark the car and only a proper head-on at ninety should fold it.
        const closing = Math.min(1, this.vf / CAR.topSpeed);
        const square = Math.min(1, (wall - CAR.wallSlope) / CAR.wallRange);
        const hit = Math.min(1, closing * (0.15 + 0.85 * square) * 1.1);

        this.vf *= 1 - CAR.wallScrub * hit;
        this.impact = Math.max(this.impact, hit);
        // Which corner took it. Sliding sideways into a face hits that side; otherwise
        // it's whichever way you were steering when you arrived.
        const bias = Math.abs(this.vr) > 0.6 ? Math.sign(this.vr) : Math.sign(wheelPos || 0.001);
        // Never heals, and a car that's already bent keeps most of the bend it had.
        this.damageBias = this.damage > 0.02 ? this.damageBias * 0.7 + bias * 0.3 : bias;
        this.damage = Math.min(1, this.damage + hit * CAR.wallDamage);
        // A wall doesn't stop you square, it throws you off it.
        this.yawRate -= bias * hit * CAR.wallSpin;
        this.vr -= bias * hit * 4;
        this._wallCool = CAR.wallCool;
      }
    }

    // ---- vertical: follow the road, launch off crests, land ------------------
    const wasAir = this.airborne;
    this.vy -= CAR.gravity * dt;
    this.y += this.vy * dt;

    // The gradient of the surface the car is ACTUALLY on, in the direction it's
    // actually pointing. Falls back to the centreline's for anything that hasn't been
    // given a probe (the harnesses, mostly).
    const grade = ground.gradAlong !== undefined ? ground.gradAlong : (ground.slope || 0);

    // Gravity along that slope. This is the whole of "real physics" for a hill: uphill
    // costs you, downhill pays you, and a slope steep enough stops you dead however
    // hard you're trying. sin(atan(g)) rather than g, or a wall reads as infinite.
    if (!this.airborne) {
      this.vf -= CAR.gravity * CAR.slopeGrav * (grade / Math.sqrt(1 + grade * grade)) * dt;
    }

    // The vertical speed the road is asking the car to travel at right now.
    const followVy = this.vf * grade;

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
      this.vr += (_rnd() - 0.5) * 6 * this.landingHit;
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

      // The auto-throttle, pointed whichever way the box is in. `reversePower` keeps it
      // a crawl: reverse exists to get you off a wall and pointed back down the road,
      // not to be a second way of driving the stage.
      const dir = this.reverse ? -1 : 1;
      const push = CAR.power * Math.exp(-CAR.powerFalloff * Math.abs(this.vf)) * surf
                 * (this.reverse ? CAR.reversePower : 1);
      if (!this.rolled) this.vf += dir * push * (1 - handbrake) * dt;
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
    // It is allowed to ROLL BACK. This used to clamp at zero, which was harmless while
    // nothing could ever push the car backwards — and then gravity along a slope could.
    // Nose-into a bank too steep to climb, the car sat at 0mph with the engine running,
    // forever, and couldn't even steer out because yaw rate is proportional to speed.
    // A real car slides back down, and once it's moving it can be turned. That one
    // clamp was every stall the harness found in the village and the gorge.
    if (this.vf < -CAR.maxReverse) this.vf = -CAR.maxReverse;

    // ---- integrate position --------------------------------------------------
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this.x += (this.vf * s + this.vr * c) * dt;
    this.z += (this.vf * c - this.vr * s) * dt;

    // ---- tipping over --------------------------------------------------------
    // You can't roll a car with steering alone — grip runs out first. What actually
    // rolls one is TRIPPING: sliding sideways and having a wheel dig into something.
    const digging = !ground.onRoad && Math.abs(this.vr) > CAR.rollTrip && this.speed > 14;
    this._dig = digging ? (this._dig || 0) + dt : 0;
    const trippedOffRoad = this._dig > CAR.rollTripHold;
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
    // Cornering lean, plus the tilt of the ground itself. A road banked into the corner
    // therefore CANCELS some of the lean, which is exactly what banking is for and what
    // makes it worth putting in the road.
    const cross = this.airborne ? 0 : (ground.gradAcross || 0);
    const targetRoll = Math.max(-0.6, Math.min(0.6,
      latAccel * CAR.leanPerG - Math.atan(cross) * CAR.camberFeel)) - this.vr * 0.004;
    this.roll += (targetRoll - this.roll) * Math.min(1, 9 * dt);
    // PITCH = the angle of the direction you are actually travelling. While planted vy
    // is the road's gradient, so the car tilts with the hill; in the air it's the flight
    // path, so the nose follows the arc. One formula, continuous across takeoff and
    // landing, and cresting swings the view through ~30 degrees.
    //
    // This used to be hardcoded to 0 on the ground, which pinned the horizon to the
    // exact centre of the screen for the whole stage — a gyro-stabilised drone holding
    // altitude over terrain. That, not the lean, was why it felt like a plane.
    // On the ground this is the real surface gradient, so the nose genuinely points up
    // the bank you drove onto instead of staying level while the car climbs it.
    const travelPitch = this.airborne
      ? Math.atan2(this.vy, Math.max(5, Math.abs(this.vf)))
      : Math.atan(ground.gradAlong !== undefined ? ground.gradAlong : (ground.slope || 0));
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
