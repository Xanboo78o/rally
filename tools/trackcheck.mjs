// trackcheck.mjs — the gate for anything written in js/tracks.js.
//
//   node tools/trackcheck.mjs            every track
//   node tools/trackcheck.mjs bind       one of them
//
// Three things, and the first is the one that matters.
//
// 1. EVERY CORNER CALL AGAINST THE GEOMETRY. A note that says LEFT over a right-hander
//    is not a typo you will ever catch by driving, because you drive where the road is,
//    not where the voice says. That is exactly how all 105 notes on the original stage
//    stayed backwards until 2026-09-09. Positive turn is a LEFT-hander: the camera is
//    rotated by PI + yaw, which puts world +X on the driver's left, and the road's
//    lateral vector is the same (cos head, -sin head), so increasing head goes left.
//
// 2. EVERY NOTE AGAINST THE RECORDINGS. The co-driver is a fixed vocabulary of 129
//    clips; a note using a word he never said comes out as silence at 90mph.
//
// 3. Joins and shape — a section boundary that steps the road width, a corner with no
//    call at all, a landmark of a kind that doesn't exist.
import { TRACKS, trackSegments } from '../js/tracks.js';
import { Stage } from '../js/stage.js';
import { slugsFor } from '../js/voice.js';
import { readFileSync } from 'node:fs';

const HAVE = new Set(JSON.parse(readFileSync(new URL('../vo/manifest.json', import.meta.url))).map(c => c.slug));
const KINDS = new Set(['arch', 'bridge', 'banner', 'chevron', 'wreck', 'crowd', 'tree']);
const want = process.argv.slice(2);
let fail = 0;

for (const key of Object.keys(TRACKS)) {
  if (want.length && !want.includes(key)) continue;
  const segs = trackSegments(key);
  const stage = new Stage(segs);
  const bad = [];

  segs.forEach((s, i) => {
    // --- the corner call ---------------------------------------------------
    const m = s.note.match(/\bHAIRPIN (LEFT|RIGHT)\b|\b(LEFT|RIGHT) [1-6]\b/);
    // A note opening with "..." is a CONTINUATION — the corner was called on the segment
    // before and this is the same corner changing its mind ("...TIGHTENS"). It is not
    // missing a direction, it is deliberately not repeating one.
    const cont = s.note.trim().startsWith('...');
    if (s.turn && Math.abs(s.turn) >= 14 && !cont) {
      if (!m) bad.push(`seg ${i}: turn ${s.turn} has no corner call — "${s.note}"`);
      else {
        const says = m[1] || m[2], truth = s.turn > 0 ? 'LEFT' : 'RIGHT';
        if (says !== truth) bad.push(`seg ${i}: turn ${s.turn} goes ${truth}, note says ${says} — "${s.note}"`);
      }
    }
    // A hairpin call on a corner that isn't one, or the reverse.
    const hairpin = /HAIRPIN/.test(s.note);
    if (hairpin && Math.abs(s.turn) < 120) bad.push(`seg ${i}: called HAIRPIN but only ${s.turn} degrees`);
    if (!hairpin && Math.abs(s.turn) >= 130) bad.push(`seg ${i}: ${s.turn} degrees is a hairpin, not called one`);

    // --- can he actually say it? -------------------------------------------
    for (const slug of slugsFor(s.note)) {
      if (!HAVE.has(slug)) bad.push(`seg ${i}: no recording for "${slug}" — "${s.note}"`);
    }

    // --- landmarks ----------------------------------------------------------
    for (const mk of s.mark || []) {
      if (!KINDS.has(mk.k)) bad.push(`seg ${i}: landmark kind "${mk.k}" does not exist`);
      if (mk.t != null && (mk.t < 0 || mk.t > 1)) bad.push(`seg ${i}: landmark t=${mk.t} is off the segment`);
    }

    // --- joins --------------------------------------------------------------
    if (i && Math.abs(s.w - segs[i - 1].w) > 1.6)
      bad.push(`seg ${i}: road width steps ${segs[i - 1].w} -> ${s.w} in one join`);
  });

  const km = (stage.length / 1000).toFixed(2);
  const secs = [...new Set(segs.map(s => s.sec))].join(' + ');
  console.log(`${bad.length ? 'FAIL' : ' ok '} ${key.padEnd(10)} ${TRACKS[key].name.padEnd(16)} ${km} km  ${segs.length} segs  [${secs}]`);
  for (const b of bad) console.log('       ' + b);
  fail += bad.length;
}
if (fail) { console.log('\n' + fail + ' problem(s)'); process.exit(1); }
