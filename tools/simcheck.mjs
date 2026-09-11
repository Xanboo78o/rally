// simcheck.mjs — drives the stage with a crude autopilot so the numbers can be
// checked without a browser. I can't feel the car, so this is my substitute: does
// it get round, how fast, and does the jump actually launch?
//
//   node tools/simcheck.mjs [--v]

import { Stage } from '../js/stage.js';
import { CAR, carSeed } from '../js/car.js';

// SIM_TRACK picks the road to measure. The sections live in js/tracks.js now, so a
// "is this drivable" run can be pointed at any of them.
const TRACK = process.env.SIM_TRACK || 'full';
const { trackSegments, TRACKS } = await import('../js/tracks.js');
// What THIS track is for. See the `wants` note in js/tracks.js.
const WANTS = (TRACKS[TRACK] && TRACKS[TRACK].wants) || { time: [240, 400], jump: true, spread: 25 };
const SEGMENTS = trackSegments(TRACK);
let worstDamage = 0;
carSeed(Number(process.env.SIM_SEED || 20260910));   // reproducible runs
import { Car } from '../js/car.js';
import { Wheel } from '../js/wheel.js';

const VERBOSE = process.argv.includes('--v');
const FIXED = 1 / 120;

const angDiff = a => Math.atan2(Math.sin(a), Math.cos(a));
const fmt = t => Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60).toFixed(2);

function run(lookahead = 26, gain = 2.1, hbThresh = 0.42, from = 0, to = null) {
  const stage = new Stage(TRACK);
  const car = new Car();
  const wheel = new Wheel();

  // A run is a STRETCH of the road: the whole stage, or one section for a sprint.
  let i0 = 0;
  while (i0 < stage.samples.length - 1 && stage.samples[i0].dist < from) i0++;
  const finishAt = to == null ? stage.length - 6 : to;
  const s0 = stage.samples[i0];
  stage._hint = i0;
  car.x = s0.x; car.z = s0.z; car.y = s0.y; car.yaw = s0.head;

  let t = 0, hb = 0, stopped = 0;
  const flights = [];
  let air = null;
  let maxOff = 0, offTime = 0;
  const offSeg = {};
  const segSpeed = SEGMENTS.map(() => ({ sum: 0, n: 0 }));

  for (let i = 0; i < 120 * 600; i++) {
    const g = stage.sample(car.x, car.z);

    // Aim at a point down the road. The lookahead has to scale with speed — a fixed
    // 26m is only 0.6s of vision at 100mph, and the car simply drives off.
    const aheadM = Math.max(18, Math.min(75, 14 + car.speed * 0.95));
    const ai = Math.min(stage.samples.length - 1, g.index + Math.round(aheadM / 2));
    const a = stage.samples[ai];
    const want = Math.atan2(a.x - car.x, a.z - car.z);
    const err = angDiff(want - car.yaw);

    wheel.held = true;
    wheel.target = Math.max(-1, Math.min(1, -err * gain));   // negated: positive wheel = right = decreasing yaw

    // Brake for what's coming: estimate the lateral load the corner ahead will demand
    // and slow down if it's beyond grip. Without this it just carries speed into walls.
    const bi = Math.min(stage.samples.length - 1, g.index + Math.round(aheadM / 2) + 15);
    const curve = Math.abs(angDiff(stage.samples[bi].head - stage.samples[g.index].head));
    const arc = Math.max(6, (bi - g.index) * 2);
    const needLat = curve > 1e-4 ? (car.speed * car.speed) * (curve / arc) : 0;
    hb = (needLat > 9.0 || Math.abs(err) > hbThresh) && car.speed > 14 ? 1 : 0;

    wheel.update(FIXED, car.speedFactor);
    // The real surface under the car, the way main.js probes it — otherwise the harness
    // drives a different physics from the game and its verdicts mean nothing.
    {
      const L = 3.4, fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
      const rx = -Math.cos(car.yaw), rz = Math.sin(car.yaw);
      g.gradAlong = (stage.sample(car.x + fx * L, car.z + fz * L).height - g.height) / L;
      g.gradAcross = (stage.sample(car.x + rx * L, car.z + rz * L).height - g.height) / L;
      g.wall = g.gradAlong;
    }
    car.step(FIXED, wheel.pos, hb, g);
    if (!car.rolled) stage.collide(car, CAR.carRadius);
    if (car.damage > worstDamage) worstDamage = car.damage;
    t += FIXED;

    if (car.airborne) {
      if (!air) air = { start: t, dist: g.progress };
    } else if (air) {
      flights.push({ dur: t - air.start, at: Math.round(air.dist), hit: car.landingHit, tOff: air.start });
      air = null;
    }

    if (g.off > 0) {
      offTime += FIXED; maxOff = Math.max(maxOff, g.off);
      const e = offSeg[g.seg] || (offSeg[g.seg] = { t: 0, max: 0 });
      e.t += FIXED; e.max = Math.max(e.max, g.off);
    }
    const ss = segSpeed[g.seg];
    if (ss) { ss.sum += car.speed; ss.n++; }

    if (car.rolled) {
      return { ok: false, why: 'ROLLED at ' + Math.round(g.progress) + 'm', t, flights, offTime, maxOff, segSpeed, stage, len: stage.length, offSeg };
    }
    if (g.progress >= finishAt) {
      return { ok: true, t, flights, offTime, maxOff, segSpeed, stage, len: stage.length, offSeg };
    }
    // SUSTAINED slowness, not one tick of it. This fired the instant the car dipped
    // below 0.9mph, so a car that bumped a building, stopped for a fifth of a second and
    // drove on was reported as "stalled" for the rest of time — which is most of what
    // the village and gorge failures turned out to be.
    stopped = car.speed < 0.6 ? stopped + FIXED : 0;
    if (stopped > 2.0 && t > 6) {
      // Say WHY, not just where. "Stalled at 4320m" sent me hunting a wedge in the
      // gorge walls three times before the answer turned out to be somewhere else.
      const why = 'stalled at ' + Math.round(g.progress) + 'm'
        + ' [' + (car.rolled ? 'ON ITS ROOF' : 'upright')
        + ', ' + (car.speed * 2.237).toFixed(1) + 'mph'
        + ', ' + (g.off > 0 ? g.off.toFixed(1) + 'm off road' : 'on road')
        + ', damage ' + car.damage.toFixed(2)
        + ', ' + stage.solidsNear(car.x, car.z, 3).length + ' solids within 3m]';
      return { ok: false, why, t, flights, offTime, maxOff, segSpeed, stage, len: stage.length, offSeg };
    }
  }
  return { ok: false, why: 'never finished', t, flights, offTime, maxOff, segSpeed, stage, len: stage.length, offSeg };
}

