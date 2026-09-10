// texture.js — the SLIGHT texture on everything.
//
// The ground is painted, not textured (DESIGN.md), and that rule doesn't move: colour
// still comes per vertex from what the land is doing. What was missing is SURFACE — a
// flat-coloured road reads as plastic, and the only detail on it was the ruts and scars,
// which are literal rectangles and look like it.
//
// So this makes a multiplier: a near-white tiling map that gets multiplied into the
// vertex colour a material already has. It never recolours anything, it only makes the
// light land unevenly, which is all a surface is.
//
// Three rules it's built to, because "slight but not grainy or uncanny" is a narrow gap:
//   1. LOW CONTRAST. About +/-6%. You should not be able to point at it.
//   2. NO RECOGNISABLE FEATURE. Four octaves on COPRIME lattices (3, 7, 17, 41), so the
//      pattern never lines up with itself and the eye can't find the tile.
//   3. MOSTLY LOW FREQUENCY. Broad mottle is what a real surface looks like at speed;
//      per-pixel fizz is what film grain looks like, and that's the uncanny one. The
//      fine speckle here is a tenth of the amplitude of the broad wash.

const sm = t => t * t * (3 - 2 * t);                    // smoothstep

// A wrapping lattice of random values. Wrapping is what makes the tile seamless.
function lattice(n, seed) {
  const a = new Float32Array(n * n);
  let s = (seed * 1013904223 + 1664525) | 0;
  for (let i = 0; i < a.length; i++) {
    s = (s * 1664525 + 1013904223) | 0;
    a[i] = ((s >>> 8) & 0xffff) / 0xffff;
  }
  return a;
}

// Value noise on that lattice, sampled in 0..1 and wrapping at the edges.
function vnoise(a, n, u, v) {
  const x = u * n, y = v * n;
  const i = Math.floor(x), j = Math.floor(y);
  const fx = sm(x - i), fy = sm(y - j);
  const i0 = ((i % n) + n) % n, j0 = ((j % n) + n) % n;
  const i1 = (i0 + 1) % n, j1 = (j0 + 1) % n;
  const p00 = a[j0 * n + i0], p10 = a[j0 * n + i1];
  const p01 = a[j1 * n + i0], p11 = a[j1 * n + i1];
  return (p00 + (p10 - p00) * fx) + ((p01 + (p11 - p01) * fx) - (p00 + (p10 - p00) * fx)) * fy;
}

// A greyscale tile centred just under white. `amount` scales the whole thing, so the
// look can be dialled from one place (main.js reads ?tex= for exactly that).
function greyTile(size, seed, octaves, speckle, amount) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const lats = octaves.map(([n], k) => lattice(n, seed + k * 97));

  let s = (seed * 22695477) | 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) | 0, ((s >>> 8) & 0xffff) / 0xffff);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let d = 0;
      for (let k = 0; k < octaves.length; k++) {
        d += (vnoise(lats[k], octaves[k][0], u, v) * 2 - 1) * octaves[k][1];
      }
      d += (rnd() * 2 - 1) * speckle;
      // 0.97 mean: the map darkens the world by about three percent, which is under the
      // threshold of noticing and saves having to re-grade everything that was tuned
      // before this existed.
      const g = Math.max(0, Math.min(1, 0.97 + d * amount)) * 255;
      const o = (y * size + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = g;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function wrap(THREE, cv, repeat, aniso) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;                    // three clamps this to what the device has
  // It's a multiplier, not a picture. Decoding it as sRGB would bend the curve and the
  // "slight" 3% mean turns into a visible darkening.
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// The ground, the road, the verge — everything you drive on and over. Metres per tile is
// set by the caller through the UV, so `repeat` here stays 1.
export function surfaceTexture(THREE, { seed = 11, amount = 1, aniso = 4 } = {}) {
  return wrap(THREE, greyTile(256, seed,
    [[3, 0.040], [7, 0.026], [17, 0.016], [41, 0.010]], 0.007, amount), 1, aniso);
}

// Things standing up: trees, posts, walls, stones. Their own UVs run 0..1 per face, so
// this one is a touch broader and softer — a tree does not want gravel on it.
export function propTexture(THREE, { seed = 29, amount = 1, aniso = 4 } = {}) {
  return wrap(THREE, greyTile(128, seed,
    [[3, 0.045], [7, 0.028], [13, 0.015]], 0.004, amount), 1, aniso);
}

// A soft round puff, for dust points. Not a texture of anything — just the falloff.
export function puffSprite(THREE, size = 64) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
