// wheel.js — the steering wheel as an OBJECT WITH STATE, not an input mapping.
//
// The wheel has an angle that persists. Your thumb applies force to it. Resistance
// grows both with how far it is already turned and with how fast the car is going,
// so the wheel gets heavy at speed and your thumb can outrun it. Let go and it
// unwinds on its own.
//
// Everything here is rate-limited pursuit rather than a spring, so it never wobbles
// and every constant below maps to something you can feel.

export const TUNE = {
  // How fast the wheel can travel toward your thumb, in lock-units per second,
  // when the car is stopped and the wheel is centred. 1.0 = centre to full lock.
  baseRate: 2.4,

  // How much of that rate speed takes away. At speedFactor 1 (top speed) the wheel
  // moves at baseRate / (1 + speedHeavy). Higher = heavier at speed.
  speedHeavy: 2.2,

  // How much of that rate is taken away as the wheel approaches full lock.
  // 0.55 means at full lock you still have 45% of your turning rate left — with two
  // full rotations of travel it only gets "a little" heavier, it shouldn't seize up.
  lockHeavy: 0.55,

  // Self-centring when your thumb is off the wheel, in lock-units per second,
  // plus the extra it gains with speed. A real wheel snaps back harder at speed.
  returnBase: 0.75,
  returnSpeed: 2.4,

  // How far around the imaginary rim your thumb sweeps to go centre -> full lock.
  // One comfortable thumb sweep is roughly 70-80 degrees, so full lock takes about two
  // — you shuffle your thumb the way a driver shuffles their hands. Re-gripping mid-corner
  // doesn't jerk the wheel, so you can wind on more lock without losing what you have.
  fullLockSweep: Math.PI * 0.80,   // ~144 degrees of arc

  // Radius of the imaginary rim in CSS pixels. Your thumb grips the BOTTOM of it,
  // so the hub sits this far above wherever you first touch. Sweep left to go left.
  rimRadius: 135,
};

export class Wheel {
  constructor() {
    this.pos = 0;        // -1 full left .. +1 full right
    this.target = 0;     // where the thumb is asking for
    this.held = false;
    this.rate = 0;       // last frame's actual travel, for feedback/feel readouts
    this._pivot = null;
    this._refSweep = 0;
  }

  // Thumb down. The pivot is placed one rim-radius ABOVE the touch, so the thumb is
  // gripping the bottom of the wheel the way it naturally would. We also bias the
  // reference sweep by the wheel's current position, so re-gripping mid-corner
  // doesn't snap the wheel — you can shuffle your thumb like a real driver.
  grab(x, y) {
    this._pivot = { x, y: y - TUNE.rimRadius };
    const sweep = this._sweepAt(x, y);
    this._refSweep = sweep - this.pos * TUNE.fullLockSweep;
    this.held = true;
    this.target = this.pos;
  }

  move(x, y) {
    if (!this.held || !this._pivot) return;
    const sweep = this._sweepAt(x, y);
    const t = (sweep - this._refSweep) / TUNE.fullLockSweep;
    this.target = Math.max(-1, Math.min(1, t));
  }

  release() {
    this.held = false;
    this._pivot = null;
  }

  // Angle of the thumb around the hub. Screen y grows downward, so negating it puts
  // us in normal maths orientation; sweeping the thumb LEFT then up gives a left turn.
  _sweepAt(x, y) {
    const dx = x - this._pivot.x;
    const dy = -(y - this._pivot.y);
    return Math.atan2(dx, -dy);
  }

  // speedFactor: 0 stopped .. 1 flat out.
  update(dt, speedFactor) {
    const sf = Math.max(0, Math.min(1, speedFactor));
    const before = this.pos;

    if (this.held) {
      // Resistance from speed, and from how far the wheel is already wound on.
      const heavySpeed = 1 / (1 + TUNE.speedHeavy * sf);
      const heavyLock = 1 - TUNE.lockHeavy * Math.abs(this.pos);
      const maxStep = TUNE.baseRate * heavySpeed * heavyLock * dt;

      const want = this.target - this.pos;
      this.pos += Math.max(-maxStep, Math.min(maxStep, want));
    } else {
      const back = (TUNE.returnBase + TUNE.returnSpeed * sf) * dt;
      if (Math.abs(this.pos) <= back) this.pos = 0;
      else this.pos -= Math.sign(this.pos) * back;
    }

    this.pos = Math.max(-1, Math.min(1, this.pos));
    this.rate = (this.pos - before) / Math.max(dt, 1e-6);
  }

  // How far your thumb is ahead of where the wheel actually got to. This is the
  // gap that communicates weight — worth showing while tuning.
  get lag() { return this.held ? this.target - this.pos : 0; }
}