// --sprint: how long is each section from a standing start? The daily is meant to be
// about a minute, and a person is roughly 1.3x the autopilot, so these want to land
// around 40-55s of autopilot time for that claim to be true.
if (process.argv.includes('--sprint')) {
  const st = new Stage(TRACK);
  console.log('THE DAILY — every section, from a standing start\n');
  console.log('  section      length   autopilot    a person, roughly');
  let bad = 0;
  for (const sec of st.sections) {
    const r = run(26, 2.1, 0.42, sec.start, sec.end);
    const human = r.t * 1.3;
    // 30-90s is the honest band for "a small little 1 min sprint" — the Drop Zone is
    // the quick one at ~36s and the Climb the long one at ~65s, and that spread is
    // variety rather than a fault.
    const okLen = r.ok && human > 30 && human < 90;
    if (!okLen) bad++;
    console.log('  ' + sec.key.padEnd(10)
      + String(Math.round(sec.end - sec.start)).padStart(6) + 'm'
      + (r.ok ? (r.t.toFixed(1) + 's').padStart(11) : 'DNF'.padStart(11))
      + (r.ok ? ('~' + human.toFixed(0) + 's').padStart(14) : ''.padStart(14))
      + (okLen ? '' : '   <-- ' + (r.ok ? 'off target' : r.why)));
  }
  console.log('\n  every section drivable from a stop  ' + (bad ? 'FAIL' : 'pass'));
  console.log('  every daily lands near a minute     ' + (bad ? 'FAIL' : 'pass'));
  process.exit(bad ? 1 : 0);
}

