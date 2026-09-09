// terrain.js — THE LAND, which now comes first.
//
// Up to here the road made the ground: stage.js integrated a list of turns into a
// centreline and groundProfile() extruded a hillside sideways off it. There was no
// terrain, which is why the skirt folds through itself in tight corners and has to be
// narrowed by hand. This inverts it. The land exists on its own, and a road gets drawn
// ON it — which is how a rally road happens in the first place. Nobody designs a stage
// in the air; they find a road across a mountain.
//
// The land is a SEED and a handful of numbers, baked once into a height grid. A whole
// world is therefore about forty bytes, which matters when the plan is to send one to a
// group chat every morning.
//
// Everything here is plain arithmetic — no THREE — so the node harness can measure a
// world without a browser.

// ---------------------------------------------------------------------------
// noise
//
// Gradient noise, not value noise: value noise puts its extremes on the lattice, so a
// landscape made of it has hills at regular intervals and you can see the grid from the
// air. Gradient noise puts zeroes on the lattice instead, which is invisible.
// ---------------------------------------------------------------------------

const F = 0x27d4eb2d;

function hash(x, y, seed) {
  let h = (x * 0x8da6b343 + y * 0xd8163841 + seed * 0xcb1ab31f) | 0;
  h = Math.imul(h ^ (h >>> 15), F);
  h = Math.imul(h ^ (h >>> 13), F);
  return (h ^ (h >>> 16)) >>> 0;
}

// Eight directions, picked by the hash. Eight rather than a continuous angle because a
// table lookup is a lot cheaper than a sin/cos per lattice corner, and there are four
// corners per sample, six octaves per sample, a million samples per world.
const DIRS = [];
for (let i = 0; i < 8; i++) DIRS.push([Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);

function perlin(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  // Quintic, not cubic. Cubic smoothstep has a discontinuous second derivative at the
  // lattice, which shows up as faint creases running along the grid once you light it.
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  let n = 0;
  for (let cy = 0; cy < 2; cy++) {
    for (let cx = 0; cx < 2; cx++) {
      const g = DIRS[hash(ix + cx, iy + cy, seed) & 7];
      const dx = fx - cx, dy = fy - cy;
      const w = (cx ? u : 1 - u) * (cy ? v : 1 - v);
      n += w * (g[0] * dx + g[1] * dy);
    }
  }
  return n * 1.4;      // roughly into -1..1
}

function fbm(x, y, seed, oct, lac, gain) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    sum += amp * perlin(x * f, y * f, seed + i * 977);
    norm += amp;
    amp *= gain;
    f *= lac;
  }
  return sum / norm;
}

// Ridges: fold the noise at zero and turn it inside out. This is what makes a young
// mountain — sharp crests, smooth valleys — instead of the beanbag shape plain fbm has.
function ridge(x, y, seed, oct, lac, gain) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(perlin(x * f, y * f, seed + i * 613));
    sum += amp * n * n;
    norm += amp;
    amp *= gain;
    f *= lac;
  }
  return sum / norm * 2 - 1;
}

// ---------------------------------------------------------------------------
// the world
//
// FORMS are what the ground DOES — the shape of the land, before anything about what
// it's made of. A material picks one (see js/materials.js) and the tags on the material
// push the numbers around, so two granite worlds are related without being the same.
// ---------------------------------------------------------------------------

export const FORMS = {
  // Beanbag hills. The default, and the only one that's kind to a road.
  rolling: (t, x, y) => fbm(x, y, t.seed, t.oct, 2.0, 0.5),

  // Young mountains: sharp crests, smooth valleys. A road here has to find a pass.
  ridged: (t, x, y) => ridge(x, y, t.seed, t.oct, 2.05, 0.5),

  // Flat tops and cliffs between them. Quantising the height is the whole trick; the
  // smoothstep on the remainder is what stops the cliff being one-sample vertical,
  // which reads as a rendering error rather than as a cliff.
  mesa: (t, x, y) => {
    const n = (fbm(x, y, t.seed, t.oct, 2.0, 0.52) + 1) * 0.5;
    const steps = 5, s = n * steps, i = Math.floor(s);
    let f = s - i;
    f = f < 0.72 ? 0 : (f - 0.72) / 0.28;
    return ((i + f * f * (3 - 2 * f)) / steps) * 2 - 1;
  },

  // Cut terraces, the way a hillside gets farmed. Softer than mesa and much more
  // interesting to drive across, because the flat treads are the only line there is.
  terraced: (t, x, y) => {
    const n = fbm(x, y, t.seed, t.oct, 2.0, 0.5);
    const steps = 11;
    const q = Math.round(n * steps) / steps;
    return q * 0.78 + n * 0.22;
  },

  // Wind. Stretched hard along one axis and smooth across it, so it comes in lines you
  // can run along or have to cross, which is the only interesting thing about a dune.
  dunes: (t, x, y) => {
    const a = t.grain;
    const u = x * Math.cos(a) - y * Math.sin(a), v = x * Math.sin(a) + y * Math.cos(a);
    return fbm(u * 0.35, v * 2.6, t.seed, Math.min(4, t.oct), 2.0, 0.42) * 0.8
         + fbm(x, y, t.seed + 51, 2, 2.0, 0.5) * 0.2;
  },

  // Dead ground. Big shallow bowls punched into a nearly flat plain.
  cratered: (t, x, y) => {
    const base = fbm(x, y, t.seed, 3, 2.0, 0.5) * 0.35;
    let d = 0;
    for (let o = 0; o < 3; o++) {
      const f = 1 + o * 1.7;
      const n = perlin(x * f * 1.4 + o * 31, y * f * 1.4, t.seed + 300 + o);
      // Only the peaks of the noise become craters, so they're discrete holes with
      // clean rims rather than a general lumpiness.
      if (n > 0.34) { const k = (n - 0.34) / 0.66; d -= k * k * (0.9 / f); }
    }
    return base + d;
  },

  // Salt, playa, ash flat. Almost nothing, and that IS the feature: the only place in
  // the game where you can see a whole stage laid out in front of you.
  flats: (t, x, y) => fbm(x, y, t.seed, 3, 2.2, 0.35) * 0.22
                    + Math.abs(perlin(x * 5.5, y * 5.5, t.seed + 9)) * -0.06,
};

