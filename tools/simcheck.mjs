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
  const segSpeed = SEGMENTS.map(() => ({ sum: 0, n: 0 }));

  for (let i = 0; i < 120 * 240; i++) {
    const g = stage.sample(car.x, car.z);

    // aim at a point down the road
    const ai = Math.min(stage.samples.length - 1, g.index + Math.round(lookahead / 2));
    const a = stage.samples[ai];
    const want = Math.atan2(a.x - car.x, a.z - car.z);
    const err = angDiff(want - car.yaw);

    wheel.held = true;
    wheel.target = Math.max(-1, Math.min(1, -err * gain));   // negated: positive wheel = right = decreasing yaw
    hb = Math.abs(err) > hbThresh && car.speed > 16 ? 1 : 0;

    wheel.update(FIXED, car.speedFactor);
    car.step(FIXED, wheel.pos, hb, g);
    t += FIXED;

    if (car.airborne) {
      if (!air) air = { start: t, dist: g.progress };
    } else if (air) {
      flights.push({ dur: t - air.start, at: Math.round(air.dist), hit: car.landingHit, tOff: air.start });
      air = null;
    }

    if (g.off > 0) { offTime += FIXED; maxOff = Math.max(maxOff, g.off); }
    const ss = segSpeed[g.seg];
    if (ss) { ss.sum += car.speed; ss.n++; }

    if (car.rolled) {
      return { ok: false, why: 'ROLLED at ' + Math.round(g.progress) + 'm', t, flights, offTime, maxOff, segSpeed, stage, len: stage.length };
    }
    if (g.progress >= stage.length - 6) {
      return { ok: true, t, flights, offTime, maxOff, segSpeed, stage, len: stage.length };
    }
    if (car.speed < 0.4 && t > 6) {
      return { ok: false, why: 'stalled at ' + Math.round(g.progress) + 'm', t, flights, offTime, maxOff, segSpeed, stage, len: stage.length };
    }
  }
  return { ok: false, why: 'never finished', t, flights, offTime, maxOff, segSpeed, stage, len: stage.length };
}

const r = run();
console.log('stage length   ', r.len.toFixed(0), 'm');
console.log('finished       ', r.ok ? 'YES' : 'NO  — ' + r.why);
console.log('stage time     ', r.t.toFixed(2), 's');
console.log('avg speed      ', (r.len / r.t * 2.237).toFixed(1), 'mph');
console.log('time off road  ', r.offTime.toFixed(2), 's   (max', r.maxOff.toFixed(1), 'm out)');
console.log('flights        ', r.flights.length);
for (const f of r.flights) {
  console.log('   ' + f.dur.toFixed(2) + 's airborne at ' + f.at + 'm (takeoff t=' + f.tOff.toFixed(2) + 's), landing hit ' + f.hit.toFixed(2));
}

if (VERBOSE) {
  console.log('\nper-segment average speed (mph):');
  SEGMENTS.forEach((s, i) => {
    const q = r.segSpeed[i];
    const mph = q.n ? (q.sum / q.n * 2.237).toFixed(1) : '--';
    console.log('  ' + String(i).padStart(2) + '  ' + String(mph).padStart(6) + '   ' + s.note);
  });
}

const big = r.flights.filter(f => f.dur > 0.5);
console.log('\nVERDICT');
console.log('  drivable      ', r.ok ? 'pass' : 'FAIL');
console.log('  has a real jump', big.length ? 'pass (' + big[0].dur.toFixed(2) + 's)' : 'FAIL — nothing over 0.5s');
console.log('  stays on road ', r.offTime < 4 ? 'pass' : 'loose (' + r.offTime.toFixed(1) + 's off)');
