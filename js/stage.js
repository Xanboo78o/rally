// stage.js — ONE hand-authored stage, about five minutes long. Every corner below is
// placed by hand, in order, the way you'd write pace notes. Nothing here is generated:
// the builder just walks this list and lays road along it.
//
// It is also the TUTORIAL, and it teaches in the only voice the game has — the notes.
// The first time a technique is the only way through, the co-driver says so out loud;
// after that he trusts you and just calls the corner. So the order of the sections is
// the order you learn things:
//
//   THE DROP ZONE  wide and fast          the wheel is heavy — start turning early
//   THE PINES      narrow and dark        the handbrake, on a hairpin with no room
//   THE OLD ROAD   fast and open          the downshift, where a handbrake would kill you
//   THE VILLAGE    square 90s             placing the car, one metre at a time
//   THE GORGE      linked, no run-off     rhythm — you can't fix a corner you entered wrong
//   THE CLIMB      four stacked hairpins  everything you've learned, uphill
//   THE PLATEAU    flat out               the big jump, and landing it straight
//   THE DESCENT    downhill and blind     trusting the notes over crests you can't see
//
// turn  = degrees swept across the segment, negative is left
// rise  = metres climbed (or dropped) across the segment
// w     = road half-width in metres
// sec   = which place you're in — the look and the sound come from js/atmos.js
// note  = what the co-driver calls, ~55m before you arrive

