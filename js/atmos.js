// atmos.js — the FILTERS. One table, and every entry is a PLACE: how it looks and how
// it sounds. Pure data plus a blend, no THREE import, so the node harness can read it.
//
// The stage drives this. Each segment names a section, the section names an entry here,
// and the blend below crossfades between them over the last stretch of road before the
// boundary — so the fog closes in as you enter the gorge and lifts as you climb out,
// deterministically, at the same metre every run.
//
// Three layers hang off it:
//   look.*   -> js/post.js       colour grade, distance haze/blur, heat shimmer, vignette
//   ground.* -> js/stage.js      the colour of the road, verge, trees and stones
//   sound.*  -> js/audio.js      how big the space is, how dark it is, how wide the wind
//
// Which is the point: "the gorge" is not a fog setting, it's a place with a sound.

export const ATMOS = {
  // ---- THE DROP ZONE — first light, wide open, everything still cold ----------
  dawn: {
    name: 'THE DROP ZONE',
    sky: 0xa8bccb,
    fog: [70, 640],
    sun: { color: 0xffe6c8, int: 1.05, pos: [-120, 90, 40] },
    hemi: { sky: 0xc3d8ea, ground: 0x3f4a37, int: 1.00 },
    ground: { road: 0x9a8b72, verge: 0x5c6b42, rut: 0x7a6a53, scar: 0x6f6049,
              tuft: 0x5f7040, tree: 0x33452b, stone: 0x8c8377, post: 0xdedad2, wall: 0x8a8272, floor: 0x4a5b39 },
    look: { exposure: 1.00, tint: [0.97, 1.00, 1.06], lift: [0.020, 0.024, 0.032],
            sat: 0.92, con: 1.04, vig: 0.30, grain: 0.030,
            haze: 0.55, hazeNear: 90, hazeFar: 520, heat: 0.0 },
    sound: { space: 0.10, size: 0.030, decay: 0.30, tone: 2600, dark: 9000, air: 1.00 },
  },

  // ---- THE PINES — close, dark and damp. The road is the only light ----------
  pines: {
    name: 'THE PINES',
    sky: 0x6f8073,
    fog: [30, 260],
    sun: { color: 0xdcecc8, int: 0.62, pos: [-60, 150, -30] },
    hemi: { sky: 0x8fa88c, ground: 0x22301c, int: 0.78 },
    ground: { road: 0x7d7360, verge: 0x3d4c2c, rut: 0x63594a, scar: 0x584d3d,
              tuft: 0x46592f, tree: 0x1d2c19, stone: 0x6f6a60, post: 0xc9c6bc, wall: 0x6b6354, floor: 0x2f3d25 },
    look: { exposure: 0.94, tint: [0.94, 1.02, 0.96], lift: [0.010, 0.016, 0.014],
            sat: 0.86, con: 1.12, vig: 0.52, grain: 0.045,
            haze: 0.70, hazeNear: 45, hazeFar: 250, heat: 0.0 },
    sound: { space: 0.16, size: 0.021, decay: 0.24, tone: 1500, dark: 5200, air: 0.72 },
  },

  // ---- THE OLD ROAD — gold, enormous, ancient, and nobody remembers who built it
  ruins: {
    name: 'THE OLD ROAD',
    sky: 0xd6c39a,
    fog: [110, 760],
    sun: { color: 0xffe0a8, int: 1.30, pos: [90, 120, 70] },
    hemi: { sky: 0xe8d8b4, ground: 0x59492f, int: 1.10 },
    ground: { road: 0xa8977a, verge: 0x77693f, rut: 0x8a7758, scar: 0x7c6a4d,
              tuft: 0x7d7a42, tree: 0x4a4a2c, stone: 0xa39779, post: 0xe6dcc4, wall: 0x9c8b68, floor: 0x6b5c38 },
    look: { exposure: 1.06, tint: [1.06, 1.00, 0.90], lift: [0.030, 0.026, 0.016],
            sat: 1.00, con: 1.02, vig: 0.26, grain: 0.038,
            haze: 0.62, hazeNear: 130, hazeFar: 720, heat: 0.18 },
    sound: { space: 0.22, size: 0.055, decay: 0.44, tone: 2400, dark: 8000, air: 1.05 },
  },

  // ---- THE VILLAGE — walls a metre off each door handle. Everything comes back
  village: {
    name: 'THE VILLAGE',
    sky: 0xbdb6a6,
    fog: [45, 340],
    sun: { color: 0xfff0d8, int: 1.00, pos: [40, 130, -80] },
    hemi: { sky: 0xd2cdbd, ground: 0x4b4436, int: 0.95 },
    ground: { road: 0x8f8879, verge: 0x6d6350, rut: 0x746d5e, scar: 0x6a6355,
              tuft: 0x6a6c45, tree: 0x3b4a2e, stone: 0x9b948a, post: 0xd8d2c6, wall: 0xa79a86, floor: 0x5f5849 },
    look: { exposure: 0.99, tint: [1.02, 1.00, 0.97], lift: [0.018, 0.018, 0.018],
            sat: 0.90, con: 1.08, vig: 0.44, grain: 0.040,
            haze: 0.50, hazeNear: 60, hazeFar: 330, heat: 0.0 },
    sound: { space: 0.34, size: 0.014, decay: 0.52, tone: 3400, dark: 7000, air: 0.60 },
  },

  // ---- THE GORGE — a slot in the rock. Dark, blue, and it answers you back ----
  gorge: {
    name: 'THE GORGE',
    sky: 0x4f5f74,
    fog: [22, 200],
    sun: { color: 0xbcd0ee, int: 0.48, pos: [-20, 200, 10] },
    hemi: { sky: 0x6d80a0, ground: 0x1d2430, int: 0.80 },
    ground: { road: 0x6c6a68, verge: 0x4a4a4e, rut: 0x585553, scar: 0x504e4c,
              tuft: 0x3c4a38, tree: 0x232c2a, stone: 0x74767a, post: 0xc0c6d0, wall: 0x5f6167, floor: 0x363b44 },
    look: { exposure: 0.90, tint: [0.90, 0.97, 1.12], lift: [0.014, 0.020, 0.034],
            sat: 0.78, con: 1.16, vig: 0.62, grain: 0.050,
            haze: 0.80, hazeNear: 30, hazeFar: 190, heat: 0.0 },
    sound: { space: 0.62, size: 0.090, decay: 0.76, tone: 1900, dark: 4200, air: 1.25 },
  },

  // ---- THE CLIMB — out of the dark, thin cold air, you can see for miles ------
  climb: {
    name: 'THE CLIMB',
    sky: 0xc8d8e6,
    fog: [200, 1400],
    sun: { color: 0xfff8ec, int: 1.35, pos: [-70, 170, 90] },
    hemi: { sky: 0xdcebf6, ground: 0x4a5344, int: 1.15 },
    ground: { road: 0x9c917e, verge: 0x66714c, rut: 0x7f7461, scar: 0x736853,
              tuft: 0x69784a, tree: 0x2c3d2a, stone: 0x9a958c, post: 0xf0ece2, wall: 0x8d887e, floor: 0x55603f },
    look: { exposure: 1.08, tint: [0.99, 1.00, 1.04], lift: [0.008, 0.010, 0.014],
            sat: 0.96, con: 1.06, vig: 0.24, grain: 0.026,
            haze: 0.42, hazeNear: 220, hazeFar: 1300, heat: 0.0 },
    sound: { space: 0.30, size: 0.130, decay: 0.58, tone: 2100, dark: 11000, air: 1.45 },
  },

  // ---- THE PLATEAU — flat, hot, and the horizon is boiling --------------------
  plateau: {
    name: 'THE PLATEAU',
    sky: 0xe0cfae,
    fog: [160, 900],
    sun: { color: 0xfff0c4, int: 1.45, pos: [30, 180, 110] },
    hemi: { sky: 0xf2e4c4, ground: 0x6a5c3c, int: 1.20 },
    ground: { road: 0xbcae8b, verge: 0x8d8253, rut: 0x998c69, scar: 0x8b7d5c,
              tuft: 0x8d8a4e, tree: 0x5a5836, stone: 0xb3a88c, post: 0xf6efdb, wall: 0xb0a488, floor: 0x7d7048 },
    look: { exposure: 1.10, tint: [1.08, 1.01, 0.88], lift: [0.034, 0.028, 0.014],
            sat: 0.98, con: 1.00, vig: 0.22, grain: 0.034,
            haze: 0.72, hazeNear: 120, hazeFar: 820, heat: 1.00 },
    sound: { space: 0.14, size: 0.150, decay: 0.34, tone: 1700, dark: 12000, air: 1.60 },
  },

  // ---- THE DESCENT — evening, warm, and it never stops falling ---------------
  descent: {
    name: 'THE DESCENT',
    sky: 0xc9a887,
    fog: [80, 620],
    sun: { color: 0xffc98a, int: 1.20, pos: [140, 55, -40] },
    hemi: { sky: 0xe3bd97, ground: 0x4a3b2c, int: 0.98 },
    ground: { road: 0x9c8a6e, verge: 0x655f3c, rut: 0x7d6d52, scar: 0x716048,
              tuft: 0x6b6a3c, tree: 0x35402a, stone: 0x958a78, post: 0xecd9bc, wall: 0x8f8270, floor: 0x565338 },
    look: { exposure: 1.02, tint: [1.10, 0.99, 0.86], lift: [0.036, 0.026, 0.018],
            sat: 1.02, con: 1.06, vig: 0.38, grain: 0.036,
            haze: 0.66, hazeNear: 95, hazeFar: 600, heat: 0.24 },
    sound: { space: 0.20, size: 0.070, decay: 0.42, tone: 2200, dark: 8600, air: 1.15 },
  },
};

