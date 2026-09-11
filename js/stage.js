import { trackSegments, DEFAULT_TRACK } from './tracks.js';

// stage.js — turning a list of segments into a road, the ground under it, and the
// things standing beside it.
//
// The segments themselves live in js/tracks.js now, as named SECTIONS that tracks are
// assembled from. Nothing here knows or cares which track it was handed: the builder
// walks whatever list it is given and lays road along it, and because the road is stored
// as a TURN SEQUENCE rather than as positions, any two sections join perfectly with no
// geometry to reconcile.
//
// The segment fields, for reference — the authoring notes are in js/tracks.js:
//
//   len   metres
//   turn  degrees swept. POSITIVE IS LEFT. This used to claim the opposite and nobody
//         checked it against the camera, so all 105 notes on the original stage called
//         the wrong way round until 2026-09-09. The camera is rotated by PI + yaw, which
//         puts world +X on the driver's LEFT (main.js says so where it pans the gravel),
//         and the road's lateral vector is the same (cos head, -sin head) — so
//         increasing head swings the road left. tools/trackcheck.mjs now proves it.
//   rise  metres climbed or dropped across the segment
//   w     road half-width in metres
//   sec   which PLACE you're in — the look and the sound come from js/atmos.js
//   note  what the co-driver calls, ~55m before you arrive
//   mark  hand-placed landmarks


const STEP = 2.0;           // centreline sample spacing, metres
const VERGE = 13;           // how far the shaped ground extends past the road edge
const SKIRT = 200;          // how far out the hillside can run before the valley floor
const MIN_SPAN = 5;         // ...and how little it may run to, inside a hairpin
const SOLID_CELL = 20;      // metres per bucket in the collision grid
const FLOOR_BELOW = 6;      // how far the valley floor sits under the lowest road

const EDGE_DROP = 2.6;      // how far the ground has fallen by the time the verge levels
const EDGE_SLOPE = 0.30;
const DROP_END = EDGE_DROP / EDGE_SLOPE;   // 8.67m out, where that fall stops

// How the hillside gets from the verge down to the valley floor, as
// [fraction of the way out, fraction of the drop taken]. Gentle first: a hillside that
// takes most of its drop immediately reads as the edge of a TABLE, which is exactly what
// "i can see where the terrain ends" was. Easing it out turns the same drop into ground
// receding into haze.
const SKIRT_KNOTS = [[0, 0], [0.30, 0.25], [0.65, 0.60], [1, 1]];

// ---------------------------------------------------------------------------
// BANK — which way the ground goes beside the road, per side, per segment.
//
// Until now it only ever went DOWN: every road in the game sat on top of a ridge with
// the land falling away on both sides, which is why THE DESCENT felt like one mistake
// away from over for two solid kilometres, and why the pines were trees standing on a
// crown rather than a road cut through a forest.
//
// A segment can now say `bank: [left, right]` in METRES. Negative falls away (the old
// behaviour, and still the default). Positive is a CUT — the land rises beside you, and
// keeps rising, so going off that side costs you speed instead of the run. Alternate
// them down a hill and the exposure swaps sides instead of being permanent.
//
// +lat is the driver's LEFT, so bank[0] is the left of the car.
//
// Raised ground is also the honest fix for "i cannot see the end of the baseplate":
// a hillside that keeps climbing has no horizon behind it to give the game away.
const BANK_DEFAULT = [-EDGE_DROP, -EDGE_DROP];

// ---------------------------------------------------------------------------
// CAMBER — the road surface itself tilting into the corner.
//
// Derived from the corner rather than authored, because a road banks into its bends by
// itself and having to write a number on all 105 of them is how the numbers end up
// wrong. A segment can still say `cam:` in degrees to override it, and a NEGATIVE one
// is off-camber, which is the most frightening thing in rally and the reason the
// override exists at all.
//
// Positive is banked for a LEFT-hander: the driver's left edge drops, the right lifts,
// and you lean into it. +lat is the driver's left, and turn > 0 is a left turn.
const CAM_K = 6.0;          // degrees of bank per degree-per-metre of corner
const CAM_MAX = 7.0;        // ...and the most any corner gets
const camFor = seg => (seg.cam !== undefined ? seg.cam
  : Math.max(-CAM_MAX, Math.min(CAM_MAX, (seg.turn / Math.max(1, seg.len)) * CAM_K)))
  * Math.PI / 180;

// Height of the road surface at a lateral offset, given the camber. Past the edge it
// stops tilting and hands the EDGE's height to the verge, so the two always meet.
export function camberAt(y, lateral, w, camT) {
  if (!camT) return y;
  return y - Math.sign(lateral) * Math.min(Math.abs(lateral), w) * camT;
}
const RISE_END = VERGE;     // metres out at which a cut has reached its full height
const RIDGE_MULT = 2.6;     // ...and how much taller again it is at the crest
const RIDGE_AT = 0.30;      // where that crest sits along the skirt — on a mesh vertex

// THE GROUND, in one function, used by both the physics in sample() and the mesh built
// below. It has to be one function: they were two, and they disagreed — the mesh drew a
// single flat plate 2.6m under everything while the road ribbon sat on top of nothing,
// so the road visibly hung 2.6m in the air for the whole stage.
//
// `lift` is this side's bank in metres: negative falls to the valley floor, positive
// climbs and never comes back down.
// Rolling variation in the hillsides. Three sines rather than a noise import, because
// this is called from the physics on every tick and from the mesh for every vertex, and
// it has to give the same answer to both forever. `phase` is distance along the stage,
// so it varies along the road as well as across it.
//
// It ramps in from ZERO at the road edge: the racing surface stays exactly as authored
// and only the ground beyond it gets its lumps, so this adds height variation without
// putting a single bump where it could be blamed for a lost time.
const VARY_FULL = 26;       // metres off the road at which it reaches full amplitude
function heightVariation(phase, off) {
  const k = Math.min(1, off / VARY_FULL);
  if (k <= 0) return 0;
  return k * k * (
    Math.sin(phase * 0.0071 + off * 0.019) * 3.4 +
    Math.sin(phase * 0.037 - off * 0.051) * 1.7 +
    Math.sin(phase * 0.11 + off * 0.07) * 0.8);
}

