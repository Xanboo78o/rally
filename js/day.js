// day.js — what day it is, what's open, and what a result is worth.
//
// There are TWO daily things and they keep different hours, which is Adam's structure:
//
//   THE DAILY        a ~1 minute sprint, brutal, with the modifiers rolled on top.
//                    Runs the whole calendar day, 00:00 -> 23:59, then switches.
//                    This is the STREAK: it counts that you showed up, not that you won.
//
//   STAGE OF THE DAY the real race, and the only thing that pays points.
//                    Opens 04:00, closes at midnight.
//
// So there is a four-hour window overnight where the Stage is shut and only the sprint
// is running. That gap is doing real work: midnight is when the day's result lands, and
// 04:00 is a fresh road with nobody's traps left on it.
//
// Everything here is LOCAL time on purpose. The group is one friend group in one place,
// and "today's stage" has to mean the day they are actually living in.

// Points, top-heavy but with no cliff in it: the gaps shrink all the way down
// (7, 5, 4, 3, 3, 2, 2, 2, 1), so winning is worth the most by a distance while tenth
// still has something to chase. Everyone past the table gets nothing — you have to
// finish to score, and the streak is what rewards merely turning up.
export const POINTS = [30, 23, 18, 14, 11, 8, 6, 4, 2, 1];

export const STAGE_OPEN_HOUR = 4;      // Stage of the Day unlocks
export const STAGE_SHUT_HOUR = 24;     // ...and locks again at midnight

// A day is named by its local calendar date, so it survives timezones, clock drift and
// anything else that makes a raw timestamp a bad key.
export function dayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The sprint runs the whole calendar day, so its key IS the day key.
export const sprintKey = dayKey;

// The Stage of the Day belongs to the calendar day it opened on. Because it shuts at
// midnight rather than running past it, that's the same key — the only difference is
// that for four hours a day there is no stage at all.
export function stageKey(now = new Date()) {
  return dayKey(now);
}

export function stageIsOpen(now = new Date()) {
  const h = now.getHours() + now.getMinutes() / 60;
  return h >= STAGE_OPEN_HOUR && h < STAGE_SHUT_HOUR;
}

// Milliseconds until the Stage opens (or shuts, if it's currently open). This is what a
// countdown on the front screen reads from.
export function msUntilStageChange(now = new Date()) {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  if (stageIsOpen(now)) next.setHours(24);            // midnight tonight
  else if (now.getHours() < STAGE_OPEN_HOUR) next.setHours(STAGE_OPEN_HOUR);
  else { next.setDate(next.getDate() + 1); next.setHours(STAGE_OPEN_HOUR); }
  return next - now;
}

export function msUntilSprintChange(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}

// Rank a day's runs and pay them out. Times in seconds, fastest first; anyone who
// didn't finish isn't in the list and scores nothing.
export function award(runs) {
  const sorted = [...runs].sort((a, b) => a.time - b.time);
  return sorted.map((r, i) => ({ ...r, pos: i + 1, points: POINTS[i] || 0 }));
}

// The streak counts CONSECUTIVE days you showed up, which per the design means you ran
// the sprint — not that you won anything. `days` is a set/array of day keys.
//
// Today not being in the list does NOT break the streak, because the day isn't over yet:
// a streak that dies at 00:01 because you hadn't got round to it would punish people for
// the clock rather than for not playing.
export function streak(days, now = new Date()) {
  const have = new Set(days);
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);                       // midday, so DST can't skip a day
  if (!have.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (have.has(dayKey(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}
