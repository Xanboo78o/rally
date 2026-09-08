// simcheck.mjs — drives the stage with a crude autopilot so the numbers can be
// checked without a browser. I can't feel the car, so this is my substitute: does
// it get round, how fast, and does the jump actually launch?
//
//   node tools/simcheck.mjs [--v]

import { Stage, SEGMENTS } from '../js/stage.js';
import { Car } from '../js/car.js';
import { Wheel } from '../js/wheel.js';

const VERBOSE = process.argv.includes('--v');
const FIXED = 1 / 120;

const angDiff = a => Math.atan2(Math.sin(a), Math.cos(a));
const fmt = t => Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60).toFixed(2);

function run(lookahead = 26, gain = 2.1, hbThresh = 0.42) {
  const stage = new Stage();
  const car = new Car();
  const wheel = new Wheel();

  const s0 = stage.samples[0];
  car.x = s0.x; car.z = s0.z; car.y = s0.y; car.yaw = s0.head;

  let t = 0, hb = 0;
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
    car.step(FIXED, wheel.pos, hb, g);
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
    if (g.progress >= stage.length - 6) {
      return { ok: true, t, flights, offTime, maxOff, segSpeed, stage, len: stage.length, offSeg };
    }
    if (car.speed < 0.4 && t > 6) {
      return { ok: false, why: 'stalled at ' + Math.round(g.progress) + 'm', t, flights, offTime, maxOff, segSpeed, stage, len: stage.length, offSeg };
    }
  }
  return { ok: false, why: 'never finished', t, flights, offTime, maxOff, segSpeed, stage, len: stage.length, offSeg };
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
console.log('  ~5 minutes      ', r.t > 240 && r.t < 400 ? 'pass (' + fmt(r.t) + ')' : 'off target (' + fmt(r.t) + ')');
console.log('  has a real jump ', big.length ? 'pass (' + big[0].dur.toFixed(2) + 's)' : 'FAIL — nothing over 0.5s');
// As a FRACTION of stage time, not an absolute — the old 4s budget was written for a
// 37-second stage and means nothing on one seven times longer.
const offPct = r.offTime / r.t * 100;
console.log('  stays on road   ', offPct < 10 ? 'pass (' + offPct.toFixed(1) + '% of the run)' : 'loose (' + offPct.toFixed(1) + '%)');
console.log('  pace varies     ', varied > 25 ? 'pass (' + varied.toFixed(0) + ' mph spread)' : 'FLAT (' + varied.toFixed(0) + ' mph spread)');
console.log('  road never folds', cross.folds.length ? 'FAIL (' + cross.folds.length + ' folds)' : 'pass');
const G = global.__ground;
// A metre of overlap is narrower than the car, tucked inside the tightest hairpins.
console.log('  ground is one surface', G.worstOver < 2 ? 'pass' : 'FAIL (overlaps by ' + G.worstOver.toFixed(1) + 'm)');
console.log('  hillside has no crease', G.maxStep <= 0.5 ? 'pass' : 'FAIL (' + G.maxStep.toFixed(2) + 'm step)');
