// daycheck.mjs — walk a fake clock through several days and assert the two dailies keep
// the hours they're supposed to.
//
//   node tools/daycheck.mjs
//
// Clock logic is the classic thing that looks obviously correct and is wrong at exactly
// one hour of the day, which is an hour nobody is awake to notice. So it gets a harness
// like everything else here.

import { POINTS, dayKey, stageKey, stageIsOpen, msUntilStageChange, msUntilSprintChange,
         award, streak, STAGE_OPEN_HOUR } from '../js/day.js';

let fails = 0;
const ok = (cond, what, detail = '') => {
  if (!cond) { fails++; console.log('  FAIL  ' + what + (detail ? '   ' + detail : '')); }
};
const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0);

// ---- the Stage of the Day keeps 04:00 -> midnight ------------------------------
console.log('stage of the day, hour by hour:');
let line = '';
for (let h = 0; h < 24; h++) {
  const open = stageIsOpen(at(2026, 9, 9, h, 30));
  line += open ? '#' : '.';
  ok(open === (h >= STAGE_OPEN_HOUR), 'stage open at ' + h + ':30', 'got ' + open);
}
console.log('  ' + line + '   (. shut, # open)  hours 0-23');
ok(!stageIsOpen(at(2026, 9, 9, 0, 0)), 'shut at midnight exactly');
ok(!stageIsOpen(at(2026, 9, 9, 3, 59)), 'shut at 03:59');
ok(stageIsOpen(at(2026, 9, 9, 4, 0)), 'open at 04:00 exactly');
ok(stageIsOpen(at(2026, 9, 9, 23, 59)), 'open at 23:59');

// ---- the four-hour dead window is really four hours ----------------------------
let shutHours = 0;
for (let h = 0; h < 24; h++) if (!stageIsOpen(at(2026, 9, 9, h, 30))) shutHours++;
ok(shutHours === 4, 'the overnight gap is 4 hours', 'got ' + shutHours);

// ---- countdowns point at the right moment --------------------------------------
const h = ms => (ms / 3600000).toFixed(2);
ok(Math.abs(msUntilStageChange(at(2026, 9, 9, 1, 0)) - 3 * 3600000) < 1000,
   'at 01:00 the stage opens in 3h', h(msUntilStageChange(at(2026, 9, 9, 1, 0))));
ok(Math.abs(msUntilStageChange(at(2026, 9, 9, 20, 0)) - 4 * 3600000) < 1000,
   'at 20:00 the stage shuts in 4h', h(msUntilStageChange(at(2026, 9, 9, 20, 0))));
ok(Math.abs(msUntilSprintChange(at(2026, 9, 9, 20, 0)) - 4 * 3600000) < 1000,
   'at 20:00 the sprint switches in 4h', h(msUntilSprintChange(at(2026, 9, 9, 20, 0))));

// ---- a run at 23:59 and a run at 00:01 are different days ----------------------
ok(stageKey(at(2026, 9, 9, 23, 59)) === '2026-09-09', 'late run belongs to today');
ok(dayKey(at(2026, 9, 10, 0, 1)) === '2026-09-10', 'a minute later is tomorrow');
ok(stageKey(at(2026, 9, 9, 23, 59)) !== dayKey(at(2026, 9, 10, 0, 1)),
   'midnight actually rolls the day over');

// ---- points ---------------------------------------------------------------------
console.log('\npoints, and what a ten-person day pays out:');
const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
const runs = names.map((n, i) => ({ who: n, time: 300 + i * 2.5 }));
const paid = award(runs);
console.log('  ' + paid.slice(0, 12).map(r => 'P' + r.pos + '=' + r.points).join('  '));
ok(paid[0].points === 30 && paid[9].points === 1, 'the table is 30 down to 1');
ok(paid[10].points === 0 && paid[11].points === 0, 'past tenth scores nothing');
const gaps = POINTS.slice(1).map((v, i) => POINTS[i] - v);
console.log('  gaps between places: ' + gaps.join(', '));
ok(gaps.every((g, i) => i === 0 || g <= gaps[i - 1]), 'gaps never widen going down — no cliff', gaps.join(','));
ok(POINTS.every((v, i) => i === 0 || v < POINTS[i - 1]), 'every place is worth less than the one above');

// A day where only four people bother still pays the top of the table.
const few = award(runs.slice(0, 4));
ok(few[3].points === 14, 'a four-person day still pays 30/23/18/14', String(few.map(r => r.points)));

// ---- streaks --------------------------------------------------------------------
console.log('\nstreaks:');
const days = (...ds) => ds.map(d => '2026-09-' + String(d).padStart(2, '0'));
const today = at(2026, 9, 10, 15, 0);
ok(streak(days(8, 9, 10), today) === 3, 'three days running = 3', String(streak(days(8, 9, 10), today)));
ok(streak(days(8, 9), today) === 2, 'not run yet TODAY still counts 2 — the day is not over',
   String(streak(days(8, 9), today)));
ok(streak(days(6, 7, 9, 10), today) === 2, 'a missed day cuts it back', String(streak(days(6, 7, 9, 10), today)));
ok(streak([], today) === 0, 'never played = 0');
ok(streak(days(10), today) === 1, 'first day = 1');
console.log('  3 in a row -> ' + streak(days(8, 9, 10), today)
  + ' | yesterday only -> ' + streak(days(8, 9), today)
  + ' | gap -> ' + streak(days(6, 7, 9, 10), today));

console.log('\nVERDICT');
console.log('  stage keeps its hours ', fails ? 'FAIL' : 'pass');
console.log('  points curve holds    ', fails ? 'FAIL' : 'pass');
console.log('  streak forgives today ', fails ? 'FAIL' : 'pass');
if (fails) { console.log('\n' + fails + ' assertion(s) failed'); process.exit(1); }