export class Terrain {
  // size   metres across the plot, square
  // step   metres per grid cell — the resolution the land is baked at
  // scale  metres per major feature
  // relief peak-to-trough height in metres
  // warp   how far the domain is pushed around before it's sampled
  constructor(o = {}) {
    this.seed = (o.seed ?? 1) | 0;
    this.size = o.size ?? 4096;
    this.step = o.step ?? 4;
    this.form = o.form || 'rolling';
    this.scale = o.scale ?? 900;
    this.relief = o.relief ?? 260;
    this.oct = o.oct ?? 6;
    this.warp = o.warp ?? 0.35;
    this.grain = o.grain ?? 0.7;
    this.n = Math.round(this.size / this.step) + 1;
    this.h = null;
    this.min = 0; this.max = 0;
  }

  // The shape at a point, before it's baked. -1..1.
  _raw(x, z) {
    const s = 1 / this.scale;
    let u = x * s, v = z * s;
    if (this.warp > 0) {
      // Domain warp: sample the noise at a position that the noise itself moved. This
      // is the single biggest difference between "procedural terrain" and something
      // that looks like it was carved by water — it bends the ridgelines.
      const wx = perlin(u * 0.55 + 11.3, v * 0.55, this.seed + 7001);
      const wz = perlin(u * 0.55, v * 0.55 + 5.1, this.seed + 7002);
      u += wx * this.warp; v += wz * this.warp;
    }
    return (FORMS[this.form] || FORMS.rolling)(this, u, v);
  }

  // Bake the grid. Yields every `chunkRows` rows so a page can show progress instead of
  // locking up for a second and a half with nothing on screen.
  *bake(chunkRows = 64) {
    const n = this.n;
    this.h = new Float32Array(n * n);
    const half = this.size / 2;
    let min = Infinity, max = -Infinity;
    for (let j = 0; j < n; j++) {
      const z = -half + j * this.step;
      for (let i = 0; i < n; i++) {
        const y = this._raw(-half + i * this.step, z) * this.relief * 0.5;
        this.h[j * n + i] = y;
        if (y < min) min = y;
        if (y > max) max = y;
      }
      if (j % chunkRows === 0) yield j / n;
    }
    this.min = min; this.max = max;
    return 1;
  }

  bakeAll() { const it = this.bake(1e9); while (!it.next().done); return this; }

  // Height anywhere, bilinear off the grid. Outside the plot it clamps, so a car that
  // drives off the edge runs out onto a flat rather than falling through the world.
  height(x, z) {
    const n = this.n, half = this.size / 2;
    let gx = (x + half) / this.step, gz = (z + half) / this.step;
    gx = Math.max(0, Math.min(n - 1.001, gx));
    gz = Math.max(0, Math.min(n - 1.001, gz));
    const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j;
    const h = this.h, r0 = j * n + i, r1 = r0 + n;
    const a = h[r0] + (h[r0 + 1] - h[r0]) * fx;
    const b = h[r1] + (h[r1 + 1] - h[r1]) * fx;
    return a + (b - a) * fz;
  }

  // Downhill slope in the direction the car is pointing, which is what car.js wants,
  // plus the full normal for lighting and for deciding what will grow on a face.
  normal(x, z, d = this.step) {
    const hx = this.height(x + d, z) - this.height(x - d, z);
    const hz = this.height(x, z + d) - this.height(x, z - d);
    const nx = -hx, nz = -hz, ny = 2 * d;
    const l = Math.hypot(nx, ny, nz);
    return [nx / l, ny / l, nz / l];
  }

  slopeAlong(x, z, head, d = 3) {
    const fx = Math.sin(head), fz = Math.cos(head);
    return (this.height(x + fx * d, z + fz * d) - this.height(x - fx * d, z - fz * d)) / (2 * d);
  }

  // Steepness in degrees — the number that decides whether a road can go here at all.
  grade(x, z, d = 8) {
    const nrm = this.normal(x, z, d);
    return Math.acos(Math.max(-1, Math.min(1, nrm[1]))) * 180 / Math.PI;
  }
}
