// glass.js — the windscreen as its own layer.
//
// Rally windscreens are filthy. Dust comes off the road and builds up, more of it when
// you drop a wheel off, and the wipers aren't yours to use. Droplets are here too, ready
// for the weather modifier in the daily roll — addDrops() is the hook.

const MAX_SPECKS = 150;
const MAX_DROPS = 90;

export class Glass {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.specks = [];
    this.drops = [];
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

  clear() { this.specks.length = 0; this.drops.length = 0; }

  update(dt, speedFactor, onRoad) {
    // Dust builds with speed, much faster once you're off the road.
    const rate = speedFactor * (onRoad ? 1.6 : 16);
    if (Math.random() < rate * dt) this.addDust(onRoad ? 1 : 3);

    // Airflow drags droplets up and sideways at speed, not straight down.
    for (const d of this.drops) {
      d.y += (d.v - speedFactor * 42) * dt;
      if (d.y < -10 || d.y > this.h + 10) { d.y = Math.random() * this.h * 0.5; d.x = Math.random() * this.w; }
    }
  }

  draw() {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);

    for (const s of this.specks) {
      c.fillStyle = 'rgba(126,110,88,' + s.a + ')';
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.284); c.fill();
    }

    for (const d of this.drops) {
      c.fillStyle = 'rgba(210,225,235,0.22)';
      c.beginPath(); c.ellipse(d.x, d.y, d.r * 0.75, d.r, 0, 0, 6.284); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.28)';
      c.beginPath(); c.arc(d.x - d.r * 0.25, d.y - d.r * 0.3, d.r * 0.24, 0, 6.284); c.fill();
    }
  }
}
