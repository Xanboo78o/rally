// materials.js — the SLOT MACHINE.
//
// Rolling a world does not generate a track. It generates a PLACE to go and look at:
// what the ground is made of, and a handful of words about it. The layout stays hand
// drawn — that rule doesn't move — but staring at an empty grid asking "what should
// this month be" is the hard part, and a machine is genuinely good at that bit.
//
// The tags are not decoration. They drive things:
//   form tags   the shape of the land        ridged / mesa / terraced / dunes / flats
//   grip tags   how the car behaves          loose / hard / slick / sticky / dust
//   light tags  the sky and the grade        bright / dark / blinding / hot / cold
//   age tags    how sharp the land is        young / worn / ancient
//
// And a material is only FOUR COLOURS — rock, dust, growth, sky. Everything atmos.js
// wants is derived from those, so changing one moves the whole place together instead
// of leaving eleven hexes to hand-reconcile.

const mix = (a, b, t) => {
  const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255;
  const br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
  return ((ar + (br - ar) * t) & 255) << 16 | ((ag + (bg - ag) * t) & 255) << 8 | ((ab + (bb - ab) * t) & 255);
};
const shade = (c, k) => {
  const r = Math.min(255, (c >> 16 & 255) * k) | 0;
  const g = Math.min(255, (c >> 8 & 255) * k) | 0;
  const b = Math.min(255, (c & 255) * k) | 0;
  return r << 16 | g << 8 | b;
};

// rock, dust, growth, sky — and the words.
export const MATERIALS = [
  { name: 'BASALT',       rock: 0x2b2b30, dust: 0x6b6259, growth: 0x3a4a33, sky: 0x9aa3ad,
    tags: ['volcanic', 'young', 'glassy', 'hard', 'dark'], forms: ['ridged', 'mesa'] },
  { name: 'SCORIA',       rock: 0x5a2f26, dust: 0x8f5b42, growth: 0x4b4a2c, sky: 0xc09a80,
    tags: ['cinder', 'young', 'loose', 'light', 'hot'], forms: ['ridged', 'cratered'] },
  { name: 'LATERITE',     rock: 0x8a4a2a, dust: 0xb5713c, growth: 0x6b7038, sky: 0xd9b98c,
    tags: ['iron', 'baked', 'dust', 'worn', 'hot'], forms: ['rolling', 'mesa'] },
  { name: 'CHALK',        rock: 0xd8d2c4, dust: 0xcfc6b0, growth: 0x7f8a4e, sky: 0xb9c8d6,
    tags: ['soft', 'ancient', 'dust', 'bright'], forms: ['rolling', 'terraced'] },
  { name: 'GRANITE',      rock: 0x8b8778, dust: 0x9a9384, growth: 0x3f5236, sky: 0xa8bccb,
    tags: ['ancient', 'hard', 'boulders', 'worn'], forms: ['ridged', 'rolling'] },
  { name: 'SHALE',        rock: 0x4e5450, dust: 0x6e6f63, growth: 0x4a5a3a, sky: 0x93a1a6,
    tags: ['layered', 'brittle', 'loose', 'worn'], forms: ['terraced', 'ridged'] },
  { name: 'LOESS',        rock: 0xc0a878, dust: 0xd4bd8e, growth: 0x8a8a4a, sky: 0xd6c8a4,
    tags: ['wind-blown', 'soft', 'dust', 'bright'], forms: ['terraced', 'dunes'] },
  { name: 'SERPENTINE',   rock: 0x3d5a48, dust: 0x5e6f52, growth: 0x2f4a30, sky: 0x8fa89a,
    tags: ['slick', 'wet', 'ancient', 'dark'], forms: ['rolling', 'ridged'] },
  { name: 'GYPSUM',       rock: 0xe6e2d6, dust: 0xece8dc, growth: 0x9aa06a, sky: 0xcfdae6,
    tags: ['crystalline', 'blinding', 'soft', 'bright'], forms: ['flats', 'dunes'] },
  { name: 'HALITE',       rock: 0xeceae4, dust: 0xdad7cc, growth: 0x8f9a72, sky: 0xd2dde8,
    tags: ['salt', 'cracked', 'hard', 'blinding', 'hot'], forms: ['flats'] },
  { name: 'TILL',         rock: 0x6f6a5c, dust: 0x7d7362, growth: 0x46603a, sky: 0x8f9ba6,
    tags: ['glacial', 'damp', 'sticky', 'boulders', 'cold'], forms: ['rolling', 'cratered'] },
  { name: 'IRONSTONE',    rock: 0x6e3a24, dust: 0x94603a, growth: 0x55572f, sky: 0xbfa88c,
    tags: ['rust', 'magnetic', 'hard', 'ancient'], forms: ['ridged', 'mesa'] },
  { name: 'TUFF',         rock: 0xb0a68e, dust: 0xc4b89c, growth: 0x6f7a44, sky: 0xc9cdbe,
    tags: ['ash', 'carved', 'soft', 'worn'], forms: ['mesa', 'terraced'] },
  { name: 'ANORTHOSITE',  rock: 0xc6c6c2, dust: 0xa9a9a4, growth: 0x707064, sky: 0x6b7686,
    tags: ['dead', 'ancient', 'cold', 'dust'], forms: ['cratered', 'flats'] },
  { name: 'OBSIDIAN',     rock: 0x1d1c22, dust: 0x4a4650, growth: 0x2e3a2c, sky: 0x7d7f8c,
    tags: ['glass', 'sharp', 'young', 'slick', 'dark'], forms: ['mesa', 'ridged'] },
  { name: 'PERMAFROST',   rock: 0x7a7f80, dust: 0x9aa0a0, growth: 0x4a5a4a, sky: 0xc2d2dc,
    tags: ['frozen', 'slick', 'cold', 'sticky'], forms: ['rolling', 'flats'] },
];

