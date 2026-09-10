// cockpit.js — only the BONNET lives in 3D.
//
// The dashboard, A-pillars and steering wheel are a DOM overlay (see #cockpit in
// index.html): a real onboard camera is bolted to the car, so the interior is static
// and only the world moves behind it. The bonnet stays in 3D so it takes real light,
// occludes the road properly, and swings correctly when you tilt to look around.

export const VISUAL_LOCK = Math.PI * 2;   // rim rotation at full lock: one turn each way

// How far in front of the eye the bonnet's NEAR edge sits. That edge is the seam — the
// one line where the 3D bonnet and the DOM interior actually meet — so anything that
// moves the interior has to move the bonnet by the same number of PIXELS there, and
// this is the distance that conversion is done at. Exported so the number can't drift
// away from the geometry below.
export const SEAM_Z = 1.15;

// Deterministic so the muck is in the same place every run rather than crawling
// about between frames.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// PLACEHOLDER ART. Generated muck so the bonnet isn't a clean slab — swap for a drawn
// texture whenever Adam wants to paint one, the mesh and UVs won't change.
function dirtTexture(THREE) {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const r = rng(20260908);

  c.fillStyle = '#3f444c';
  c.fillRect(0, 0, S, S);

  // Broad grime, heaviest at the back of the bonnet where it collects.
  for (let i = 0; i < 240; i++) {
    const x = r() * S, y = r() * S;
    const bias = 0.35 + 0.65 * (1 - y / S);
    if (r() > bias) continue;
    c.fillStyle = 'rgba(74,63,45,' + (0.05 + r() * 0.16).toFixed(3) + ')';
    c.beginPath();
    c.ellipse(x, y, 6 + r() * 30, 5 + r() * 22, r() * 3.14, 0, 6.283);
    c.fill();
  }

  // Thrown specks and streaks off the road.
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S;
    c.fillStyle = 'rgba(58,48,33,' + (0.10 + r() * 0.45).toFixed(3) + ')';
    const w = 0.6 + r() * 2.6;
    c.beginPath();
    c.ellipse(x, y, w, w * (0.7 + r() * 2.4), r() * 0.6, 0, 6.283);
    c.fill();
  }
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S, len = 8 + r() * 46;
    c.strokeStyle = 'rgba(52,43,30,' + (0.07 + r() * 0.20).toFixed(3) + ')';
    c.lineWidth = 0.8 + r() * 2.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (r() - 0.5) * 12, y + len);
    c.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function buildCockpit(THREE) {
  const g = new THREE.Group();

  // A tapering slab rather than a box: wide at the windscreen and narrowing to the
  // nose, which is what a bonnet actually looks like from the driver's seat. The near
  // edge is deliberately far wider than the car so it always reaches both screen
  // edges, even at the widest speed-FOV.
  // Kept SHALLOW on purpose. At 4.6m long it filled a fifth of the screen and, with
  // the dash, left barely any road visible — and road is where the speed comes from.
  const NEAR_Z = -SEAM_Z, FAR_Z = -2.70;
  const NEAR_W = 3.40, FAR_W = 1.00;
  // Well below the eye line. At -0.26 it sat almost level with your eyes and read as a
  // band floating across the middle of the screen instead of the front of your car.
  const NEAR_Y = -0.55, FAR_Y = -0.77;

  const pos = new Float32Array([
    -NEAR_W, NEAR_Y, NEAR_Z,   NEAR_W, NEAR_Y, NEAR_Z,
    -FAR_W,  FAR_Y,  FAR_Z,    FAR_W,  FAR_Y,  FAR_Z,
  ]);
  const uv = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex([0, 1, 2, 1, 3, 2]);   // wound so the normal points UP, or it culls
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ map: dirtTexture(THREE), color: 0xffffff });
  const hood = new THREE.Mesh(geo, mat);
  g.add(hood);

  // A lip at the nose so the front edge reads against the road.
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(FAR_W * 2, 0.10, 0.14),
    new THREE.MeshLambertMaterial({ color: 0x2f343b })
  );
  lip.position.set(0, FAR_Y - 0.04, FAR_Z);
  g.add(lip);

  return { group: g, hood, lip, mat };
}

// ---------------------------------------------------------------------------
// CRUMPLE.
//
// Adam: "if i fly into a wall on this my hood just, [-----] to [-]."
//
// Which is exactly the right shape for it, and the constraint makes itself: the
// bonnet's NEAR edge is the seam — the one line where the 3D bonnet and the DOM
// interior touch — so it must not move, ever, or the join opens. So the crumple pulls
// the NOSE back toward the seam and leaves the bulkhead where it is. Which is also what
// actually happens to a car: the front folds, the scuttle doesn't.
//
// Three things happen at once, and the second is the one that sells it:
//   the nose comes BACK,
//   the fold buckles UP into your eyeline, so you are looking at a bent bonnet,
//   and the nose narrows as it's crushed in.
// `bias` is where you hit it: -1 hard on the left, +1 hard on the right, and that side
// folds further. A perfectly symmetrical crumple reads as a scale, not as an accident.
// The nose's rest position — must match buildCockpit above.
const FAR_Z0 = -2.70, FAR_W0 = 1.00, FAR_Y0 = -0.77;

// These two are PROJECTED, not guessed. At the game's 58-degree FOV the clean nose
// (-0.77m at 2.70m) sits about 16 degrees below the eye line, which on a phone is a few
// pixels above the top of the dashboard — so the bonnet you can actually SEE is a thin
// strip, and the first attempt at this crushed the nose 1.18m and made it disappear
// behind the dash entirely. Which is the opposite of the point.
//
// So the fold matters far more than the shortening. Bringing the nose to -0.29m at 2.00m
// puts it 8 degrees below the eye line — roughly fifty pixels of bent metal standing up
// where there was a sliver — and it costs you road, which is exactly what wrecking the
// front of your car should do.
const CRUSH_Z = 0.70;     // metres of bonnet the nose loses: 1.55m long becomes 0.85m
const BUCKLE_Y = 0.48;    // and it stands up into the windscreen

export function crumple(hood, lip, amount, bias = 0) {
  const a = Math.max(0, Math.min(1, amount));
  const p = hood.geometry.attributes.position;

  // Each front corner gets its own amount, so an off-centre hit folds one wing.
  const side = s => Math.max(0, Math.min(1, a * (1 + 0.55 * s * bias)));

  for (const [idx, s] of [[2, -1], [3, 1]]) {
    const k = side(s);
    const z = FAR_Z0 + CRUSH_Z * k;
    // Not squared. Squaring meant a half-crumpled car looked untouched, and half is
    // what a 45-degree clip at ninety actually costs you.
    const y = FAR_Y0 + BUCKLE_Y * k * (0.45 + 0.55 * k);
    const x = (FAR_W0 - 0.22 * k) * s;
    p.setXYZ(idx, x, y, z);
  }
  p.needsUpdate = true;
  hood.geometry.computeVertexNormals();
  hood.geometry.computeBoundingSphere();

  // The lip rides the middle of the new front edge.
  const kl = side(-1), kr = side(1);
  const k = (kl + kr) * 0.5;
  lip.position.set(0, FAR_Y0 + BUCKLE_Y * k * (0.45 + 0.55 * k) - 0.04, FAR_Z0 + CRUSH_Z * k);
  lip.rotation.z = (kl - kr) * 0.5;          // and tips with the fold
  lip.scale.x = 1 - 0.22 * k;
}

// Put it back. A new run is a new car.
export function uncrumple(hood, lip) { crumple(hood, lip, 0, 0); }
