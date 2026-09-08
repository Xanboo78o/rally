// scores.js — what you did, kept on this phone.
//
// One object in localStorage. It is deliberately shaped the way a shared table will be
// shaped later — a run is { day, mode, key, time } and nothing else — so when the group
// gets a real leaderboard, the only thing that changes is where the list comes from.
//
// Nothing here invents other players. Until there are real times from real people, the
// standings show YOUR season and the points table they'll be scored against; a made-up
// friend list would look exactly like a real one, which is worse than an empty one.

import { dayKey, streak as streakOf, award } from './day.js';

const KEY = 'rally.save.v1';

const blank = () => ({ runs: [], seen: 1 });

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const o = JSON.parse(raw);
    return o && Array.isArray(o.runs) ? o : blank();
  } catch { return blank(); }        // private mode, cleared storage, corrupt JSON
}

function save(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* nothing to be done */ }
}

let data = load();

// mode is 'stage' or 'sprint'; key names which road it was (the stage date, or which
// section the sprint cut from), so a sprint PB is per-section rather than pooled.
export function record(mode, key, time) {
  data.runs.push({ day: dayKey(), mode, key, time: Math.round(time * 1000) / 1000, at: Date.now() });
  save(data);
}

export function runsOn(day, mode) {
  return data.runs.filter(r => r.day === day && (!mode || r.mode === mode));
}

// Your best on a given road, ever. Used for the "BEST" line, which is the only thing
// there is to chase until other people's times arrive.
export function bestOn(mode, key) {
  let b = 0;
  for (const r of data.runs) if (r.mode === mode && r.key === key && (!b || r.time < b)) b = r.time;
  return b;
}

// Fastest run of a given day — that's what a day's result is, not your last attempt.
export function dayBest(day, mode) {
  const rs = runsOn(day, mode);
  return rs.length ? Math.min(...rs.map(r => r.time)) : 0;
}

// The streak counts days the SPRINT was run, because the sprint is the showing-up one.
export function sprintStreak() {
  return streakOf([...new Set(data.runs.filter(r => r.mode === 'sprint').map(r => r.day))]);
}

export function daysPlayed() {
  return new Set(data.runs.map(r => r.day)).size;
}

export function totalRuns() { return data.runs.length; }

// Every day you've run the Stage, newest first, with your best time that day.
export function stageHistory() {
  const days = [...new Set(data.runs.filter(r => r.mode === 'stage').map(r => r.day))];
  return days.sort().reverse().map(day => ({ day, time: dayBest(day, 'stage') }));
}

// What a day's runs are worth once ranked. Right now the list is only ever you, so this
// is honest but lonely; hand it real entries and it pays the whole table out correctly.
export function scoreDay(entries) { return award(entries); }

export function wipe() { data = blank(); save(data); }
