// glass.js — the windscreen as its own layer.
//
// Rally windscreens are filthy. Dust comes off the road and builds up, more of it when
// you drop a wheel off, and the wipers aren't yours to use. Droplets are here too, ready
// for the weather modifier in the daily roll — addDrops() is the hook.

const MAX_SPECKS = 150;
const MAX_DROPS = 90;
const MAX_CHIPS = 12;

export class Glass {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.specks = [];
    this.drops = [];
    this.speed = 0;

    // Sticks and stones. Off the road your own front wheels pick things up and throw
    // them at you, which is the single loudest way the game can tell you that you are
    // not on the road any more — louder than any HUD colour could be.
    this.flyers = [];
    this.chips = [];
    // main.js hangs a function here to nudge the camera and make a noise. The glass
    // knows something hit it; it does not know what a camera is.
    this.onHit = null;

    // Motion streaks. Fixed angles, but each one crawls outward from the centre, so at
    // speed the periphery genuinely flows past you. Only shows up once you're moving
    // quickly, so it never makes a slow section look silly.
    this.streaks = [];
    for (let i = 0; i < 54; i++) {
      this.streaks.push({ a: (i / 54) * 6.283 + (i % 7) * 0.09, p: (i * 37 % 100) / 100, s: 0.6 + (i % 5) * 0.22 });
    }
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    this.w = innerWidth; this.h = innerHeight;
    this.cv.width = this.w * dpr;
    this.cv.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Grit thrown up off the surface. Lands mostly low and toward the edges, the way it
  // actually collects, rather than evenly over the glass.
  addDust(n) {
    for (let i = 0; i < n && this.specks.length < MAX_SPECKS; i++) {
      const edge = Math.random() < 0.6;
      this.specks.push({
        x: edge ? (Math.random() < 0.5 ? Math.random() * 0.22 : 0.78 + Math.random() * 0.22) * this.w
                : Math.random() * this.w,
        y: (0.25 + Math.random() * 0.75) * this.h,
        r: 0.7 + Math.random() * 2.4,
        a: 0.10 + Math.random() * 0.28,
      });
    }
  }

