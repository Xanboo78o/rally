// look.js — tilt the phone to look around the cabin.
//
// This is tilt to LOOK, never tilt to steer — steering stays entirely on the thumb.
// Tip the phone down and your head goes down: you see the console, the shifter, the
// footwell. Tip it up and you get headliner and more windscreen.
//
// Neutral is calibrated from wherever you're actually holding it at the start of a run,
// because nobody holds a phone at the same angle twice.

export const LOOK = {
  // THE knob. Degrees of head movement per degree of phone tilt. Deliberate tilts
  // should read; carrying the phone around should not. Raise toward 1 for a big
  // swimmy look, drop toward 0.2 to make it barely there.
  gain: 0.40,
  maxDeg: 12,        // clamp, so you can't lose the road entirely
  deadDeg: 3.0,      // ignore hand tremble entirely before anything moves
  smooth: 0.20,      // seconds. Higher = more damped, less sloshing about.
  parallax: 1.25,    // interior moves this much more than the world — the depth cue
  invert: false,     // flip if it turns out backwards on his phone
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Look {
  constructor() {
    this.deg = 0;          // smoothed head pitch, degrees, + is looking up
    this._target = 0;
    this._neutral = null;
    this.active = false;
    this.blocked = null;   // why it isn't running, for honest reporting

    // ?look=<deg> pins the head angle so headless screenshots can frame a given view.
    const q = new URLSearchParams(location.search);
    this._forced = q.has('look') ? parseFloat(q.get('look')) : null;
    if (this._forced !== null) { this.deg = this._target = this._forced; this.active = true; }
  }

  // Must be called from a real user gesture — iOS refuses the sensor otherwise.
  async enable() {
    if (this._forced !== null || this.active) return;
    try {
      const D = window.DeviceOrientationEvent;
      if (!D) { this.blocked = 'no sensor'; return; }
      if (typeof D.requestPermission === 'function') {
        const res = await D.requestPermission();
        if (res !== 'granted') { this.blocked = 'permission ' + res; return; }
      }
      addEventListener('deviceorientation', e => this._read(e));
      this.active = true;
    } catch (err) {
      this.blocked = String(err && err.message || err);
    }
  }

  recentre() { this._neutral = null; }

  _read(e) {
    if (e.beta === null || e.gamma === null) return;
    const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;

    // Gravity in device coordinates. Derived from beta/gamma only: alpha is rotation
    // about the vertical axis and can't change how tilted the phone is.
    const gx = -Math.cos(b) * Math.sin(g);
    const gy = -Math.sin(b);
    const gz = -Math.cos(b) * Math.cos(g);

    // Which device axis is "up the screen" depends on how the phone is being held.
    const raw = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
    const a = ((raw % 360) + 360) % 360;
    let ux = 0, uy = 1;
    if (a === 90) { ux = -1; uy = 0; }
    else if (a === 180) { ux = 0; uy = -1; }
    else if (a === 270) { ux = 1; uy = 0; }

    // 0 when the screen faces you upright, 90 when it's flat on its back.
    const dotUp = gx * ux + gy * uy;
    const tiltBack = Math.atan2(-gz, -dotUp) * 180 / Math.PI;

    if (this._neutral === null) this._neutral = tiltBack;
    let d = this._neutral - tiltBack;              // tipping the phone flat = looking down
    if (LOOK.invert) d = -d;
    d = Math.abs(d) < LOOK.deadDeg ? 0 : d - Math.sign(d) * LOOK.deadDeg;
    this._target = clamp(d * LOOK.gain, -LOOK.maxDeg, LOOK.maxDeg);
  }

  update(dt) {
    if (this._forced !== null) return this.deg;
    this.deg += (this._target - this.deg) * (1 - Math.exp(-dt / LOOK.smooth));
    return this.deg;
  }

  // How far the interior slides, in pixels. It moves further than the world does, which
  // is what makes it read as a cabin you're inside rather than a sticker on the screen.
  overlayPx(fovDeg, screenH) {
    return (this.deg / fovDeg) * screenH * LOOK.parallax;
  }
}