export const SEGMENTS = [
  // ---- THE DROP ZONE ------------------------------------------------------
  // Wide, fast, forgiving. Long corners you cannot take by flicking the wheel at
  // the apex — it's too heavy — so this is where you learn to start early.
  { len: 140, turn:    0, rise:   0, w: 6.0, sec: 'dawn', note: 'STAGE START — FLAT OUT' },
  { len: 120, turn:  -34, rise:   0, w: 5.5, sec: 'dawn', note: 'LEFT 5 LONG — START TURNING EARLY' },
  { len: 110, turn:   30, rise:  -2, w: 5.5, sec: 'dawn', note: 'RIGHT 5 LONG' },
  { len:  90, turn:    0, rise:  -3, w: 5.5, sec: 'dawn', note: 'STRAIGHT 90' },
  { len: 130, turn:  -52, rise:   0, w: 5.0, sec: 'dawn', note: 'LEFT 4 LONG' },
  { len: 100, turn:  -18, rise:   2, w: 5.5, sec: 'dawn', note: '...OPENS, FLAT' },
  { len:  85, turn:   64, rise:   0, w: 5.0, sec: 'dawn', note: 'RIGHT 3' },
  { len:  70, turn:   30, rise:  -1, w: 4.6, sec: 'dawn', note: '...TIGHTENS — DONT OVERTURN' },
  { len: 120, turn:    0, rise:   0, w: 5.0, sec: 'dawn', note: 'STRAIGHT 120 INTO THE TREES' },

  // ---- THE PINES ----------------------------------------------------------
  // The road halves in width and the trees come to the edge of it. First hairpin:
  // there is no radius here, so the handbrake is the only way round.
  { len:  90, turn:  -44, rise:   3, w: 4.2, sec: 'pines', note: 'LEFT 4 INTO TREES' },
  { len:  60, turn:   52, rise:   2, w: 4.0, sec: 'pines', note: 'RIGHT 3 NARROW' },
  { len:  55, turn:  -58, rise:   0, w: 3.8, sec: 'pines', note: 'LEFT 3 TIGHT' },
  { len:  70, turn:    0, rise:  -2, w: 4.0, sec: 'pines', note: 'SHORT 70' },
  { len:  58, turn: -140, rise:   0, w: 4.0, sec: 'pines', note: 'HAIRPIN LEFT 1 — HOLD THE HANDBRAKE' },
  { len:  80, turn:    0, rise:   4, w: 4.2, sec: 'pines', note: 'STRAIGHT, CLIMBING' },
  { len:  75, turn:   96, rise:   2, w: 4.0, sec: 'pines', note: 'RIGHT 2 — HANDBRAKE AGAIN' },
  { len:  95, turn:  -36, rise:   0, w: 4.2, sec: 'pines', note: 'LEFT 4' },
  { len:  70, turn:   60, rise:  -2, w: 4.0, sec: 'pines', note: 'RIGHT 3 OVER ROOTS' },
  { len:  62, turn:  -72, rise:   0, w: 3.8, sec: 'pines', note: 'LEFT 2 — TREE ON THE INSIDE' },
  { len:  58, turn:    0, rise:   3, w: 4.0, sec: 'pines', note: 'SHORT 58, CRESTING' },
  { len:  65, turn:   26, rise:  -4, w: 4.2, sec: 'pines', note: 'RIGHT 4 DOWNHILL' },
  { len:  55, turn:  -34, rise:  -3, w: 3.8, sec: 'pines', note: 'LEFT 3 — DONT DROP A WHEEL' },
  { len: 110, turn:   40, rise:  -2, w: 4.4, sec: 'pines', note: 'RIGHT 4 LONG, OUT OF THE TREES' },

  // ---- THE OLD ROAD -------------------------------------------------------
  // Fast fourth-gear corners. Grabbing the handbrake here throws all your speed away
  // for rotation you didn't need — so this is where the downshift earns its keep.
  { len: 150, turn:    0, rise:   0, w: 5.2, sec: 'ruins', note: 'FLAT OUT 150' },
  { len: 130, turn:  -46, rise:   0, w: 5.0, sec: 'ruins', note: 'LEFT 5 FLAT — FLICK DOWN TO ROTATE' },
  { len: 120, turn:   50, rise:   0, w: 5.0, sec: 'ruins', note: 'RIGHT 5 FLAT' },
  { len:  95, turn:  -62, rise:  -2, w: 4.8, sec: 'ruins', note: 'LEFT 4' },
  { len: 105, turn:   58, rise:   0, w: 4.8, sec: 'ruins', note: 'RIGHT 4 LONG' },
  { len:  60, turn:    0, rise:   6, w: 5.0, sec: 'ruins', note: 'CREST 60' },
  { len:  50, turn:    0, rise:  -9, w: 5.0, sec: 'ruins', note: 'CAUTION — JUMP, LAND STRAIGHT' },
  { len:  90, turn:    0, rise:  -4, w: 5.0, sec: 'ruins', note: 'LANDING' },
  { len: 110, turn:  -70, rise:   0, w: 4.6, sec: 'ruins', note: 'LEFT 3 LONG' },
  { len:  85, turn:   44, rise:   0, w: 4.6, sec: 'ruins', note: 'RIGHT 4' },
  { len:  70, turn:  -50, rise:  -2, w: 4.4, sec: 'ruins', note: 'LEFT 3' },
  { len: 130, turn:    0, rise:  -3, w: 4.8, sec: 'ruins', note: 'STRAIGHT 130' },

  // ---- THE VILLAGE --------------------------------------------------------
  // Square corners between walls. Nothing here is fast; all of it is about putting
  // the car exactly where you meant to put it.
  { len:  80, turn:    0, rise:  -2, w: 4.0, sec: 'village', note: 'INTO THE VILLAGE — NARROWS' },
  { len:  45, turn:  -84, rise:   0, w: 3.4, sec: 'village', note: 'LEFT 2 SQUARE' },
  { len:  60, turn:    0, rise:   0, w: 3.4, sec: 'village', note: 'SHORT 60 BETWEEN WALLS' },
  { len:  42, turn:   88, rise:   0, w: 3.2, sec: 'village', note: 'RIGHT 2 SQUARE' },
  { len:  70, turn:    0, rise:   2, w: 3.4, sec: 'village', note: 'STRAIGHT 70' },
  { len:  46, turn:  -92, rise:   0, w: 3.2, sec: 'village', note: 'LEFT 2 SQUARE' },
  { len:  38, turn:   84, rise:   0, w: 3.0, sec: 'village', note: 'RIGHT 2 — VERY TIGHT' },
  { len:  64, turn:    0, rise:   2, w: 3.4, sec: 'village', note: 'SHORT 64 THROUGH THE SQUARE' },
  { len:  48, turn:   96, rise:   0, w: 3.2, sec: 'village', note: 'RIGHT 2 SQUARE' },
  { len:  56, turn:  -36, rise:  -1, w: 3.4, sec: 'village', note: 'LEFT 3, UNDER THE ARCH' },
  { len:  55, turn:    0, rise:   0, w: 3.4, sec: 'village', note: 'STRAIGHT 55, WALLS BOTH SIDES' },
  { len:  40, turn:   80, rise:   0, w: 3.2, sec: 'village', note: 'RIGHT 2 TIGHT' },
  { len:  50, turn:  -30, rise:   0, w: 3.4, sec: 'village', note: 'LEFT 4' },
  { len:  44, turn: -100, rise:  -2, w: 3.2, sec: 'village', note: 'LEFT 2 SQUARE, THEN OUT' },
  { len: 100, turn:   20, rise:  -3, w: 4.0, sec: 'village', note: 'RIGHT 5, OUT OF THE VILLAGE' },

  // ---- THE GORGE ----------------------------------------------------------
  // Linked corners with rock either side. There is no run-off and no time to reset
  // between them, so a corner you enter wrong stays wrong for the next four.
  { len:  70, turn:  -38, rise:  -4, w: 3.6, sec: 'gorge', note: 'LEFT 4 INTO THE GORGE — NARROWS' },
  { len:  55, turn:   46, rise:  -3, w: 3.4, sec: 'gorge', note: 'RIGHT 3' },
  { len:  50, turn:  -50, rise:  -2, w: 3.4, sec: 'gorge', note: 'LEFT 3' },
  { len:  48, turn:   54, rise:   0, w: 3.4, sec: 'gorge', note: 'RIGHT 3' },
  { len:  46, turn:  -56, rise:   0, w: 3.4, sec: 'gorge', note: 'LEFT 3 — KEEP THE RHYTHM' },
  { len:  52, turn:  -44, rise:   0, w: 3.4, sec: 'gorge', note: '...TIGHTENS' },
  { len:  58, turn:   62, rise:  -2, w: 3.4, sec: 'gorge', note: 'RIGHT 2 OVER WATER' },
  { len:  54, turn:   48, rise:  -2, w: 3.4, sec: 'gorge', note: 'RIGHT 3' },
  { len:  50, turn:  -52, rise:  -2, w: 3.2, sec: 'gorge', note: 'LEFT 3 — NARROWEST POINT' },
  { len:  62, turn:   36, rise:   0, w: 3.4, sec: 'gorge', note: 'RIGHT 4' },
  { len:  70, turn:  -30, rise:   2, w: 3.6, sec: 'gorge', note: 'LEFT 4 LONG, ROCK ON THE RIGHT' },
  { len:  60, turn:   40, rise:   2, w: 3.6, sec: 'gorge', note: 'RIGHT 4' },
  { len:  90, turn:    0, rise:   0, w: 3.8, sec: 'gorge', note: 'BRIDGE — 90, DONT TOUCH THE EDGE' },
  { len:  65, turn:  -88, rise:   3, w: 3.6, sec: 'gorge', note: 'LEFT 2 OFF THE BRIDGE' },
  { len:  80, turn:   34, rise:   4, w: 4.0, sec: 'gorge', note: 'RIGHT 4 CLIMBING' },
  { len:  55, turn:  -66, rise:   3, w: 3.8, sec: 'gorge', note: 'LEFT 2' },
  { len:  75, turn:   30, rise:   5, w: 4.0, sec: 'gorge', note: 'RIGHT 4, OUT OF THE DARK' },

  // ---- THE CLIMB ----------------------------------------------------------
  // Four hairpins stacked up a mountainside, with a long fast corner between each
  // pair so you never get into a rhythm. Everything you've learned, uphill.
  { len: 110, turn:    0, rise:  10, w: 4.4, sec: 'climb', note: 'STRAIGHT, CLIMBING HARD' },
  { len:  60, turn: -150, rise:   6, w: 4.2, sec: 'climb', note: 'HAIRPIN LEFT 1' },
  { len:  95, turn:   16, rise:   9, w: 4.4, sec: 'climb', note: 'RIGHT 6 UPHILL' },
  { len:  58, turn:  145, rise:   6, w: 4.2, sec: 'climb', note: 'HAIRPIN RIGHT 1' },
  { len: 100, turn:  -20, rise:   9, w: 4.4, sec: 'climb', note: 'LEFT 5 STILL CLIMBING' },
  { len:  62, turn: -142, rise:   5, w: 4.2, sec: 'climb', note: 'HAIRPIN LEFT 1 — NOTHING ON THE OUTSIDE' },
  { len: 120, turn:   26, rise:   8, w: 4.6, sec: 'climb', note: 'RIGHT 5 LONG' },
  { len: 105, turn:  -18, rise:   8, w: 4.4, sec: 'climb', note: 'LEFT 5, ROAD FALLS AWAY' },
  { len:  58, turn:  148, rise:   5, w: 4.0, sec: 'climb', note: 'HAIRPIN RIGHT 1' },
  { len:  88, turn:  -14, rise:   7, w: 4.4, sec: 'climb', note: 'LEFT 6' },
  { len:  56, turn:  152, rise:   4, w: 4.0, sec: 'climb', note: 'HAIRPIN RIGHT 1 — LAST ONE' },
  { len: 140, turn:  -24, rise:   7, w: 4.8, sec: 'climb', note: 'LEFT 5 TO THE TOP' },
  { len:  90, turn:    0, rise:   3, w: 5.0, sec: 'climb', note: 'STRAIGHT 90, OVER THE TOP' },

  // ---- THE PLATEAU --------------------------------------------------------
  // The reward for the climb: flat, wide, and the throttle stays where it is. The
  // big jump is at the end of the longest straight on the stage.
  { len: 200, turn:    0, rise:  -2, w: 5.6, sec: 'plateau', note: 'FLAT OUT 200 — THE PLATEAU' },
  { len: 160, turn:  -22, rise:   0, w: 5.6, sec: 'plateau', note: 'LEFT 6, DONT LIFT' },
  { len: 170, turn:   26, rise:   0, w: 5.6, sec: 'plateau', note: 'RIGHT 6' },
  { len: 140, turn:    0, rise:   0, w: 5.6, sec: 'plateau', note: 'STRAIGHT 140' },
  { len: 120, turn:  -40, rise:  -2, w: 5.2, sec: 'plateau', note: 'LEFT 5 LONG' },
  { len: 150, turn:    0, rise:   0, w: 5.6, sec: 'plateau', note: 'STRAIGHT 150 — BIG ONE COMING' },
  { len:  55, turn:    0, rise:  12, w: 5.6, sec: 'plateau', note: 'CREST' },
  { len:  45, turn:    0, rise: -21, w: 6.0, sec: 'plateau', note: 'CAUTION — BIG JUMP, LAND STRAIGHT' },
  { len: 110, turn:    0, rise:  -8, w: 5.6, sec: 'plateau', note: 'LANDING, DONT CUT' },
  { len: 130, turn:   34, rise:  -3, w: 5.2, sec: 'plateau', note: 'RIGHT 5 LONG' },
  { len: 110, turn:  -38, rise:  -2, w: 5.0, sec: 'plateau', note: 'LEFT 5' },

  // ---- THE DESCENT --------------------------------------------------------
  // Downhill, so the car arrives at everything faster than you expect, and half of
  // it is over a crest you can't see past. This is the section that's only possible
  // if you actually listen to the notes.
  { len:  95, turn:    0, rise:  -9, w: 5.0, sec: 'descent', note: 'DOWNHILL, BLIND 95' },
  { len:  80, turn:   50, rise:  -7, w: 4.8, sec: 'descent', note: 'RIGHT 4 OVER CREST' },
  { len:  70, turn:  -46, rise:  -6, w: 4.6, sec: 'descent', note: 'LEFT 3' },
  { len: 110, turn:   28, rise:  -8, w: 4.8, sec: 'descent', note: 'RIGHT 5 DOWNHILL' },
  { len:  60, turn:  -86, rise:  -4, w: 4.4, sec: 'descent', note: 'LEFT 2 — SLOW IT DOWN' },
  { len: 130, turn:   22, rise:  -6, w: 5.0, sec: 'descent', note: 'RIGHT 6 LONG' },
  { len:  75, turn:  -54, rise:  -3, w: 4.6, sec: 'descent', note: 'LEFT 3' },
  { len:  90, turn:   44, rise:  -4, w: 4.8, sec: 'descent', note: 'RIGHT 4' },
  { len:  65, turn:    0, rise:   5, w: 5.0, sec: 'descent', note: 'CREST 65 — CAUTION' },
  { len:  70, turn:    0, rise:  -7, w: 5.0, sec: 'descent', note: 'JUMP, THEN LEFT' },
  { len:  85, turn:  -58, rise:  -2, w: 4.6, sec: 'descent', note: 'LEFT 3 ON LANDING' },
  { len: 120, turn:   36, rise:  -3, w: 5.0, sec: 'descent', note: 'RIGHT 5 LONG' },
  { len: 100, turn:  -30, rise:   0, w: 5.2, sec: 'descent', note: 'LEFT 5 — LAST CORNER' },
  { len: 180, turn:    0, rise:   0, w: 5.6, sec: 'descent', note: 'FLAT TO FINISH' },
];