  // Not wired to anything yet — this is the hook for a wet daily.
  addDrops(n) {
    for (let i = 0; i < n && this.drops.length < MAX_DROPS; i++) {
      this.drops.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h * 0.8,
        r: 1.6 + Math.random() * 3.4,
        v: 8 + Math.random() * 26,
      });
    }
  }

  // One thing thrown up off the surface, coming at the screen. It starts under the
  // bottom edge because that is where it comes from — up past the bonnet — and grows
  // as it arrives, which is the whole trick: nothing here is 3D.
  addFlyer(hard) {
    if (this.flyers.length > 6) return;
    const stick = Math.random() < 0.42;
    this.flyers.push({
      stick,
      t: 0,
      dur: 0.16 + Math.random() * 0.16,
      x0: (0.18 + Math.random() * 0.64) * this.w,
      y0: this.h * (1.02 + Math.random() * 0.1),
      x1: (0.10 + Math.random() * 0.80) * this.w,
      y1: (0.18 + Math.random() * 0.62) * this.h,
      r: stick ? 11 + Math.random() * 13 : 3 + Math.random() * 4.5,
      spin: (Math.random() - 0.5) * 26,
      rot: Math.random() * 6.28,
      hard,
    });
  }

  // What it leaves behind. A chip never comes off, the same way the muck on the bonnet
  // never does — by the end of a bad stage you are looking through your own history.
  addChip(x, y, r) {
    this.chips.push({ x, y, r, a: 0.34 + Math.random() * 0.22, n: 3 + (Math.random() * 3 | 0) });
    if (this.chips.length > MAX_CHIPS) this.chips.shift();
  }

  clear() {
    this.specks.length = 0; this.drops.length = 0;
    this.flyers.length = 0; this.chips.length = 0;
  }

  // `slide` is 0..1, how sideways the car is. A slide throws grit at the glass even on
  // the road, which is what makes a drift feel like it costs something.
  update(dt, speedFactor, onRoad, slide = 0) {
    // Dust builds with speed, much faster once you're off the road, and faster again
    // when the wheels are pointing somewhere the car isn't going.
    const rate = speedFactor * (onRoad ? 1.6 : 16) * (1 + slide * 2.2);
    if (Math.random() < rate * dt) this.addDust(onRoad ? 1 : 3);

    // Sticks and rocks only off the road, and only once you're carrying enough speed to
    // actually flick something up.
    if (!onRoad && speedFactor > 0.18) {
      if (Math.random() < (0.25 + speedFactor * 1.35) * dt) this.addFlyer(speedFactor);
    }

    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += dt / f.dur;
      f.rot += f.spin * dt;
      if (f.t < 1) continue;
      this.flyers.splice(i, 1);
      const hard = f.hard * (f.stick ? 0.7 : 1);
      this.addChip(f.x1, f.y1, f.r);
      // a little burst of grit around the strike
      for (let k = 0; k < 5; k++) {
        this.specks.push({
          x: f.x1 + (Math.random() - 0.5) * f.r * 6,
          y: f.y1 + (Math.random() - 0.5) * f.r * 6,
          r: 0.6 + Math.random() * 1.8, a: 0.12 + Math.random() * 0.22,
        });
      }
      if (this.specks.length > MAX_SPECKS) this.specks.splice(0, this.specks.length - MAX_SPECKS);
      this.onHit?.(hard, f.stick);
    }

    for (const st of this.streaks) {
      st.p += dt * (0.35 + speedFactor * 2.4) * st.s;
      if (st.p > 1) st.p -= 1;
    }

    // Airflow drags droplets up and sideways at speed, not straight down.
    for (const d of this.drops) {
      d.y += (d.v - speedFactor * 42) * dt;
      if (d.y < -10 || d.y > this.h + 10) { d.y = Math.random() * this.h * 0.5; d.x = Math.random() * this.w; }
    }
  }

  draw() {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);

    // ---- speed streaks -----------------------------------------------------
    const sf = this.speed;
    if (sf > 0.45) {
      const k = (sf - 0.45) / 0.55;
      const cx = this.w * 0.5, cy = this.h * 0.52;
      const rMin = Math.min(this.w, this.h) * 0.30, rMax = Math.hypot(this.w, this.h) * 0.62;
      c.lineCap = 'round';
      for (const st of this.streaks) {
        const r = rMin + st.p * (rMax - rMin);
        const len = (26 + 130 * k) * st.s;
        const ca = Math.cos(st.a), sa = Math.sin(st.a);
        // fade in as it leaves the centre and out again at the edge
        const fade = Math.sin(Math.min(1, st.p) * Math.PI);
        c.strokeStyle = 'rgba(255,255,255,' + (0.11 * k * fade).toFixed(3) + ')';
        c.lineWidth = 1 + 2.2 * k * st.s;
        c.beginPath();
        c.moveTo(cx + ca * r, cy + sa * r);
        c.lineTo(cx + ca * (r + len), cy + sa * (r + len));
        c.stroke();
      }
    }

    for (const s of this.specks) {
      c.fillStyle = 'rgba(126,110,88,' + s.a + ')';
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.284); c.fill();
    }

    // ---- chips left by everything that has already hit ---------------------
    for (const ch of this.chips) {
      c.save();
      c.translate(ch.x, ch.y);
      c.strokeStyle = 'rgba(255,255,255,' + (ch.a * 0.5).toFixed(3) + ')';
      c.lineWidth = 1;
      for (let k = 0; k < ch.n; k++) {
        const a = (k / ch.n) * 6.283 + ch.r;
        const len = ch.r * (0.9 + (k % 3) * 0.5);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,' + (ch.a * 0.4).toFixed(3) + ')';
      c.beginPath(); c.arc(0, 0, Math.max(1, ch.r * 0.32), 0, 6.284); c.fill();
      c.restore();
    }

    // ---- whatever is currently in the air, on its way to the glass ---------
    for (const f of this.flyers) {
      // ease-in: it's closing on you, so it covers more of the screen per frame the
      // nearer it gets. Linear reads as floating.
      const e = f.t * f.t;
      const x = f.x0 + (f.x1 - f.x0) * e;
      const y = f.y0 + (f.y1 - f.y0) * e;
      const k = 0.22 + e * 0.78;
      c.save();
      c.translate(x, y);
      c.rotate(f.rot);
      c.fillStyle = f.stick ? 'rgba(48,38,26,0.92)' : 'rgba(38,36,33,0.94)';
      if (f.stick) {
        const L = f.r * k, t = Math.max(1, f.r * k * 0.17);
        c.beginPath(); c.roundRect(-L, -t, L * 2, t * 2, t); c.fill();
      } else {
        const R = f.r * k;
        c.beginPath();
        for (let v = 0; v < 6; v++) {
          const a = (v / 6) * 6.283;
          const rr = R * (0.72 + ((v * 7) % 5) * 0.11);
          v ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        c.closePath(); c.fill();
      }
      c.restore();
    }

    for (const d of this.drops) {
      c.fillStyle = 'rgba(210,225,235,0.22)';
      c.beginPath(); c.ellipse(d.x, d.y, d.r * 0.75, d.r, 0, 0, 6.284); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.28)';
      c.beginPath(); c.arc(d.x - d.r * 0.25, d.y - d.r * 0.3, d.r * 0.24, 0, 6.284); c.fill();
    }
  }
}
