// cockpit.js — only the BONNET lives in 3D.
//
// The dashboard, A-pillars and steering wheel are a DOM overlay (see #cockpit in
// index.html): a real onboard camera is bolted to the car, so the interior is static
// and only the world moves behind it. The bonnet stays in 3D so it takes real light,
// occludes the road properly, and swings correctly when you tilt to look around.

export const VISUAL_LOCK = Math.PI * 2;   // rim rotation at full lock: one turn each way

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
  const NEAR_Z = -1.15, FAR_Z = -2.70;
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

  return { group: g, hood, mat };
}