const STEP = 2.0;           // centreline sample spacing, metres
const VERGE = 13;           // how far the shaped ground extends past the road edge
// Beyond the verge the hillside keeps falling, all the way to a valley floor under the
// whole stage. This stage climbs 114m, so a single flat ground plane no longer works:
// on the plateau the road would hang in the air with the world 120m below it. The skirt
// is what closes that gap, and it's why you can see down off the side of the mountain.
const SKIRT = 110;          // how far out the hillside runs before the valley floor
const FLOOR_BELOW = 6;      // how far the valley floor sits under the lowest road

export class Stage {
  constructor() {
    this.samples = [];
    this._build();
    this.length = this.samples[this.samples.length - 1].dist;
    this.sections = this._sections();
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

  // Runs of segments that share a section, as { key, start, end } in metres. This is
  // what js/atmos.js crossfades across, so it's also what makes the world change.
  _sections() {
    const out = [];
    SEGMENTS.forEach((seg, si) => {
      const key = seg.sec || 'dawn';
      const start = this.segStartDist(si);
      const end = si + 1 < SEGMENTS.length ? this.segStartDist(si + 1) : this.length;
      if (out.length && out[out.length - 1].key === key) out[out.length - 1].end = end;
      else out.push({ key, start, end });
    });
    return out;
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

const CHUNK = 120;          // samples per chunk — 240m

// What grows beside the road, per section. This is most of what stops five minutes of
// gravel feeling like the same forty metres on a loop.
//   tree  { every, near, far, h, r }  cones — every Nth sample, N..M metres out
//   wall  { every, h, gap, w }        slabs hard against the verge (village, gorge)
//   mono  { every, h, out, w }        big broken blocks, far out (ruins, climb)
const PROPS = {
  dawn:    { tree: { every: 7, near: 16, far: 46, h: 8.5, r: 2.4 }, tuft: 3, stone: 2 },
  pines:   { tree: { every: 2, near: 2.5, far: 17, h: 14.0, r: 2.1 }, tuft: 3, stone: 2 },
  ruins:   { tree: { every: 12, near: 22, far: 60, h: 9.0, r: 3.0 },
             mono: { every: 11, h: 26, out: 26, w: 5.0 }, tuft: 2, stone: 2 },
  village: { wall: { every: 3, h: 5.5, gap: 1.4, w: 3.2 }, tuft: 1, stone: 2 },
  gorge:   { wall: { every: 2, h: 17, gap: 0.7, w: 5.0 }, tuft: 1, stone: 3 },
  climb:   { tree: { every: 9, near: 9, far: 26, h: 7.0, r: 1.8 },
             mono: { every: 17, h: 14, out: 19, w: 3.4 }, tuft: 3, stone: 3 },
  plateau: { tuft: 4, stone: 3 },
  descent: { tree: { every: 4, near: 7, far: 28, h: 10.5, r: 2.3 }, tuft: 3, stone: 2 },
};

export function buildStageMesh(THREE, stage) {
  const group = new THREE.Group();
  const S = stage.samples;

  // Per-sample palette, blended exactly the way the fog is, so the ground and the air
  // arrive at the new place together.
  const pal = S.map(s => atmosAt(stage.sections, s.dist).ground);
  const col = new THREE.Color();
  const hex = h => { col.setHex(h); return [col.r, col.g, col.b]; };

  // The valley floor: one plane under the entire stage, at the lowest point it reaches.
  // The skirt below runs down to meet it, so there is never a hole and never a lip.
  let minY = Infinity, cx = 0, cz = 0;
  for (const s of S) { minY = Math.min(minY, s.y); cx += s.x; cz += s.z; }
  const FLOOR = minY - FLOOR_BELOW;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12000, 12000),
    new THREE.MeshLambertMaterial({ color: 0x55603f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cx / S.length, FLOOR - 0.4, cz / S.length);
  group.add(ground);

  // The ribbons carry a real per-vertex colour attribute, so they want vertexColors.
  // The props do NOT: they're instanced, and their colour arrives through instanceColor,
  // which three multiplies in on its own. Setting vertexColors on them makes the shader
  // read a `color` attribute that a BoxGeometry has never had — WebGL hands it (0,0,0)
  // and every tree, wall and stone renders pure black.
  const roadMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const propMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

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
    const strip = () => ({ pos: [], col: [], idx: [] });
    const road = strip(), verge = strip(), skirt = strip(), rut = strip(), scar = strip();

    const push = (t, x, y, z, rgb) => {
      t.pos.push(x, y, z);
      t.col.push(rgb[0], rgb[1], rgb[2]);
    };

    for (let i = c0; i <= c1; i++) {
      const s = S[i], p = pal[i];
      const rx = Math.cos(s.head), rz = -Math.sin(s.head);
      const cr = hex(p.road), cv = hex(p.verge);

      push(road, s.x - rx * s.w, s.y + 0.02, s.z - rz * s.w, cr);
      push(road, s.x + rx * s.w, s.y + 0.02, s.z + rz * s.w, cr);

      const vw = s.w + VERGE;
      const drop = Math.min(2.6, VERGE * 0.30);
      push(verge, s.x - rx * vw, s.y - drop, s.z - rz * vw, cv);
      push(verge, s.x + rx * vw, s.y - drop, s.z + rz * vw, cv);

      // The hillside, from the verge edge down to the valley floor. THREE rings, and
      // the middle one only takes 15% of the drop across 30% of the run, so the ground
      // banks away gently first and only then falls off properly — a small excursion
      // should look like a bank, not the edge of a table.
      const cf = hex(p.floor);
      const vergeY = s.y - drop;
      const midY = vergeY - (vergeY - FLOOR) * 0.15;
      const rings = [[vw, vergeY], [vw + SKIRT * 0.30, midY], [vw + SKIRT, FLOOR]];
      for (const [wOut, yOut] of rings) {
        push(skirt, s.x - rx * wOut, yOut, s.z - rz * wOut, cf);
        push(skirt, s.x + rx * wOut, yOut, s.z + rz * wOut, cf);
      }

      if (i > c0) {
        const k = i - c0;
        const a = (k - 1) * 2, b = a + 1, cc = k * 2, d = cc + 1;
        road.idx.push(a, cc, b, b, cc, d);
        verge.idx.push(a, cc, b, b, cc, d);
        // Six skirt vertices per sample — verge/mid/floor ring, left and right — laid
        // out as [Lv Rv Lm Rm Lf Rf]. Four bands: each side's verge->mid and mid->floor.
        // The pairs are ordered so every quad winds the same way the road does (the
        // left side runs "outward" in -r, so its outer vertex comes first), otherwise
        // half the hillside faces down and is lit from underneath.
        const q0 = (k - 1) * 6, q1 = k * 6;
        for (const [u, v] of [[2, 0], [4, 2], [1, 3], [3, 5]]) {
          skirt.idx.push(q0 + u, q1 + u, q0 + v, q0 + v, q1 + u, q1 + v);
        }
      }
    }

    // Wheel ruts. DASHED, not continuous — a solid line running the way you're
    // travelling barely appears to move, which is the worst motion cue there is.
    const RUT_OFF = 0.78, RUT_W = 0.19;
    let rq = 0;
    for (let i = c0; i + 3 <= c1; i += 5) {              // 6m dash, 4m gap
      const cRut = hex(pal[i].rut);
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const s = S[i + k];
          const rx = Math.cos(s.head), rz = -Math.sin(s.head);
          const a0 = RUT_OFF * side - RUT_W, a1 = RUT_OFF * side + RUT_W;
          push(rut, s.x + rx * a0, s.y + 0.035, s.z + rz * a0, cRut);
          push(rut, s.x + rx * a1, s.y + 0.035, s.z + rz * a1, cRut);
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
      const cS = hex(pal[i].scar);
      const r0x = Math.cos(s0.head), r0z = -Math.sin(s0.head);
      const r1x = Math.cos(s1.head), r1z = -Math.sin(s1.head);
      const off = ((j % 11) - 5) * 0.42;                  // wander across the road
      const half = 0.9 + (j % 5) * 0.45;
      push(scar, s0.x + r0x * (off - half), s0.y + 0.045, s0.z + r0z * (off - half), cS);
      push(scar, s0.x + r0x * (off + half), s0.y + 0.045, s0.z + r0z * (off + half), cS);
      push(scar, s1.x + r1x * (off - half), s1.y + 0.045, s1.z + r1z * (off - half), cS);
      push(scar, s1.x + r1x * (off + half), s1.y + 0.045, s1.z + r1z * (off + half), cS);
      const b = sc * 4;
      scar.idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      sc++;
    }

    for (const t of [skirt, verge, road, rut, scar]) {
      if (!t.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(t.col, 3));
      g.setIndex(t.idx);
      g.computeVertexNormals();
      chunk.add(new THREE.Mesh(g, roadMat));
    }

    // --- props ---------------------------------------------------------------
    // Counted first, then filled, so each InstancedMesh is exactly the right size.
    const jobs = { tree: [], post: [], tuft: [], stone: [], slab: [] };

    for (let i = c0; i <= c1; i++) {
      const s = S[i], p = pal[i];
      const P = PROPS[stage.sectionAt(s.dist)] || PROPS.dawn;
      const rx = Math.cos(s.head), rz = -Math.sin(s.head);

      // edge posts, so you can read where the road goes in first person
      if (i % 4 === 0) {
        for (const side of [-1, 1]) {
          jobs.post.push({ x: s.x + rx * (s.w + 0.7) * side, y: s.y + 0.55,
                           z: s.z + rz * (s.w + 0.7) * side, c: p.post });
        }
      }

      // grass tufts right at the road edge. Flow is dominated by whatever is nearest,
      // so these are the single biggest thing making it feel fast.
      for (const side of [-1, 1]) {
        for (let k = 0; k < (P.tuft || 3); k++) {
          const j = (i * 31 + k * 17 + (side > 0 ? 13 : 0)) % 19;
          const d = s.w + 0.35 + k * 0.75 + j * 0.09;
          jobs.tuft.push({ x: s.x + rx * d * side, y: s.y - 0.12 - (j % 4) * 0.03,
                           z: s.z + rz * d * side, c: p.tuft });
        }
        for (let k = 0; k < (P.stone || 2); k++) {
          const j = (i * 53 + k * 23 + (side > 0 ? 29 : 7)) % 23;
          const d = s.w + 0.25 + j * 0.11;
          jobs.stone.push({ x: s.x + rx * d * side, y: s.y - 0.05 - (j % 3) * 0.02,
                            z: s.z + rz * d * side, c: p.stone });
        }
      }

      if (P.tree && i % P.tree.every === 0) {
        for (const side of [-1, 1]) {
          const j = (i * 37 + (side > 0 ? 11 : 0)) % 17;
          const t = j / 17;
          const d = s.w + P.tree.near + t * (P.tree.far - P.tree.near);
          const h = P.tree.h * (0.72 + (j % 5) * 0.13);
          jobs.tree.push({ x: s.x + rx * d * side, y: s.y - 2.0, z: s.z + rz * d * side,
                           h, r: P.tree.r * (0.8 + (j % 3) * 0.16), c: p.tree });
        }
      }

      // Walls: slabs hard against the verge. In the village they're houses, in the
      // gorge they're the rock — same primitive, different height and colour.
      if (P.wall && i % P.wall.every === 0) {
        for (const side of [-1, 1]) {
          const j = (i * 43 + (side > 0 ? 19 : 3)) % 13;
          const h = P.wall.h * (0.70 + (j % 6) * 0.10);
          const d = s.w + P.wall.gap + P.wall.w * 0.5;
          // Each building gets its own shade of the same material. Two hex values would
          // read as two kinds of house; a scale on one reads as weathering.
          jobs.slab.push({ x: s.x + rx * d * side, y: s.y - 0.4 + h * 0.5,
                           z: s.z + rz * d * side, head: s.head,
                           sx: P.wall.w, sy: h, sz: 2.0 + (j % 4) * 1.4,
                           c: p.wall, shade: 0.74 + (j % 6) * 0.09 });
        }
      }

      // Monoliths: whatever this place used to be, still standing, a long way back.
      if (P.mono && i % P.mono.every === 0) {
        const side = ((i / P.mono.every) | 0) % 2 ? 1 : -1;
        const j = (i * 29) % 19;
        const h = P.mono.h * (0.55 + (j % 7) * 0.12);
        const d = s.w + P.mono.out + (j % 5) * 4.5;
        jobs.slab.push({ x: s.x + rx * d * side, y: s.y - 1.5 + h * 0.5,
                         z: s.z + rz * d * side, head: s.head + (j % 5) * 0.19,
                         sx: P.mono.w, sy: h, sz: P.mono.w * (0.6 + (j % 3) * 0.3),
                         c: p.stone, shade: 0.68 + (j % 5) * 0.10 });
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
      q.setFromAxisAngle(UP, -o.head);
      m.compose(pos, q, scl);
    });

    group.add(chunk);
  }

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
