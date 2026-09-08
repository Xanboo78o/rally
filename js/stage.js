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

  // ---- edge posts, so you can read the road ahead in first person ----------
  const postGeo = new THREE.BoxGeometry(0.22, 1.15, 0.22);
  const postMat = new THREE.MeshLambertMaterial({ color: 0xdedad2 });
  const posts = new THREE.InstancedMesh(postGeo, postMat, Math.ceil(S.length / 6) * 2 + 8);
  const m = new THREE.Matrix4();
  let pi = 0;
  for (let i = 0; i < S.length; i += 6) {
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