// A little deterministic generator, so a seed is the whole world.
//
// The seed gets stirred before anything comes out, and the first few draws are thrown
// away. Feeding xorshift a small integer straight is what made seeds 1, 7, 42 and 99
// all roll BASALT: consecutive small seeds differ in one or two bits, and xorshift
// takes several rounds to spread those across the word.
function rng(seed) {
  let s = ((seed | 0) || 1) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x7feb352d) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x846ca68b) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0 || 1;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < 6; i++) next();
  return next;
}

const has = (tags, ...w) => w.some(t => tags.includes(t));

// ---------------------------------------------------------------------------
// The roll. Seed in, PLACE out — the material, the land's numbers, a full atmos entry
// and how the car behaves on it. Everything is a starting point; every field is meant
// to be overwritten by hand the moment he disagrees with it.
// ---------------------------------------------------------------------------
export function rollPlace(seed) {
  const r = rng(seed);
  const m = MATERIALS[Math.floor(r() * MATERIALS.length) % MATERIALS.length];
  const form = m.forms[Math.floor(r() * m.forms.length) % m.forms.length];
  const t = m.tags;

  // How sharp the land is, and how big. Age decides the octaves and the warp: a young
  // range is all detail and bent ridgelines, an ancient one has been rounded off.
  const young = has(t, 'young', 'sharp');
  const old = has(t, 'ancient', 'worn', 'dead');
  const relief = Math.round((form === 'flats' ? 45 : form === 'dunes' ? 130 : 240)
    * (young ? 1.35 : old ? 0.78 : 1) * (0.8 + r() * 0.5));
  const terrain = {
    seed, form, relief,
    scale: Math.round((form === 'dunes' ? 520 : 780) * (0.75 + r() * 0.7)),
    oct: young ? 7 : old ? 5 : 6,
    warp: +( (young ? 0.55 : old ? 0.22 : 0.38) * (0.7 + r() * 0.7) ).toFixed(2),
    grain: +(r() * Math.PI).toFixed(2),
  };

  // The palette, all of it, out of four colours.
  const { rock, dust, growth, sky } = m;
  const ground = {
    road: shade(dust, 1.05), verge: mix(growth, dust, 0.42), rut: shade(dust, 0.78),
    scar: mix(rock, dust, 0.55), tuft: growth, tree: shade(growth, 0.62),
    stone: rock, post: mix(0xffffff, sky, 0.25), wall: shade(mix(rock, dust, 0.5), 1.08),
    floor: mix(growth, rock, 0.45),
  };

  // Light and grade, straight off the light tags.
  const dark = has(t, 'dark'), blind = has(t, 'blinding', 'bright');
  const cold = has(t, 'cold', 'frozen'), hot = has(t, 'hot');
  const look = {
    exposure: +(blind ? 1.12 : dark ? 0.9 : 1.0).toFixed(2),
    tint: cold ? [0.94, 0.99, 1.08] : hot ? [1.07, 1.0, 0.9] : [1.0, 1.0, 1.0],
    lift: dark ? [0.008, 0.012, 0.018] : [0.024, 0.024, 0.026],
    sat: +(blind ? 0.8 : dark ? 0.86 : 0.95).toFixed(2),
    con: +(dark ? 1.14 : 1.03).toFixed(2),
    vig: +(dark ? 0.5 : 0.28).toFixed(2),
    grain: 0.035,
    haze: 0.6, hazeNear: 90, hazeFar: 560,
    heat: hot ? 0.28 : 0,
  };

  const atmos = {
    name: m.name, sky,
    fog: dark ? [40, 320] : blind ? [180, 1100] : [90, 700],
    sun: { color: cold ? 0xe6f0ff : hot ? 0xffe0a8 : 0xfff2dd,
           int: +(blind ? 1.35 : dark ? 0.7 : 1.05).toFixed(2),
           pos: [-120 + Math.round(r() * 240), 90 + Math.round(r() * 90), -40 + Math.round(r() * 160)] },
    hemi: { sky, ground: ground.floor, int: +(dark ? 0.75 : 1.0).toFixed(2) },
    ground, look,
    // How big the place sounds. Flats are enormous and dead; a ridged world has
    // something to bounce off in every direction.
    sound: { space: form === 'flats' ? 0.06 : 0.24, size: form === 'flats' ? 0.012 : 0.05,
             decay: form === 'flats' ? 0.18 : 0.45, tone: dark ? 1600 : 2500,
             dark: dark ? 5200 : 8600, air: 1.0 },
  };

  // What it's like under the tyres. This is the half that makes two worlds different to
  // DRIVE rather than only to look at — the point of a world tour.
  const surface = {
    grip: +(has(t, 'slick', 'glassy', 'frozen') ? 0.72
          : has(t, 'loose', 'brittle', 'cinder') ? 0.85
          : has(t, 'hard', 'crystalline') ? 1.12 : 1.0).toFixed(2),
    drag: +(has(t, 'sticky', 'damp', 'soft') ? 1.2 : 1.0).toFixed(2),
    dust: +(has(t, 'dust', 'ash', 'wind-blown') ? 1.6 : has(t, 'wet', 'damp', 'frozen') ? 0.25 : 1.0).toFixed(2),
  };

  return { seed, material: m.name, tags: t, form, terrain, atmos, surface };
}