export function groundProfile(y, off, floorY, span = SKIRT, lift = -EDGE_DROP, phase = 0) {
  if (off <= 0) return y;                                  // on the road
  const vary = heightVariation(phase, off);

  if (lift > 0) {
    // A cut into the hillside. Steep at the road and easing as it goes, which is what
    // a bank actually looks like and also keeps the near vertices from stepping.
    if (off <= RISE_END) {
      const t = off / RISE_END;
      return y + lift * t * (2 - t);                       // ease-out to full height
    }
    // Then up to a RIDGE, and then back down to the valley floor — which is the bit
    // that was missing. A rising side used to climb and simply stop at the outer edge
    // of the mesh, leaving a wall of ground hanging over a flat plain: "i can see where
    // the baseplate starts and ends going into the pines". Now the far edge meets the
    // floor exactly where the plane is, so there is no seam to see, and the ridge sits
    // between you and the join.
    const t = Math.min(1, (off - RISE_END) / Math.max(1, span));
    const ridge = y + lift * RIDGE_MULT;
    // The crest lands ON a mesh vertex (the cross-section samples 0.30, 0.65 and 1.0 of
    // the span), so the ridge is a ridge rather than something the triangles cut off.
    if (t <= RIDGE_AT) {
      const u = t / RIDGE_AT;
      return y + (ridge - y) * (u * u * (3 - 2 * u)) + lift * (1 - u * u * (3 - 2 * u)) + vary;
    }
    const u = (t - RIDGE_AT) / (1 - RIDGE_AT);
    // Fades out as it reaches the floor, or the mesh stops meeting the plane and the
    // seam you could see comes straight back.
    return ridge + (floorY - ridge) * (u * u * (3 - 2 * u)) + vary * (1 - u);
  }

  const drop = -lift;
  const dropEnd = drop / EDGE_SLOPE;
  if (off <= dropEnd) return y - off * EDGE_SLOPE + vary;   // the verge falling away
  const edge = y - drop;
  if (off <= VERGE) return edge + vary;                     // the level shelf
  const total = edge - floorY;
  if (total <= 0) return edge;
  const t = Math.min(1, (off - VERGE) / Math.max(1, span));
  for (let i = 1; i < SKIRT_KNOTS.length; i++) {
    const [t0, f0] = SKIRT_KNOTS[i - 1], [t1, f1] = SKIRT_KNOTS[i];
    if (t <= t1) return edge - total * (f0 + (f1 - f0) * (t - t0) / (t1 - t0)) + vary * (1 - t);
  }
  return floorY;
}

export class Stage {
  // Hand it a segment list, or a track key, or nothing for the default track.
  constructor(track) {
    this.segments = Array.isArray(track) ? track : trackSegments(track || DEFAULT_TRACK);
    this.samples = [];
    this._build();
    this.length = this.samples[this.samples.length - 1].dist;
    this.sections = this._sections();
    let minY = Infinity;
    for (const s of this.samples) minY = Math.min(minY, s.y);
    this.floorY = minY - FLOOR_BELOW;
    this._spans();
    this._hint = 0;
    this._buildSolids();
  }

  _build() {
    let x = 0, z = 0, y = 0, head = 0, dist = 0;
    const b0 = this.segments[0].bank || BANK_DEFAULT;
    this.samples.push({ x, z, y, w: this.segments[0].w, head, dist, seg: 0,
                        bl: b0[0], br: b0[1], camT: Math.tan(camFor(this.segments[0])) });

    this.segments.forEach((seg, si) => {
      const n = Math.max(2, Math.round(seg.len / STEP));
      const dTurn = (seg.turn * Math.PI / 180) / n;
      const dRise = seg.rise / n;
      const dLen = seg.len / n;
      const prevW = si === 0 ? seg.w : this.segments[si - 1].w;
      // Bank eases across the seam exactly the way width does. It has to: a hillside
      // that appears between one 2m sample and the next is a wall, not a bank.
      const bank = seg.bank || BANK_DEFAULT;
      const prevBank = (si === 0 ? seg.bank : this.segments[si - 1].bank) || BANK_DEFAULT;
      // Camber eases across the seam too, and it has to ease over the WHOLE segment
      // rather than the first half like width does — a road that snaps from banked one
      // way to banked the other in twenty metres is a ditch, not a chicane.
      const cam = Math.tan(camFor(seg));
      const prevCam = Math.tan(camFor(si === 0 ? seg : this.segments[si - 1]));

      for (let i = 1; i <= n; i++) {
        head += dTurn;
        x += Math.sin(head) * dLen;
        z += Math.cos(head) * dLen;
        y += dRise;
        dist += dLen;
        // Ease the width across the seam so the road doesn't step.
        const t = i / n;
        const k = Math.min(1, t * 2);
        const w = prevW + (seg.w - prevW) * k;
        const ct = t * t * (3 - 2 * t);
        this.samples.push({ x, z, y, w, head, dist, seg: si,
                            bl: prevBank[0] + (bank[0] - prevBank[0]) * k,
                            br: prevBank[1] + (bank[1] - prevBank[1]) * k,
                            camT: prevCam + (cam - prevCam) * ct });
      }
    });
  }

  // ---- things you can actually hit ------------------------------------------
  // The slabs are the only blocky things in the world, and they have been scenery you
  // could drive straight through. Adam: "some areas like the city need collisions on the
  // buildings." They're built here rather than in the mesh builder for two reasons: the
  // physics needs them whether or not anything is being drawn, and the mesh builder now
  // needs a DOM canvas for its textures so it can't run in the harnesses at all.
  //
  // Bucketed into a coarse grid, because there are a few hundred of them over nine
  // kilometres and the car only ever cares about the two or three it's next to.
  _buildSolids() {
    this.solids = [];
    this._grid = new Map();
    const FLOOR = this.floorY;
    this.samples.forEach((s, i) => {
      const P = PROPS[this.sectionAt(s.dist)] || PROPS.dawn;
      const gy = (d, side = 1) => groundProfile(
        camberAt(s.y, d * side, s.w, s.camT),
        Math.abs(d) - s.w, FLOOR, s.span, side >= 0 ? s.bl : s.br, s.dist);
      for (const b of slabsAt({ ...s, i }, P, gy)) {
        b.hx = b.sx * 0.5; b.hz = b.sz * 0.5;
        b.top = b.y + b.sy * 0.5;
        b.c = Math.cos(b.head); b.s = Math.sin(b.head);
        const id = this.solids.push(b) - 1;
        const reach = Math.hypot(b.hx, b.hz);
        for (let gx = Math.floor((b.x - reach) / SOLID_CELL); gx <= Math.floor((b.x + reach) / SOLID_CELL); gx++)
          for (let gz = Math.floor((b.z - reach) / SOLID_CELL); gz <= Math.floor((b.z + reach) / SOLID_CELL); gz++) {
            const k = gx + ',' + gz;
            let cell = this._grid.get(k);
            if (!cell) this._grid.set(k, cell = []);
            cell.push(id);
          }
      }
    });
  }

  // Everything solid that could possibly be touching a circle of radius r at (x, z).
  solidsNear(x, z, r = 1.2) {
    const out = [];
    const seen = new Set();
    for (let gx = Math.floor((x - r) / SOLID_CELL); gx <= Math.floor((x + r) / SOLID_CELL); gx++)
      for (let gz = Math.floor((z - r) / SOLID_CELL); gz <= Math.floor((z + r) / SOLID_CELL); gz++) {
        const cell = this._grid.get(gx + ',' + gz);
        if (!cell) continue;
        for (const id of cell) if (!seen.has(id)) { seen.add(id); out.push(this.solids[id]); }
      }
    return out;
  }