const r = run();
const stage = r.stage;

console.log('stage length   ', r.len.toFixed(0), 'm');
console.log('finished       ', r.ok ? 'YES' : 'NO  — ' + r.why);
console.log('stage time     ', fmt(r.t));
console.log('avg speed      ', (r.len / r.t * 2.237).toFixed(1), 'mph');
console.log('time off road  ', r.offTime.toFixed(2), 's   (max', r.maxOff.toFixed(1), 'm out)');
console.log('flights        ', r.flights.length);
for (const f of r.flights) {
  console.log('   ' + f.dur.toFixed(2) + 's airborne at ' + f.at + 'm (takeoff t=' + f.tOff.toFixed(2) + 's), landing hit ' + f.hit.toFixed(2));
}

// ---- per-section: is any part of the stage a slog, and does it vary? -----------
// A five-minute stage lives or dies on whether the pace keeps changing. Same speed
// for five minutes is the failure mode, and it doesn't show up in the total.
console.log('\nsections:');
const secTime = new Map();
for (const s of stage.sections) secTime.set(s.key, { d: s.end - s.start, t: 0, sum: 0, n: 0 });
SEGMENTS.forEach((seg, i) => {
  const q = r.segSpeed[i], e = secTime.get(seg.sec);
  if (q && e) { e.sum += q.sum; e.n += q.n; e.t += q.n * FIXED; }
});
for (const [k, e] of secTime) {
  const mph = e.n ? (e.sum / e.n * 2.237) : 0;
  console.log('  ' + k.padEnd(9) + String(Math.round(e.d)).padStart(5) + 'm  '
    + fmt(e.t).padStart(7) + '   ' + mph.toFixed(1).padStart(5) + ' mph');
}

if (VERBOSE) {
  console.log('\nper-segment average speed (mph):');
  SEGMENTS.forEach((s, i) => {
    const q = r.segSpeed[i];
    const mph = q.n ? (q.sum / q.n * 2.237).toFixed(1) : '--';
    console.log('  ' + String(i).padStart(2) + '  ' + String(mph).padStart(6) + '   ' + s.sec.padEnd(8) + ' ' + s.note);
  });
}

// ---- does the road cross itself? ----------------------------------------------
// Hand-authoring 8km by walking headings can quietly fold the stage back over its own
// path, and the symptom is horrible: stage.nearest() snaps to the wrong lap of the
// road, so the car teleports its progress and the ground height jumps. Cheap to check,
// impossible to spot by eye.
function crossings(minGapM = 260, tooCloseM = 45, sameHeightM = 12) {
  const S = stage.samples;
  const step = Math.round(minGapM / 2);
  const folds = [], stacks = [];
  for (let i = 0; i < S.length; i += 2) {
    for (let j = i + step; j < S.length; j += 2) {
      const h = Math.hypot(S[i].x - S[j].x, S[i].z - S[j].z);
      if (h >= tooCloseM) continue;
      const v = Math.abs(S[i].y - S[j].y);
      (v < sameHeightM ? folds : stacks).push({ a: S[i].dist, b: S[j].dist, h, v });
    }
  }
  folds.sort((p, q) => p.h - q.h);
  stacks.sort((p, q) => p.h - q.h);
  return { folds, stacks };
}
const cross = crossings();
// ---- is the ground one continuous surface? ------------------------------------
// The hillside is extruded sideways from the road, so wherever the road turns tighter
// than the hillside is wide, the inside of the corner folds back THROUGH itself, and
// overlapping coplanar ground z-fights and flickers the moment the camera moves. It is
// invisible in a screenshot and obvious in motion, which is exactly the kind of thing
// that needs a number rather than an eye.
{
  const S = stage.samples, K = 5, VERGE = 13;
  let folded = 0, worstOver = 0, maxStep = 0, minSpan = Infinity, maxSpan = 0;
  for (let i = K; i < S.length - K; i++) {
    const a = S[i - K], b = S[i + K];
    const dh = Math.atan2(Math.sin(b.head - a.head), Math.cos(b.head - a.head));
    const R = Math.abs(dh) < 1e-6 ? Infinity : Math.abs((b.dist - a.dist) / dh);
    const reach = S[i].w + VERGE + S[i].span;
    if (R < reach) { folded++; worstOver = Math.max(worstOver, reach - R); }
    maxStep = Math.max(maxStep, Math.abs(S[i].span - S[i - 1].span));
    minSpan = Math.min(minSpan, S[i].span);
    maxSpan = Math.max(maxSpan, S[i].span);
  }
  console.log('\nground');
  console.log('  hillside width   ' + minSpan.toFixed(0) + 'm .. ' + maxSpan.toFixed(0) + 'm');
  console.log('  widest step between samples 2m apart  ' + maxStep.toFixed(2) + 'm');
  console.log('  folds  ' + folded + ' samples, worst overlap ' + worstOver.toFixed(2) + 'm');
  global.__ground = { folded, worstOver, maxStep };
}

