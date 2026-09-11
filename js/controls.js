// controls.js — two thumbs, both parked on the dashboard where they block nothing.
//
// LEFT  : grip the wheel and sweep it in an arc. Your thumb sits at the bottom of an
//         imaginary rim; sweep left and up to turn left.
// RIGHT : hold for the handbrake (it ramps in, like pulling a real lever), flick down
//         for a single downshift, or DOUBLE TAP for reverse.
//
// The right thumb now carries three things and still has no buttons under it, because
// they're three different SHAPES rather than three places to put your thumb: a hold, a
// drag, and two quick taps. Nothing on screen moved to make room.
//
// Keyboard mirrors it for desktop tuning: A/D steer, Space handbrake, S downshift,
// R reverse.

const SWIPE_DOWN = 42;      // px of downward travel that counts as a downshift pull
const HB_ON = 0.18;         // seconds to fully pull the handbrake on
const HB_OFF = 0.09;

// What counts as a tap rather than a hold or a pull. Deliberately tight: the handbrake
// is the thing this thumb does most, and a handbrake that has to wait 200ms to find out
// whether it was a tap would be unusable. So the handbrake still engages instantly on
// every touch and a double tap just blips it twice — which is harmless, because reverse
// only selects at a crawl and a blip at a crawl does nothing.
const TAP_MS = 200;         // longest a touch can last and still be a tap
const TAP_MOVE = 22;        // ...and the furthest it can travel
const TAP_GAP = 320;        // ms between the two taps of a double

export class Controls {
  constructor(el, wheel, onDownshift, onReverse = () => {}) {
    this.wheel = wheel;
    this.onDownshift = onDownshift;
    this.onReverse = onReverse;
    this._lastTap = -1e9;
    this.handbrake = 0;
    this._hbHeld = false;
    this._wheelTouch = null;
    this._rightTouch = null;
    this._keys = new Set();
    this._keySteer = 0;

    const isLeft = (x) => x < window.innerWidth * 0.5;

    const down = (id, x, y) => {
      if (isLeft(x)) {
        if (this._wheelTouch !== null) return;
        this._wheelTouch = id;
        this.wheel.grab(x, y);
      } else {
        if (this._rightTouch !== null) return;
        this._rightTouch = { id, x0: x, y0: y, t0: performance.now(), fired: false, moved: false };
        this._hbHeld = true;
      }
    };

    const move = (id, x, y) => {
      if (id === this._wheelTouch) {
        this.wheel.move(x, y);
      } else if (this._rightTouch && id === this._rightTouch.id) {
        const r = this._rightTouch;
        if (Math.abs(x - r.x0) > TAP_MOVE || Math.abs(y - r.y0) > TAP_MOVE) r.moved = true;
        if (!r.fired && y - r.y0 > SWIPE_DOWN) {
          r.fired = true;
          this.onDownshift();
        }
      }
    };

    const up = (id) => {
      if (id === this._wheelTouch) {
        this._wheelTouch = null;
        this.wheel.release();
      } else if (this._rightTouch && id === this._rightTouch.id) {
        const r = this._rightTouch;
        const now = performance.now();
        // A tap is short, went nowhere, and wasn't a downshift pull. Fired on the second
        // tap's RELEASE rather than its press, because a press can't know yet whether
        // it's going to become a tap — and reverse is selected standing still, so the
        // few milliseconds cost nothing.
        if (!r.fired && !r.moved && now - r.t0 < TAP_MS) {
          if (now - this._lastTap < TAP_GAP) { this._lastTap = -1e9; this.onReverse(); }
          else this._lastTap = now;
        } else {
          this._lastTap = -1e9;
        }
        this._rightTouch = null;
        this._hbHeld = false;
      }
    };

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) down(t.identifier, t.clientX, t.clientY);
    }, { passive: false });

    el.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) move(t.identifier, t.clientX, t.clientY);
    }, { passive: false });

    const endTouch = e => {
      for (const t of e.changedTouches) up(t.identifier);
    };
    el.addEventListener('touchend', endTouch);
    el.addEventListener('touchcancel', endTouch);

    // Mouse, so this is tunable at a desk.
    el.addEventListener('mousedown', e => down('m', e.clientX, e.clientY));
    window.addEventListener('mousemove', e => move('m', e.clientX, e.clientY));
    window.addEventListener('mouseup', () => up('m'));

    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      this._keys.add(e.code);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.onDownshift();
      if (e.code === 'KeyR') this.onReverse();
      if (e.code === 'Space') { this._hbHeld = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', e => {
      this._keys.delete(e.code);
      if (e.code === 'Space') this._hbHeld = false;
    });
  }

  update(dt) {
    // Keyboard drives the same wheel object, so it behaves identically to a thumb.
    const L = this._keys.has('KeyA') || this._keys.has('ArrowLeft');
    const R = this._keys.has('KeyD') || this._keys.has('ArrowRight');
    if (L || R) {
      this._keySteer += ((R ? 1 : -1) - this._keySteer) * Math.min(1, 6 * dt);
      this.wheel.held = true;
      this.wheel.target = this._keySteer;
    } else if (this._wheelTouch === null && this._keySteer !== 0) {
      this._keySteer = 0;
      this.wheel.held = false;
    }

    const rate = this._hbHeld ? dt / HB_ON : -dt / HB_OFF;
    this.handbrake = Math.max(0, Math.min(1, this.handbrake + rate));
  }
}