  // Resolve a body against everything solid near it. Lives here, next to the boxes,
  // so the game and the harness collide exactly the same way — the alternative is two
  // copies of this that quietly drift apart, which is how the road came to hang 2.6m in
  // the air. `body` needs x, y, z and a shunt(nx, nz, depth).
  collide(body, R = 1.05) {
    // ONLY the deepest overlap gets resolved, and only one per tick. Resolving every
    // box in the list pushed the car out of one house straight into the next and back
    // again: it wedged in the village at 3526m, 7.4m off the road, and the run stopped
    // there. One push per tick converges instead of fighting itself.
    let worst = null, wx = 0, wz = 0, wd = 0;
    for (const b of this.solidsNear(body.x, body.z, R)) {
      if (body.y > b.top - 0.25) continue;              // cleared it, or standing on it
      const dx = body.x - b.x, dz = body.z - b.z;
      // Into the box's own frame: its local X is the road's lateral (cos h, -sin h),
      // its local Z the road's forward (sin h, cos h).
      const lx = dx * b.c - dz * b.s;
      const lz = dx * b.s + dz * b.c;
      const px = b.hx + R - Math.abs(lx);
      const pz = b.hz + R - Math.abs(lz);
      if (px <= 0 || pz <= 0) continue;
      const depth = Math.min(px, pz);
      if (depth <= wd) continue;
      // Out through whichever face is closest — the shallower penetration is the one
      // you came through, so that's the way back out.
      if (px < pz) { const g = Math.sign(lx) || 1; wx = g * b.c; wz = -g * b.s; }
      else         { const g = Math.sign(lz) || 1; wx = g * b.s; wz = g * b.c; }
      wd = depth; worst = b;
    }
    // Capped, so a deeply-buried frame can't teleport a fast car across the street —
    // but a car that has already stopped has to be allowed out properly, or it sits
    // inside a house with the engine running, which is how the village stalled one run
    // in five at 3777m.
    if (!worst) { body._stuck = 0; return; }

    // PINCHED. Resolving the deepest box alone is fine against one face and useless
    // between two — a car wedged in the gorge gets pushed off the left wall into the
    // right one and back, forever, which stalled seeds 2 and 4 at 4320m. So if it has
    // been in contact and going nowhere for half a second, stop arguing with the boxes
    // and push it back toward the CENTRELINE, which is the one line in the world that is
    // guaranteed to have nothing solid on it. Physically that's just reversing out.
    body._stuck = (body.speed || 0) < 2.5 ? (body._stuck || 0) + 1 : 0;
    if (body._stuck > 30) {
      const g = this.sample(body.x, body.z);
      if (g.off > 0) {
        const rx = Math.cos(g.head), rz = -Math.sin(g.head);
        const toward = -Math.sign(g.lateral) || 1;
        body.x += rx * toward * 0.25;
        body.z += rz * toward * 0.25;
        return;
      }
    }
    body.shunt(wx, wz, Math.min(wd, (body.speed || 0) > 6 ? 0.35 : 1.1));
  }

  // Runs of segments that share a section, as { key, start, end } in metres. This is
  // what js/atmos.js crossfades across, so it's also what makes the world change.
  _sections() {
    const out = [];
    this.segments.forEach((seg, si) => {
      const key = seg.sec || 'dawn';
      const start = this.segStartDist(si);
      const end = si + 1 < this.segments.length ? this.segStartDist(si + 1) : this.length;
      if (out.length && out[out.length - 1].key === key) out[out.length - 1].end = end;
      else out.push({ key, start, end });
    });
    return out;
  }

  // How far the hillside is allowed to reach out at each point.
  //
  // The skirt is extruded sideways from the road, so wherever the road turns tighter
  // than the skirt is wide, the inside of the corner folds back THROUGH itself — half
  // this stage did that, and overlapping coplanar ground z-fights and flickers as soon
  // as the camera moves. So the terrain narrows into a corner and opens out again on
  // the straights. It has to be smoothed hard: a width that jumps between neighbouring
  // samples puts a crease down the hillside, which is its own kind of seam.
  _spans() {
    const S = this.samples, n = S.length, K = 5;

    // How wide the hillside COULD be here without folding: a safe fraction of the local
    // turning radius.
    const raw = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = S[Math.max(0, i - K)], b = S[Math.min(n - 1, i + K)];
      const dh = Math.atan2(Math.sin(b.head - a.head), Math.cos(b.head - a.head));
      const arc = b.dist - a.dist;
      const R = Math.abs(dh) < 1e-6 ? Infinity : Math.abs(arc / dh);
      // The hillside reaches w + VERGE + span from the centreline, so the ROAD's own
      // half-width has to come out of the budget too — leaving it out is what kept 4%
      // of the tightest hairpins folding.
      raw[i] = Math.max(MIN_SPAN, Math.min(SKIRT, R * 0.75 - VERGE - S[i].w));
    }