console.log('\nself-intersection');
if (!cross.folds.length) console.log('  no folds — nothing runs back over itself at the same height');
else {
  console.log('  ' + cross.folds.length + ' FOLDS (road over road, same height). Worst:');
  for (const c of cross.folds.slice(0, 6)) {
    console.log('    ' + Math.round(c.a) + 'm <-> ' + Math.round(c.b) + 'm   ' + c.h.toFixed(1) + 'm apart, only ' + c.v.toFixed(1) + 'm of height between them');
  }
}
// Stacked switchbacks are the POINT of a mountain climb, so they're reported, not failed.
if (cross.stacks.length) {
  const s0 = cross.stacks[0];
  console.log('  ' + cross.stacks.length + ' vertical stacks (fine — that\'s a switchback). Closest: '
    + Math.round(s0.a) + 'm passes ' + s0.v.toFixed(0) + 'm under ' + Math.round(s0.b) + 'm');
}

const big = r.flights.filter(f => f.dur > 0.5);
const spread = [...secTime.values()].map(e => e.n ? e.sum / e.n * 2.237 : 0);
const varied = Math.max(...spread) - Math.min(...spread);

console.log('\nVERDICT');
console.log('  drivable        ', r.ok ? 'pass' : 'FAIL');
// Length is judged against what the track is FOR, not against one number. THE FULL
// STAGE is the five-minute tour; everything else in js/tracks.js is a short one, and the
// daily wants to be about a minute and a half. Reporting a 1:38 sprint as "off target"
// was noise, and noise in a checker is how a real failure gets scrolled past.
const [lo, hi] = WANTS.time;
console.log('  length          ', r.t > lo && r.t < hi
  ? 'pass (' + fmt(r.t) + ')'
  : 'off target (' + fmt(r.t) + ', wants ' + fmt(lo) + '-' + fmt(hi) + ')');
console.log('  has a real jump ', WANTS.jump
  ? (big.length ? 'pass (' + big[0].dur.toFixed(2) + 's)' : 'FAIL — nothing over 0.5s')
  : (big.length ? 'pass (' + big[0].dur.toFixed(2) + 's — not required here)' : 'none, and none wanted'));
// As a FRACTION of stage time, not an absolute — the old 4s budget was written for a
// 37-second stage and means nothing on one seven times longer.
const offPct = r.offTime / r.t * 100;
console.log('  stays on road   ', offPct < 10 ? 'pass (' + offPct.toFixed(1) + '% of the run)' : 'loose (' + offPct.toFixed(1) + '%)');
console.log('  pace varies     ', varied > WANTS.spread
  ? 'pass (' + varied.toFixed(0) + ' mph spread)'
  : 'FLAT (' + varied.toFixed(0) + ' mph, wants ' + WANTS.spread + ')');
console.log('  road never folds', cross.folds.length ? 'FAIL (' + cross.folds.length + ' folds)' : 'pass');
const G = global.__ground;
// A metre of overlap is narrower than the car, tucked inside the tightest hairpins.
console.log('  ground is one surface', G.worstOver < 2 ? 'pass' : 'FAIL (overlaps by ' + G.worstOver.toFixed(1) + 'm)');
console.log('  hillside has no crease', G.maxStep <= 0.5 ? 'pass' : 'FAIL (' + G.maxStep.toFixed(2) + 'm step)');
