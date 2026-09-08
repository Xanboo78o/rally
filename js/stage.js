// stage.js — ONE hand-authored stretch of gravel. Every corner below is placed by
// hand, in order, the way you'd write pace notes. Nothing here is generated: the
// builder just walks this list and lays road along it.
//
// turn  = degrees swept across the segment, negative is left
// rise  = metres climbed (or dropped) across the segment
// w     = road half-width in metres
// note  = what the co-driver calls, ~55m before you arrive

export const SEGMENTS = [
  { len: 130, turn:    0, rise:   0, w: 5.0, note: 'STAGE START — FLAT OUT' },
  { len: 110, turn:  -40, rise:   0, w: 4.5, note: 'LEFT 5, LONG' },
  { len:  70, turn:    0, rise:  -3, w: 4.5, note: 'STRAIGHT, 70' },
  { len:  55, turn:   28, rise:   0, w: 4.5, note: 'RIGHT 4' },
  { len:  45, turn:   42, rise:   0, w: 4.0, note: '...TIGHTENS' },
  { len:  60, turn:    0, rise:   2, w: 4.5, note: 'SHORT, 60' },
  { len:  55, turn: -125, rise:   0, w: 4.0, note: 'HAIRPIN LEFT 1 — HANDBRAKE' },
  { len:  90, turn:    0, rise:   9, w: 4.5, note: 'STRAIGHT, CLIMBING' },
  { len:  55, turn:   10, rise:  11, w: 4.5, note: 'RIGHT 6 OVER CREST' },
  { len:  45, turn:    0, rise: -17, w: 5.0, note: 'CAUTION — BIG JUMP' },
  { len:  85, turn:    0, rise:  -7, w: 5.0, note: 'LANDING, DON\'T CUT' },
  { len: 120, turn:   48, rise:   0, w: 4.5, note: 'RIGHT 4, LONG' },
  { len:  90, turn:  -46, rise:   0, w: 4.5, note: 'LEFT 4' },
  { len: 150, turn:    0, rise:   0, w: 5.0, note: 'FLAT TO FINISH' },
];

const STEP = 2.0;           // centreline sample spacing, metres
const VERGE = 13;           // how far the shaped ground extends past the road edge

export class Stage {
  constructor() {
    this.samples = [];
    this._build();
    this.length = this.samples[this.samples.length - 1].dist;
    this._hint = 0;
  }

  _build() {
    let x = 0, z = 0, y = 0, head = 0, dist = 0;
    this.samples.push({ x, z, y, w: SEGMENTS[0].w, head, dist, seg: 0 });

    SEGMENTS.forEach((seg, si) => {
      const n = Math.max(2, Math.round(seg.len / STEP));
      const dTurn = (seg.turn * Math.PI / 180) / n;
      const dRise = seg.rise / n;
      const dLen = seg.len / n;
      const prevW = si === 0 ? seg.w : SEGMENTS[si - 1].w;

      for (let i = 1; i <= n; i++) {
        head += dTurn;
        x += Math.sin(head) * dLen;
        z += Math.cos(head) * dLen;
        y += dRise;
        dist += dLen;
        // Ease the width across the seam so the road doesn't step.
        const t = i / n;
        const w = prevW + (seg.w - prevW) * Math.min(1, t * 2);
        this.samples.push({ x, z, y, w, head, dist, seg: si });
      }
    });
  }