export const ATMOS_KEYS = Object.keys(ATMOS);

// How much road the crossfade takes. Long on purpose: a place should arrive before you
// get there, so the fog is already closing in while you can still see the last corner.
export const BLEND = 150;

const lerp = (a, b, t) => a + (b - a) * t;
const lerpArr = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

// Hex colours blend per channel, which is the only way a fog colour can cross a
// boundary without stepping.
function lerpHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8)
          | Math.round(lerp(ab, bb, t)));
}

export function blendAtmos(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const o = { name: t < 0.5 ? a.name : b.name };
  o.sky = lerpHex(a.sky, b.sky, t);
  o.fog = [lerp(a.fog[0], b.fog[0], t), lerp(a.fog[1], b.fog[1], t)];
  o.sun = { color: lerpHex(a.sun.color, b.sun.color, t), int: lerp(a.sun.int, b.sun.int, t),
            pos: lerpArr(a.sun.pos, b.sun.pos, t) };
  o.hemi = { sky: lerpHex(a.hemi.sky, b.hemi.sky, t), ground: lerpHex(a.hemi.ground, b.hemi.ground, t),
             int: lerp(a.hemi.int, b.hemi.int, t) };
  o.ground = {};
  for (const k in a.ground) o.ground[k] = lerpHex(a.ground[k], b.ground[k], t);
  o.look = {};
  for (const k in a.look) {
    o.look[k] = Array.isArray(a.look[k]) ? lerpArr(a.look[k], b.look[k], t)
                                         : lerp(a.look[k], b.look[k], t);
  }
  o.sound = {};
  for (const k in a.sound) o.sound[k] = lerp(a.sound[k], b.sound[k], t);
  return o;
}

// Where you are, as a look and a sound. `sections` comes from the Stage: a list of
// { key, start, end } in metres along the road.
export function atmosAt(sections, dist) {
  if (!sections.length) return ATMOS.dawn;
  let i = 0;
  while (i < sections.length - 1 && dist >= sections[i].end) i++;
  const here = ATMOS[sections[i].key] || ATMOS.dawn;
  const next = sections[i + 1] && ATMOS[sections[i + 1].key];
  if (!next) return here;
  const into = dist - (sections[i].end - BLEND);
  if (into <= 0) return here;
  return blendAtmos(here, next, Math.min(1, into / BLEND));
}