    // Take the tightest value in a window, so the ground has already pulled in by the
    // time the corner arrives instead of clipping as it gets there.
    const W = 40;
    const limit = new Array(n);
    for (let i = 0; i < n; i++) {
      let m = Infinity;
      for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) m = Math.min(m, raw[j]);
      limit[i] = m;
    }

    // Then a SLOPE LIMITER rather than a blur. Blurring a min-filtered signal pushes it
    // back up above the limit — which is how 7% of the stage was still folding — and it
    // still left 3.6m steps between neighbouring samples, i.e. a crease down the hill.
    // Two sweeps of "no faster than RATE" give the widest terrain that is under the
    // limit everywhere AND never changes faster than the eye reads as a fold.
    const RATE = 0.45;                       // metres of width per 2m of road
    const span = limit.slice();
    for (let i = 1; i < n; i++) span[i] = Math.min(span[i], span[i - 1] + RATE);
    for (let i = n - 2; i >= 0; i--) span[i] = Math.min(span[i], span[i + 1] + RATE);
    for (let i = 0; i < n; i++) S[i].span = span[i];
  }

  sectionAt(dist) {
    for (const s of this.sections) if (dist < s.end) return s.key;
    return this.sections[this.sections.length - 1].key;
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
    const span = s.span + (n.span - s.span) * t;
    const off = Math.abs(lateral) - w;
    // +lat is the driver's LEFT, so which bank you're standing on depends on the sign.
    const lift = lateral >= 0 ? s.bl + (n.bl - s.bl) * t : s.br + (n.br - s.br) * t;
    const camT = s.camT + (n.camT - s.camT) * t;

    // Gradient of the road in the direction of travel. It MUST be the gradient of
    // the same pair of samples the height was interpolated across — take it from the
    // sample ahead instead and the car launches before it reaches the crest, then
    // gets glued down while the ground is still rising under it.
    const slope = (along >= 0 ? (n.y - s.y) : (s.y - n.y)) / STEP;

    // The same curve the mesh is built from, so what you can see is what you land on —
    // including off the side of the mountain, where the ground now keeps going down.
    const height = groundProfile(camberAt(baseY, lateral, w, camT), off, this.floorY, span, lift, s.dist);
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
// Mesh building.
//
// The stage is ~8km long, so everything below is built in CHUNKS of road rather than
// as one mesh per prop type. That isn't tidiness — a single 8km buffer has a bounding
// sphere the size of the map and can never be culled, so the whole stage would be
// submitted every frame. Chunked, three.js throws away everything outside the frustum
// and only the handful you can actually see through the fog gets drawn.
//
// Colour comes from js/atmos.js, per sample, so the ground changes with the place and
// crossfades across a section boundary in step with the fog.
// ---------------------------------------------------------------------------

import { atmosAt } from './atmos.js';
import { surfaceTexture, propTexture } from './texture.js';

const CHUNK = 120;          // samples per chunk — 240m

// What grows beside the road, per section. This is most of what stops five minutes of
// gravel feeling like the same forty metres on a loop.
//   tree  { every, near, far, h, r }  cones — every Nth sample, N..M metres out
//   wall  { every, h, gap, w }        slabs hard against the verge (village, gorge)
//   mono  { every, h, out, w }        big broken blocks, far out (ruins, climb)
const PROPS = {
  dawn:    { tree: { every: 7, near: 16, far: 46, h: 8.5, r: 2.4 }, tuft: 3, stone: 2 },
  // Huge, and a LOT of them. 14m pines at 17m out read as scrub on a hillside; the
  // road is supposed to be cut THROUGH a forest, which means trunks that leave the top
  // of the windscreen and go back further than the fog does.
  pines:   { tree: { every: 1, near: 2.2, far: 34, h: 30.0, r: 3.4 }, tuft: 3, stone: 2 },
  ruins:   { tree: { every: 12, near: 22, far: 60, h: 9.0, r: 3.0 },
             mono: { every: 11, h: 26, out: 26, w: 5.0 }, tuft: 2, stone: 2 },
  // gap 2.6, not 1.4. Once the buildings became solid, 1.4m left about a foot of air
  // either side of the car at the road edge, which is not a street, it's a vice.
  village: { wall: { every: 3, h: 5.5, gap: 2.6, w: 3.2 }, tuft: 1, stone: 2 },
  // The gorge is meant to have no run-off, but once the rock became solid, 1.9m of gap
  // either side of a 6.8m road made it a vice: stop touching a wall in there and the
  // car cannot get itself out. 3.2 keeps it the tightest place on the stage and leaves
  // enough room to be recovered from.
  gorge:   { wall: { every: 2, h: 17, gap: 3.2, w: 5.0 }, tuft: 1, stone: 3 },
  climb:   { tree: { every: 9, near: 9, far: 26, h: 7.0, r: 1.8 },
             mono: { every: 17, h: 14, out: 19, w: 3.4 }, tuft: 3, stone: 3 },
  plateau: { tuft: 4, stone: 3 },
  descent: { tree: { every: 4, near: 7, far: 28, h: 10.5, r: 2.3 }, tuft: 3, stone: 2 },
};

// ---------------------------------------------------------------------------
// LANDMARKS — the only things beside this road placed BY HAND.
//
// Everything above is scattered by a hash of the sample index, which is what makes
// eight kilometres of gravel affordable — but it also means nothing is anywhere in
// PARTICULAR, and a road you can't see over is learned by objects. Nobody brakes at
// 340 metres; they brake at the burnt-out car. So a landmark is pinned to a segment
// and written on the same line as the note, because half of these exist because the
// co-driver already promised them: he has been calling an arch and a bridge that were
// not there.
//
//   mark: [{ k, t, side, out, n, len, h, r }]
//     k     which kind, below
//     t     0..1 along the segment
//     side  -1 left, +1 right, 0 both. Default is the OUTSIDE of the corner, which is
//           where a marker board and a crowd both belong.
//     out   metres past the road edge
//     n     how many, for the kinds that come in a group
//     len   metres, for the kinds that run along the road instead of standing at a point
//
// Everything is built in ROAD SPACE — lat across (+ is right), along, and height above
// the road surface — so a landmark is authored the way you'd describe it from the seat
// and doesn't care which way the road happens to be pointing.
// ---------------------------------------------------------------------------

const COATS = [0x8f3b32, 0x2f4a63, 0xd8cfbc, 0x374231, 0x7a5a34, 0xa9a29a, 0x54324a];

const LANDMARK = {
  // The village arch. The note has said UNDER THE ARCH since the day the stage was
  // written; this is the arch.
  arch(g, m) {
    const H = m.h || 5.4, gap = 0.55;
    for (const side of [-1, 1]) {
      const lat = side * (g.w + gap + 0.52), b = g.ground(lat);
      g.box(lat, 0, b, [1.05, H - b, 1.6], g.p.wall, 0.70);
    }
    g.box(0, 0, H, [(g.w + gap + 1.04) * 2, 1.05, 1.9], g.p.wall, 0.58);
  },

  // The gorge bridge. Two parapets and nothing beyond them — in first person a low wall
  // rushing past on both sides with the hillside gone is the whole of what a bridge is.
  // It resamples as it goes, so it follows the road rather than running off a curve.
  bridge(g, m) {
    const len = m.len || 60, n = Math.max(2, Math.round(len / 3.4));
    for (let k = 0; k <= n; k++) {
      const gk = g.at((k / n - 0.5) * len);
      for (const side of [-1, 1])
        gk.box(side * (gk.w + 0.42), 0, -0.20, [0.46, 1.15, 3.0], gk.p.wall, 0.62 + (k % 3) * 0.07);
    }
  },

  // Gold cloth on a beam over the road. The championship arrived from the sky and hung
  // its banners over a road that has never seen an engine; this is the whole world in
  // one prop, and it's also the only thing in the game that passes over your head.
  banner(g, m) {
    const H = m.h || 7.6, out = m.out ?? 1.4;
    for (const side of [-1, 1]) {
      const lat = side * (g.w + out), b = g.ground(lat);
      g.box(lat, 0, b, [0.42, H - b + 0.5, 0.42], 0x7d6c42);
    }
    const span = (g.w + out) * 2;
    g.box(0, 0, H, [span + 0.6, 0.34, 0.34], 0x7d6c42);            // the beam
    g.box(0, 0, H - 3.0, [span * 0.80, 3.0, 0.10], 0xb99236);      // the cloth
    for (const k of [-1, 0, 1])                                    // strips hanging off it
      g.box(k * span * 0.26, 0, H - 4.9, [0.5, 1.95, 0.08], 0x8f6f2a);
  },

  // Marker boards on the outside of a corner, angled back at you. In first person the
  // co-driver is one channel and this is the other: three boards stepping away from you
  // draw the radius of a corner you cannot see round.
  chevron(g, m) {
    const n = m.n || 3;
    for (const side of (m.side === 0 ? [-1, 1] : [m.side])) {
      for (let k = 0; k < n; k++) {
        const gk = g.at(k * 6.5);
        const lat = side * (gk.w + 0.85 + (m.out || 0));
        gk.box(lat, 0, gk.ground(lat) + 0.55, [1.45, 0.8, 0.1],
               k % 2 ? 0xd8433a : 0xe8e2d4, 1, side * 0.45);
        gk.box(lat, 0, gk.ground(lat), [0.11, 0.6, 0.11], 0x3a352d, 1, side * 0.45);
      }
    }
  },

  // Somebody didn't get this one right, and nobody came to take it away. This is the
  // brake marker that actually works, because it's the only thing on the stage that
  // looks like what happens if you're wrong.
  wreck(g, m) {
    const side = m.side, lat = side * (g.w + (m.out ?? 4.0));
    const b = g.ground(lat), yaw = m.yaw ?? side * 0.8, roll = m.roll ?? side * 0.55;
    g.box(lat, 0, b + 0.30, [1.78, 0.66, 3.95], 0x2a2622, 1, yaw, roll);
    g.box(lat, -0.4, b + 0.92, [1.52, 0.62, 1.8], 0x1c1a18, 1, yaw, roll);
    g.box(lat + side * 1.6, 1.8, b, [0.7, 0.22, 1.1], 0x161412, 1, yaw * 1.6);  // a door, thrown
  },

  // People standing where they should not be standing. They do a job as well as being
  // the thing rally looks like: a crowd leaning into a corner tells you it's tight
  // before he calls it.
  crowd(g, m) {
    const n = m.n || 9;
    for (const side of (m.side === 0 ? [-1, 1] : [m.side])) {
      for (let k = 0; k < n; k++) {
        const j = (k * 37 + (side > 0 ? 11 : 4)) % 23;
        const gk = g.at(((k % 6) - 2.5) * 2.9 + (j % 4) * 0.8);
        const lat = side * (gk.w + 1.5 + (m.out || 0) + (j % 5) * 1.05);
        const b = gk.ground(lat), h = 1.46 + (j % 4) * 0.07;
        gk.box(lat, 0, b, [0.44, h, 0.30], COATS[j % COATS.length], 0.8 + (j % 3) * 0.1);
        gk.sphere(lat, 0, b + h + 0.13, 0.135, 0xbe9c7e);
      }
    }
  },

  // One tree, exactly where the note says there's a tree.
  tree(g, m) {
    const lat = m.side * (g.w + (m.out ?? 1.4));
    g.cone(lat, 0, g.ground(lat) - 0.35, m.r || 2.4, m.h || 16, g.p.tree);
  },
};

// Where the slabs stand at one sample. ONE function, because the renderer draws these
// and the car now hits them, and the last time two bits of code computed the same
// surface separately the road hung 2.6m in the air for a whole stage.
//
// `gy(d, side)` is the ground at that distance out — the caller supplies it because the
// mesh builder and the Stage reach it slightly differently.
export function slabsAt(s, P, gy) {
  const out = [];
  const rx = Math.cos(s.head), rz = -Math.sin(s.head);

  // Walls: slabs hard against the verge. In the village they're houses, in the gorge
  // they're the rock — same primitive, different height and colour.
  if (P.wall && s.i % P.wall.every === 0) {
    for (const side of [-1, 1]) {
      const j = (s.i * 43 + (side > 0 ? 19 : 3)) % 13;
      const h = P.wall.h * (0.70 + (j % 6) * 0.10);
      const d = s.w + P.wall.gap + P.wall.w * 0.5;
      out.push({ kind: 'wall', j,
                 x: s.x + rx * d * side, y: gy(d, side) - 0.40 + h * 0.5, z: s.z + rz * d * side,
                 head: s.head, sx: P.wall.w, sy: h, sz: 2.0 + (j % 4) * 1.4 });
    }
  }

  // Monoliths: whatever this place used to be, still standing, a long way back.
  if (P.mono && s.i % P.mono.every === 0) {
    const side = ((s.i / P.mono.every) | 0) % 2 ? 1 : -1;
    const j = (s.i * 29) % 19;
    const h = P.mono.h * (0.55 + (j % 7) * 0.12);
    const d = s.w + P.mono.out + (j % 5) * 4.5;
    out.push({ kind: 'mono', j,
               x: s.x + rx * d * side, y: gy(d, side) - 0.60 + h * 0.5, z: s.z + rz * d * side,
               head: s.head + (j % 5) * 0.19, sx: P.mono.w, sy: h,
               sz: P.mono.w * (0.6 + (j % 3) * 0.3) });
  }
  return out;
}

export function buildStageMesh(THREE, stage, opts = {}) {
  const group = new THREE.Group();

  // A SLIGHT texture on everything. The world was flat colour, and the only detail on
  // the road was the ruts and scars — which are literally rectangles, and read as a
  // pixely pattern rather than as ground. These maps are near-white multipliers: they
  // never change a colour, they only stop the light landing evenly. See texture.js.
  const TEX = opts.tex ?? 1;                   // 0 turns it all off
  const GRAIN_M = 2.6;                         // metres per tile on the ground
  const surf = TEX > 0 ? surfaceTexture(THREE, { amount: TEX, aniso: opts.aniso ?? 4 }) : null;
  const prop = TEX > 0 ? propTexture(THREE, { amount: TEX * 0.85, aniso: 4 }) : null;
  const S = stage.samples;

  // Per-sample palette, blended exactly the way the fog is, so the ground and the air
  // arrive at the new place together.
  const pal = S.map(s => atmosAt(stage.sections, s.dist).ground);
  const col = new THREE.Color();
  const hex = h => { col.setHex(h); return [col.r, col.g, col.b]; };

  // The valley floor: one plane under the entire stage, at the lowest point it reaches.
  // The skirt below runs down to meet it, so there is never a hole and never a lip.
  let cx = 0, cz = 0;
  for (const s of S) { cx += s.x; cz += s.z; }
  const FLOOR = stage.floorY;
  // The valley floor is 12km across. Tiling it at the road's 2.6m means ~4600 repeats,
  // and that many texels crammed into a few pixels of horizon is all minification —
  // expensive everywhere and murder on a software rasteriser. It's also pointless: the
  // floor is far away and half of it is behind fog, so it gets a big lazy tile and no
  // anisotropy at all.
  const floorTex = surf ? surf.clone() : null;
  if (floorTex) {
    floorTex.needsUpdate = true;
    floorTex.repeat.set(12000 / 26, 12000 / 26);
    floorTex.anisotropy = 1;
  }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12000, 12000),
    new THREE.MeshLambertMaterial({ color: 0x55603f, map: floorTex })
  );
  ground.rotation.x = -Math.PI / 2;
  // 5cm, not 40cm: the skirt runs down to exactly FLOOR, so any bigger gap is a step
  // you can see all the way round the horizon.
  ground.position.set(cx / S.length, FLOOR - 0.05, cz / S.length);
  group.add(ground);

  // The ribbons carry a real per-vertex colour attribute, so they want vertexColors.
  // The props do NOT: they're instanced, and their colour arrives through instanceColor,
  // which three multiplies in on its own. Setting vertexColors on them makes the shader
  // read a `color` attribute that a BoxGeometry has never had — WebGL hands it (0,0,0)
  // and every tree, wall and stone renders pure black.
  const roadMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: surf });
  const propMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: prop });
  // Ruts and scars lie a couple of centimetres over the road, which is far below the
  // depth buffer's resolution a few hundred metres out. polygonOffset is the fix for
  // coplanar decals — without it they shimmer in and out at distance.
  const decalMat = new THREE.MeshLambertMaterial({
    vertexColors: true, map: surf,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });

  // Geometry shared by every chunk's instanced props.
  const treeGeo = new THREE.ConeGeometry(1, 1, 6);         // unit cone, scaled per instance
  const postGeo = new THREE.BoxGeometry(0.22, 1.15, 0.22);
  const tuftGeo = new THREE.ConeGeometry(0.30, 0.85, 4);
  const stoneGeo = new THREE.DodecahedronGeometry(0.20, 0);
  const slabGeo = new THREE.BoxGeometry(1, 1, 1);          // unit box, scaled per instance

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  // ---- one chunk of road, plus everything standing next to it ---------------
  for (let c0 = 0; c0 < S.length - 1; c0 += CHUNK) {
    const c1 = Math.min(S.length - 1, c0 + CHUNK);
    const chunk = new THREE.Group();

    // --- ribbons: road, verge, ruts, scars ---------------------------------
    const strip = () => ({ pos: [], col: [], uv: [], idx: [] });
    const land = strip(), rut = strip(), scar = strip();

    // World-planar UV. The ribbon is a ground surface, so mapping straight off world x/z
    // keeps the texel size constant everywhere — a UV that ran along the road instead
    // would stretch the texture out across the wide skirt and squash it in the hairpins.
    const push = (t, x, y, z, rgb) => {
      t.pos.push(x, y, z);
      t.col.push(rgb[0], rgb[1], rgb[2]);
      t.uv.push(x / GRAIN_M, z / GRAIN_M);
    };
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

    // ONE continuous surface, road included, from the valley floor on one side to the
    // valley floor on the other. Fourteen points across, and the only reason it isn't
    // twelve is that the road edge needs a hard colour break: ±w appears twice, once
    // verge-coloured and once road-coloured, so the tarmac has a crisp edge without a
    // second overlapping ribbon that would z-fight with the ground at distance.
    const BANDS = [0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 12];   // 5->6 and 7->8 are the seams
    for (let i = c0; i <= c1; i++) {
      const s = S[i], p = pal[i];
      const rx = Math.cos(s.head), rz = -Math.sin(s.head);
      const cRoad = hex(p.road), cVerge = hex(p.verge), cFloor = hex(p.floor);
      const cNear = mix(cVerge, cFloor, 0.35), cFar = mix(cVerge, cFloor, 0.75);
      const w = s.w, V = w + VERGE, K = s.span;
      // Each side reads its own bank. Ground that FALLS runs out to the valley floor and
      // takes the floor's colour with it; ground that RISES is a hillside, so it goes the
      // other way, toward rock and whatever grows on it. Same eleven bands either way.
      const sideOf = lift => {
        const up = lift > 0;
        const outer = up ? hex(p.stone) : cFloor;
        return {
          mid: up ? RISE_END * 0.55 : (-lift) / EDGE_SLOPE,
          near: mix(cVerge, outer, up ? 0.30 : 0.35),
          far: mix(cVerge, outer, up ? 0.62 : 0.75),
          outer,
        };
      };
      const R = sideOf(s.br), L = sideOf(s.bl);   // -lat is the driver's right
      const cross = [
        [-(V + K), R.outer], [-(V + K * 0.65), R.far], [-(V + K * 0.30), R.near],
        [-V, cVerge], [-(w + R.mid), cVerge], [-w, cVerge],
        [-w, cRoad], [w, cRoad],
        [w, cVerge], [w + L.mid, cVerge], [V, cVerge],
        [V + K * 0.30, L.near], [V + K * 0.65, L.far], [V + K, L.outer],
      ];
      for (const [lat, rgb] of cross) {
        const y = groundProfile(camberAt(s.y, lat, w, s.camT), Math.abs(lat) - w,
                                FLOOR, K, lat >= 0 ? s.bl : s.br, s.dist);
        push(land, s.x + rx * lat, y, s.z + rz * lat, rgb);
      }

      if (i > c0) {
        const k = i - c0, q0 = (k - 1) * 14, q1 = k * 14;
        // Offsets run monotonically in +r, so this is the same winding as the old road
        // strip — get it backwards and half the hillside is lit from underneath.
        for (const u of BANDS) {
          const v = u + 1;
          land.idx.push(q0 + u, q1 + u, q0 + v, q0 + v, q1 + u, q1 + v);
        }
      }
    }

    // Wheel ruts. DASHED, not continuous — a solid line running the way you're
    // travelling barely appears to move, which is the worst motion cue there is.
    const RUT_OFF = 0.78, RUT_W = 0.19;
    const MARK = 0.42;             // how far a mark is allowed to be from road colour
    let rq = 0;
    for (let i = c0; i + 3 <= c1; i += 5) {              // 6m dash, 4m gap
      const cRut = mix(hex(pal[i].road), hex(pal[i].rut), MARK);
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const s = S[i + k];
          const rx = Math.cos(s.head), rz = -Math.sin(s.head);
          const a0 = RUT_OFF * side - RUT_W, a1 = RUT_OFF * side + RUT_W;
          push(rut, s.x + rx * a0, s.y + 0.02, s.z + rz * a0, cRut);
          push(rut, s.x + rx * a1, s.y + 0.02, s.z + rz * a1, cRut);
        }
        const b = rq * 6;
        rut.idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        rut.idx.push(b + 2, b + 4, b + 3, b + 3, b + 4, b + 5);
        rq++;
      }
    }

    // Scars ACROSS the road. The ruts run parallel to travel so they hardly stream;
    // transverse marks rush at you and past, which is what reads as ground speed.
    let sc = 0;
    for (let i = c0 + 1; i + 2 <= c1; i += 3) {
      const j = (i * 41) % 23;
      const s0 = S[i], s1 = S[i + 1 + (j % 2)];
      const cS = mix(hex(pal[i].road), hex(pal[i].scar), MARK * 0.8);
      const r0x = Math.cos(s0.head), r0z = -Math.sin(s0.head);
      const r1x = Math.cos(s1.head), r1z = -Math.sin(s1.head);
      const off = ((j % 11) - 5) * 0.42;                  // wander across the road
      const half = 0.9 + (j % 5) * 0.45;
      push(scar, s0.x + r0x * (off - half), s0.y + 0.03, s0.z + r0z * (off - half), cS);
      push(scar, s0.x + r0x * (off + half), s0.y + 0.03, s0.z + r0z * (off + half), cS);
      push(scar, s1.x + r1x * (off - half), s1.y + 0.03, s1.z + r1z * (off - half), cS);
      push(scar, s1.x + r1x * (off + half), s1.y + 0.03, s1.z + r1z * (off + half), cS);
      const b = sc * 4;
      scar.idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      sc++;
    }

    for (const [t, mat] of [[land, roadMat], [rut, decalMat], [scar, decalMat]]) {
      if (!t.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(t.col, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2));
      g.setIndex(t.idx);
      g.computeVertexNormals();
      chunk.add(new THREE.Mesh(g, mat));
    }

    // --- props ---------------------------------------------------------------
    // Counted first, then filled, so each InstancedMesh is exactly the right size.
    const jobs = { tree: [], post: [], tuft: [], stone: [], slab: [] };

    for (let i = c0; i <= c1; i++) {
      const s = S[i], p = pal[i];
      const P = PROPS[stage.sectionAt(s.dist)] || PROPS.dawn;
      const rx = Math.cos(s.head), rz = -Math.sin(s.head);
      // Where the ground actually IS at a given distance out. Everything below stands
      // on this. Previously every prop was pinned to ROAD level and ignored the verge
      // falling away, so posts hovered 19cm up, stones 55cm, trees 60cm and the ruins
      // monoliths a clear 1.1m — while the near pines were buried to the branches.
      // `d` is distance from the centreline; side decides which bank it stands on.
      const gy = (d, side = 1) => groundProfile(camberAt(s.y, d * side, s.w, s.camT),
                                                Math.abs(d) - s.w, FLOOR, s.span, side >= 0 ? s.bl : s.br, s.dist);

      // edge posts, so you can read where the road goes in first person
      if (i % 4 === 0) {
        for (const side of [-1, 1]) {
          const d = s.w + 0.7;
          jobs.post.push({ x: s.x + rx * d * side, y: gy(d, side) + 0.52,
                           z: s.z + rz * d * side, c: p.post });
        }
      }

      // grass tufts right at the road edge. Flow is dominated by whatever is nearest,
      // so these are the single biggest thing making it feel fast.
      for (const side of [-1, 1]) {
        for (let k = 0; k < (P.tuft || 3); k++) {
          const j = (i * 31 + k * 17 + (side > 0 ? 13 : 0)) % 19;
          const d = s.w + 0.35 + k * 0.75 + j * 0.09;
          // Cone origin is its centre, so half the height puts the base on the ground;
          // a few centimetres lower and it grows OUT of the dirt rather than resting on
          // it, which is the difference between grass and a traffic cone.
          jobs.tuft.push({ x: s.x + rx * d * side, y: gy(d, side) + 0.225 - (j % 4) * 0.03,
                           z: s.z + rz * d * side, c: p.tuft });
        }
        for (let k = 0; k < (P.stone || 2); k++) {
          const j = (i * 53 + k * 23 + (side > 0 ? 29 : 7)) % 23;
          const d = s.w + 0.25 + j * 0.11;
          jobs.stone.push({ x: s.x + rx * d * side, y: gy(d, side) + 0.06 - (j % 3) * 0.02,
                            z: s.z + rz * d * side, c: p.stone });
        }
      }

      if (P.tree && i % P.tree.every === 0) {
        for (const side of [-1, 1]) {
          const j = (i * 37 + (side > 0 ? 11 : 0)) % 17;
          const t = j / 17;
          const d = s.w + P.tree.near + t * (P.tree.far - P.tree.near);
          const h = P.tree.h * (0.72 + (j % 5) * 0.13);
          jobs.tree.push({ x: s.x + rx * d * side, y: gy(d, side) - 0.30, z: s.z + rz * d * side,
                           h, r: P.tree.r * (0.8 + (j % 3) * 0.16), c: p.tree });
        }
      }

      // Each building gets its own shade of the same material. Two hex values would
      // read as two kinds of house; a scale on one reads as weathering.
      for (const b of slabsAt({ ...s, i }, P, gy)) {
        jobs.slab.push(b.kind === 'wall'
          ? { ...b, c: p.wall, shade: 0.74 + (b.j % 6) * 0.09 }
          : { ...b, c: p.stone, shade: 0.68 + (b.j % 5) * 0.10 });
      }
    }

    const inst = (geo, list, place) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, propMat, list.length);
      list.forEach((o, i) => {
        place(o);
        im.setMatrixAt(i, m);
        col.setHex(o.c);
        if (o.shade) col.multiplyScalar(o.shade);
        im.setColorAt(i, col);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      chunk.add(im);
    };

    inst(postGeo, jobs.post, o => m.makeTranslation(o.x, o.y, o.z));
    inst(tuftGeo, jobs.tuft, o => m.makeTranslation(o.x, o.y, o.z));
    inst(stoneGeo, jobs.stone, o => m.makeTranslation(o.x, o.y, o.z));
    inst(treeGeo, jobs.tree, o => {
      pos.set(o.x, o.y + o.h * 0.5, o.z);
      scl.set(o.r, o.h, o.r);
      q.identity();
      m.compose(pos, q, scl);
    });
    inst(slabGeo, jobs.slab, o => {
      pos.set(o.x, o.y, o.z);
      scl.set(o.sx, o.sy, o.sz);
      // +head, not -head. A box rotated by -head is MIRRORED about the road direction,
      // so it sits 2*head away from the orientation it was meant to have. Boxes are
      // symmetric under 180 degrees, which masked it: the arch happened to sit at a
      // heading of -90 and came out 1.4 degrees off, while every building in the village
      // was up to ninety degrees wrong — which is why the place read as scattered blocks
      // instead of a street. Ry(+head) takes local X to (cos head, -sin head), which is
      // exactly the road's lateral, and local Z to the road's forward.
      q.setFromAxisAngle(UP, o.head);
      m.compose(pos, q, scl);
    });

    group.add(chunk);
  }

  // ---- the horizon ---------------------------------------------------------
  // "make sure in every area i cannot see the end of the baseplate."
  //
  // The shaped hillside only runs a couple of hundred metres out; past that it was a
  // dead flat apron all the way to the fog, and a flat apron under a straight horizon is
  // exactly what reads as the edge of a table. So the stage carries its own distant
  // landscape: big soft forms standing on the valley floor, far enough out to be most of
  // the way into the haze, tall enough that there is always something ABOVE the horizon
  // line in every direction. You never see them properly. That's the point — they exist
  // to make sure the world doesn't end.
  {
    const hills = [];
    const coarse = S.filter((_, i) => i % 20 === 0);      // for keeping clear of the road
    for (let i = 0; i < S.length; i += 110) {
      const s = S[i];
      const rx = Math.cos(s.head), rz = -Math.sin(s.head);
      for (const side of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const j = (i * 61 + k * 137 + (side > 0 ? 29 : 3)) % 97;
          const r = 150 + (j % 5) * 70;                    // 150..430m BASE radius
          const d = r + 260 + (j % 11) * 46;               // so the near foot clears
          const x = s.x + rx * d * side, z = s.z + rz * d * side;
          // The road doubles back on itself up the climb, so a hill dropped blindly to
          // one side can land on a piece of road you reach two minutes later — which is
          // exactly what happened: "the mountains interfere with the track sometimes".
          // The clearance has to be the hill's OWN RADIUS plus a margin, not a constant.
          // It was a flat 260m against hills up to 510m across, so the widest of them
          // reached eighty metres past the centreline of a road they were meant to miss.
          const keep = (r + 150) ** 2;
          let clear = true;
          for (const c of coarse) if ((c.x - x) ** 2 + (c.z - z) ** 2 < keep) { clear = false; break; }
          if (!clear) continue;
          hills.push({ x, z, h: 110 + (j % 7) * 38, r, c: pal[i].floor });
        }
      }
    }
    if (hills.length) {
      const im = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), propMat, hills.length);
      hills.forEach((o, k) => {
        pos.set(o.x, FLOOR - 8 + o.h * 0.5, o.z);
        scl.set(o.r, o.h, o.r);
        q.setFromAxisAngle(UP, (k * 2.399));
        m.compose(pos, q, scl);
        im.setMatrixAt(k, m);
        // Aerial perspective: the further a thing is, the more of the sky is in it.
        col.setHex(o.c).lerp(new THREE.Color(0xffffff), 0.18);
        im.setColorAt(k, col);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      group.add(im);
    }
  }

  // ---- landmarks -----------------------------------------------------------
  // Not chunked. There are twenty of them across eight kilometres, so they all go into
  // one instanced mesh per shape — three draw calls for the lot, which is cheaper than
  // giving the culler four hundred separate little meshes to think about every frame.
  {
    const LM = { box: [], sph: [], cone: [] };

    // First and last sample of each segment, so a mark's `t` can land on a real sample.
    const first = [], last = [];
    S.forEach((s, i) => { if (first[s.seg] === undefined) first[s.seg] = i; last[s.seg] = i; });

    // The road-space frame at one sample. `at()` hands back the same thing a few metres
    // up or down the road, which is how a bridge or a run of boards follows a curve
    // instead of being extruded off one sample's heading.
    const frame = i => {
      const s = S[i];
      const rx = Math.cos(s.head), rz = -Math.sin(s.head);
      const fx = Math.sin(s.head), fz = Math.cos(s.head);
      const put = (list, lat, along, base, size, c, shade, yaw, roll) => list.push({
        x: s.x + rx * lat + fx * along,
        y: s.y + base + size[1] * 0.5,
        z: s.z + rz * lat + fz * along,
        sx: size[0], sy: size[1], sz: size[2],
        yaw: s.head + (yaw || 0), roll: roll || 0, c, shade: shade || 1,
      });
      const g = {
        w: s.w, p: pal[i],
        // How far the ground has fallen from road level this far out. Everything stands
        // on this, or it hovers over the verge the way every prop here used to.
        ground: lat => groundProfile(camberAt(s.y, lat, s.w, s.camT),
                                     Math.abs(lat) - s.w, FLOOR, s.span, lat >= 0 ? s.bl : s.br, s.dist) - s.y,
        at(d) {
          let j = i, target = s.dist + d;
          while (j > 0 && S[j].dist > target) j--;
          while (j < S.length - 1 && S[j].dist < target) j++;
          return frame(j);
        },
        box: (lat, along, base, size, c, shade, yaw, roll) =>
          put(LM.box, lat, along, base, size, c, shade, yaw, roll),
        sphere: (lat, along, cy, r, c) =>
          put(LM.sph, lat, along, cy - r, [r * 2, r * 2, r * 2], c),
        cone: (lat, along, base, r, h, c) =>
          put(LM.cone, lat, along, base, [r, h, r], c),
      };
      return g;
    };

    stage.segments.forEach((seg, si) => {
      if (!seg.mark) return;
      const a = first[si], b = last[si];
      for (const mk of seg.mark) {
        const build = LANDMARK[mk.k];
        if (!build) continue;
        // Default side is the OUTSIDE of the corner. Positive turn is a LEFT-hander,
        // whose outside is the driver's right — and +lat is the driver's left, so that
        // is side -1. A straight has no outside, so it gets the other one.
        build(frame(Math.round(a + (b - a) * (mk.t ?? 0.5))),
              { ...mk, side: mk.side ?? (seg.turn > 0 ? -1 : 1) });
      }
    });

    const eul = new THREE.Euler(0, 0, 0, 'YXZ');
    const sphGeo = new THREE.SphereGeometry(1, 7, 5);
    for (const [geo, list] of [[slabGeo, LM.box], [sphGeo, LM.sph], [treeGeo, LM.cone]]) {
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(geo, propMat, list.length);
      list.forEach((o, k) => {
        pos.set(o.x, o.y, o.z);
        scl.set(o.sx, o.sy, o.sz);
        // Roll is about the object's own long axis, and YXZ applies Z first, so a wreck
        // tips onto its side before it's turned to face down the road.
        eul.set(0, o.yaw, o.roll);
        q.setFromEuler(eul);
        m.compose(pos, q, scl);
        im.setMatrixAt(k, m);
        col.setHex(o.c);
        col.multiplyScalar(o.shade);
        im.setColorAt(k, col);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      group.add(im);
    }
  }

  // ---- start area ----------------------------------------------------------
  // The finish is a bare beam, because you're through it at 90mph and gone. The start is
  // somewhere you SIT — through a whole countdown, with nothing to do but look — so it
  // gets the things you'd end up staring at: a gantry you're parked under, a line across
  // the road at your wheels, and boards either side to square the car up against.
  {
    const s0 = S[0];
    const rx = Math.cos(s0.head), rz = -Math.sin(s0.head);   // across the road
    const fx = Math.sin(s0.head), fz = Math.cos(s0.head);    // down it
    const red = new THREE.MeshLambertMaterial({ color: 0xd8433a, map: prop });
    const pale = new THREE.MeshLambertMaterial({ color: 0xe8e2d4, map: prop });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2b2f36, map: prop });
    const at = (mesh, out, along, up) => {
      mesh.position.set(s0.x + rx * out + fx * along, s0.y + up, s0.z + rz * out + fz * along);
      mesh.rotation.y = s0.head;
      group.add(mesh);
    };
    const span = s0.w * 2.4;
    at(new THREE.Mesh(new THREE.BoxGeometry(span, 0.62, 0.5), red), 0, 11, 4.30);
    for (const side of [-1, 1]) {
      at(new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.4, 0.34), dark), side * span * 0.5, 11, 2.1);
      // Marker boards. Two a side, staggered, so from the driver's seat they give you
      // something to line the car up against before the count even starts.
      for (let k = 0; k < 2; k++)
        at(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.9, 0.62), k ? red : pale),
           side * (s0.w + 0.7), 1.5 + k * 3.4, 0.45);
    }
    // The line itself, sunk a hair into the road so it can't z-fight with it.
    at(new THREE.Mesh(new THREE.BoxGeometry(s0.w * 2, 0.04, 0.34), pale), 0, 3.2, 0.02);
  }

  // ---- finish gate ---------------------------------------------------------
  const last = S[S.length - 1];
  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(last.w * 2.4, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xd8433a, map: prop })
  );
  gate.position.set(last.x, last.y + 3.2, last.z);
  gate.rotation.y = last.head;
  group.add(gate);

  return group;
}