  // Nearest centreline sample. Walks locally from the last hit, which is all we
  // need for one car, and falls back to a full scan if it loses the road.
  nearest(x, z) {
    const S = this.samples;
    const scan = (from, to) => {
      let bi = from, bd = Infinity;
      for (let i = from; i <= to; i++) {
        const dx = S[i].x - x, dz = S[i].z - z;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; bi = i; }
      }
      return { bi, bd };
    };
    let lo = Math.max(0, this._hint - 90), hi = Math.min(S.length - 1, this._hint + 90);
    let { bi, bd } = scan(lo, hi);
    if (bd > 60 * 60) ({ bi, bd } = scan(0, S.length - 1));
    this._hint = bi;
    return { i: bi, dist2: bd };
  }

  // What the car is standing on.
  sample(x, z) {
    const { i } = this.nearest(x, z);
    const s = this.samples[i];
    // Signed distance out from the centreline, so we know if we're off the road.
    const rx = Math.cos(s.head), rz = -Math.sin(s.head);
    const fx = Math.sin(s.head), fz = Math.cos(s.head);
    const lateral = (x - s.x) * rx + (z - s.z) * rz;

    // Interpolate height ALONG the road between samples. Without this the surface
    // is a staircase and the car launches off every 2m step — that showed up in
    // simcheck as ~70 phantom flights per run.
    const along = (x - s.x) * fx + (z - s.z) * fz;
    const j = along >= 0 ? Math.min(this.samples.length - 1, i + 1) : Math.max(0, i - 1);
    const n = this.samples[j];
    const t = Math.min(1, Math.abs(along) / STEP);
    const baseY = s.y + (n.y - s.y) * t;
    const w = s.w + (n.w - s.w) * t;
    const off = Math.abs(lateral) - w;

    // Gradient of the road in the direction of travel. It MUST be the gradient of
    // the same pair of samples the height was interpolated across — take it from the
    // sample ahead instead and the car launches before it reaches the crest, then
    // gets glued down while the ground is still rising under it.
    const slope = (along >= 0 ? (n.y - s.y) : (s.y - n.y)) / STEP;

    let height = baseY;
    if (off > 0) {
      // The verge falls away from the road edge, so going off drops you into it.
      height = baseY - Math.min(2.6, off * 0.30);
    }
    return {
      height,
      slope,
      onRoad: off <= 0.2,
      lateral,
      off,
      index: i,
      progress: s.dist,
      seg: s.seg,
      head: s.head,
    };
  }

  segStartDist(si) {
    for (const s of this.samples) if (s.seg === si) return s.dist;
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Mesh building. Colours are flat and cheap on purpose — this prototype is about
// how the wheel feels, not how it looks.
// ---------------------------------------------------------------------------

export function buildStageMesh(THREE, stage) {
  const group = new THREE.Group();
  const S = stage.samples;

  const road = { pos: [], idx: [] };
  const verge = { pos: [], idx: [] };

  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    const rx = Math.cos(s.head), rz = -Math.sin(s.head);

    road.pos.push(s.x - rx * s.w, s.y + 0.02, s.z - rz * s.w);
    road.pos.push(s.x + rx * s.w, s.y + 0.02, s.z + rz * s.w);

    const vw = s.w + VERGE;
    const drop = Math.min(2.6, VERGE * 0.30);
    verge.pos.push(s.x - rx * vw, s.y - drop, s.z - rz * vw);
    verge.pos.push(s.x + rx * vw, s.y - drop, s.z + rz * vw);

    if (i > 0) {
      const a = (i - 1) * 2, b = a + 1, c = i * 2, d = c + 1;
      road.idx.push(a, c, b, b, c, d);
      verge.idx.push(a, c, b, b, c, d);
    }
  }

  const mk = (data, color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
    g.setIndex(data.idx);
    g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
  };

  // Big ground plane underneath everything so there's never a hole in the world.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshLambertMaterial({ color: 0x4a5b39 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3.2;
  group.add(ground);

  group.add(mk(verge, 0x5c6b42));
  group.add(mk(road, 0x9a8b72));

  // ---- wheel ruts ----------------------------------------------------------
  // Two worn lines down the road. They stream past right under the camera, which is
  // most of what tells you you're ON something rather than gliding over it.
  // DASHED, not continuous. A solid line running the way you're travelling barely
  // appears to move — it's the worst motion cue there is. Broken into dashes it
  // streams past, which is most of what tells you how fast you're going.
  const rut = { pos: [], idx: [] };
  const RUT_OFF = 0.78, RUT_W = 0.19;
  let rq = 0;
  for (let i = 0; i + 3 < S.length; i += 5) {          // 6m dash, 4m gap
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const s = S[i + k];
        const rx = Math.cos(s.head), rz = -Math.sin(s.head);
        const c0 = RUT_OFF * side - RUT_W, c1 = RUT_OFF * side + RUT_W;
        rut.pos.push(s.x + rx * c0, s.y + 0.035, s.z + rz * c0);
        rut.pos.push(s.x + rx * c1, s.y + 0.035, s.z + rz * c1);
      }
      const b = rq * 6;
      rut.idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      rut.idx.push(b + 2, b + 4, b + 3, b + 3, b + 4, b + 5);
      rq++;
    }
  }
  group.add(mk(rut, 0x7a6a53));

  // ---- edge posts, so you can read the road ahead in first person ----------
  const postGeo = new THREE.BoxGeometry(0.22, 1.15, 0.22);
  const postMat = new THREE.MeshLambertMaterial({ color: 0xdedad2 });
  const posts = new THREE.InstancedMesh(postGeo, postMat, Math.ceil(S.length / 4) * 2 + 8);
  const m = new THREE.Matrix4();
  let pi = 0;
  for (let i = 0; i < S.length; i += 4) {
    const s = S[i];
    const rx = Math.cos(s.head), rz = -Math.sin(s.head);
    for (const side of [-1, 1]) {
      m.makeTranslation(s.x + rx * (s.w + 0.7) * side, s.y + 0.55, s.z + rz * (s.w + 0.7) * side);
      posts.setMatrixAt(pi++, m);
    }
  }
  posts.count = pi;
  group.add(posts);

  // ---- trees, spaced along the road so the verge reads as scenery ----------
  // Deterministic offsets: the road is the level, these just dress it.
  const treeGeo = new THREE.ConeGeometry(2.4, 8.5, 6);
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x2f4327 });
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, Math.ceil(S.length / 5) * 2 + 8);
  let ti = 0;
  for (let i = 4; i < S.length; i += 5) {
    const s = S[i];
    const rx = Math.cos(s.head), rz = -Math.sin(s.head);
    for (const side of [-1, 1]) {
      const jitter = ((i * 37 + (side > 0 ? 11 : 0)) % 17) * 0.9;
      const d = s.w + 15 + jitter;
      m.makeTranslation(s.x + rx * d * side, s.y - 2.0, s.z + rz * d * side);
      trees.setMatrixAt(ti++, m);
    }
  }
  trees.count = ti;
  group.add(trees);

  // ---- SPEED: things that pass CLOSE to the camera --------------------------
  // Perceived speed is optical flow, and flow is dominated by whatever is nearest.
  // Distant trees barely move; grass a metre off your wheel screams past. This is the
  // single biggest lever on how fast the game feels, and there was nothing here.
  const tuftGeo = new THREE.ConeGeometry(0.30, 0.85, 4);
  const tuftMat = new THREE.MeshLambertMaterial({ color: 0x5f7040 });
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, S.length * 6 + 16);
  let ti2 = 0;
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    const rx = Math.cos(s.head), rz = -Math.sin(s.head);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const j = (i * 31 + k * 17 + (side > 0 ? 13 : 0)) % 19;
        const d = s.w + 0.35 + k * 0.75 + j * 0.09;
        m.makeTranslation(s.x + rx * d * side, s.y - 0.12 - (j % 4) * 0.03, s.z + rz * d * side);
        tufts.setMatrixAt(ti2++, m);
      }
    }
  }
  tufts.count = ti2;
  group.add(tufts);

  // ---- surface scars ACROSS the road ---------------------------------------
  // The ruts run parallel to travel, so they hardly stream at all. Transverse marks
  // rush toward you and past, which is what actually reads as ground speed.
  const scar = { pos: [], idx: [] };
  let sc = 0;
  for (let i = 4; i < S.length - 3; i += 3) {
    const j = (i * 41) % 23;
    const s0 = S[i], s1 = S[i + 1 + (j % 2)];
    const r0x = Math.cos(s0.head), r0z = -Math.sin(s0.head);
    const r1x = Math.cos(s1.head), r1z = -Math.sin(s1.head);
    const c = ((j % 11) - 5) * 0.42;              // wander across the road
    const half = 0.9 + (j % 5) * 0.45;
    scar.pos.push(s0.x + r0x * (c - half), s0.y + 0.045, s0.z + r0z * (c - half));
    scar.pos.push(s0.x + r0x * (c + half), s0.y + 0.045, s0.z + r0z * (c + half));
    scar.pos.push(s1.x + r1x * (c - half), s1.y + 0.045, s1.z + r1z * (c - half));
    scar.pos.push(s1.x + r1x * (c + half), s1.y + 0.045, s1.z + r1z * (c + half));
    const b = sc * 4;
    scar.idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    sc++;
  }
  group.add(mk(scar, 0x6f6049));

  // ---- stones along the verge, for close-range motion cues -----------------
  const stoneGeo = new THREE.DodecahedronGeometry(0.20, 0);
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x8c8377 });
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, S.length * 2 + 8);
  let si2 = 0;
  for (let i = 1; i < S.length; i += 1) {
    const s = S[i];
    const rx = Math.cos(s.head), rz = -Math.sin(s.head);
    for (const side of [-1, 1]) {
      const j = (i * 53 + (side > 0 ? 29 : 7)) % 23;
      const d = s.w + 0.25 + j * 0.11;
      m.makeTranslation(s.x + rx * d * side, s.y - 0.05 - (j % 3) * 0.02, s.z + rz * d * side);
      stones.setMatrixAt(si2++, m);
    }
  }
  stones.count = si2;
  group.add(stones);

  // ---- finish gate ---------------------------------------------------------
  const last = S[S.length - 1];
  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(last.w * 2.4, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xd8433a })
  );
  gate.position.set(last.x, last.y + 3.2, last.z);
  gate.rotation.y = -last.head;
  group.add(gate);

  return group;
}
