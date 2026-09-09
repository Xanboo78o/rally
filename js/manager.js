// manager.js — the team manager. The game's SECOND voice, and the deliberate opposite
// of its first one.
//
// The co-driver is recorded, flat, clipped and bored (see VOICELINES.md). The manager is
// typed, warm, over-punctuated, uses your first name, sandwiches every criticism in two
// compliments, and asks you questions. Two characters, one game — and you can tell which
// one is talking with the sound off.
//
// He is not flavour text. He reads the run's TELEMETRY and picks the corner you actually
// lost the most time in, so "you couldve taken t5 a little tighter" is a fact. And his
// questions are the GARAGE: there is no setup menu in this game, there is a man who asks
// whether you want the rear softened for tomorrow and you tap yes.
//
// Feed him a debrief with `debrief()`. Everything he says about other drivers comes from
// their real runs when they've run, and from `chatter()` when they haven't — so the team
// chat is never empty at 6am.

// --- the cast ----------------------------------------------------------------------
// PLACEHOLDER until Adam names them. One array, one edit.
export const MANAGER = {
  name: 'DEREK',
  handle: 'Derek',                        // what he signs himself in chat
  role: 'TEAM PRINCIPAL',
};

export const TEAM = {
  name: 'PLACEHOLDER RACING',
  colour: '#d8433a',
  drivers: ['You', 'Gavin', 'Raven'],
};

const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

// Seeded, so the same run always gets the same debrief. Re-reading a message that has
// changed since you last looked at it would break the illusion that a person typed it.
function rng(seed) {
  let s = (seed | 0) || 1;
  return () => (s = (s * 1664525 + 1013904223) | 0, ((s >>> 8) & 0xffffff) / 0xffffff);
}

// --- what he's given ----------------------------------------------------------------
// A debrief is the smallest honest description of a run:
//   { name, mode, time, best, pos, of, points, streak, dnf, crashes:[{kind, corner}],
//     corners: [{ id:'T5', lost: 0.42, kind:'wide'|'early'|'slow'|'lift'|'clean' }],
//     car: 'THE DEFAULT', carChanged: false }
// `corners` is per-corner time lost against your own best line through that corner —
// the number the game already has to compute to draw a split.

const OPEN_WIN = [
  n => `${n}!! first!! i am not even slightly surprised`,
  n => `WINNER. ${n}. i knew it this morning`,
  n => `${n} that was the drive of the day and everyone knows it`,
];
const OPEN_PODIUM = [
  (n, p) => `nice job getting ${ord(p)} today ${n}!`,
  (n, p) => `${ord(p)}! ${n} thats the podium, thats points, thats a good day`,
  (n, p) => `ohh ${ord(p)} ${n}, so close. so so close`,
];
const OPEN_MID = [
  (n, p) => `${ord(p)} today ${n}. not our best but we're in the fight!`,
  (n, p) => `right. ${ord(p)}. ${n} listen, everyone has these, i've seen worse from better`,
  (n, p) => `${n} — ${ord(p)}. we scored. i'll take it`,
];
const OPEN_LAST = [
  n => `${n}. ok. we're going to look at this one together`,
  n => `aw ${n} :( tomorrow. tomorrow is ours`,
  n => `${n} i'm not angry. i'm going to have a cup of tea and then i'm going to look at the data`,
];
const OPEN_DNF = [
  n => `${n} are you ok?? the car is fine dont worry about the car. are YOU ok`,
  n => `well. ${n}. that's one way to end a stage`,
  n => `${n} the recovery truck says hello. no points today but that clip is going in the gc`,
];

// The coaching line. Everything after the first clause is generated from the corner the
// telemetry says was worst, so he is always specific about a thing you actually did.
const FIX = {
  wide:  c => `you couldve taken ${c} a little tighter`,
  early: c => `you turned into ${c} way early — wait for the note, then turn`,
  slow:  c => `you were a bit shy on the exit of ${c}, get on it sooner`,
  lift:  c => `you lifted at ${c} and you really didnt have to`,
  brake: c => `you grabbed the handbrake at ${c} when a downshift wouldve kept the speed`,
  clean: c => `${c} was genuinely lovely by the way`,
};

const SANDWICH = [
  'but great job!', 'other than that, spot on.', 'still — really good drive.',
  'apart from that i have no notes.', 'but honestly? proud of that one.',
];

// The garage, disguised as small talk. `key` is what the game acts on if you tap yes.
const QUESTIONS = [
  { key: 'car',   text: 'Do you like this car better?',                     opts: ['yeah', 'not really'] },
  { key: 'rear',  text: 'want me to soften the rear a bit for tomorrow?',   opts: ['go on then', 'leave it'] },
  { key: 'gear',  text: 'shall i shorten the gears? youre bouncing off the limiter on the straights', opts: ['yes', 'no'] },
  { key: 'tyres', text: 'im putting the harder tyre on for tomorrow unless you shout at me', opts: ['fine', 'dont you dare'] },
  { key: 'notes', text: 'do you want the notes called a bit earlier?',      opts: ['yes please', 'theyre fine'] },
];

const ord = p => p + (p % 10 === 1 && p !== 11 ? 'st' : p % 10 === 2 && p !== 12 ? 'nd'
  : p % 10 === 3 && p !== 13 ? 'rd' : 'th');

const msg = (text, extra = {}) => ({ from: 'manager', name: MANAGER.handle, text, ...extra });

// --- the debrief ---------------------------------------------------------------------
// Returns the messages he posts to the TEAM chat after a run. Team chat, not a DM: the
// whole point is that the others watch him praise you, and watch him ask you about T5.
export function debrief(run, seed = 0) {
  const r = rng(seed || Math.round((run.time || 0) * 1000) + (run.pos || 0));
  const n = run.name || 'you';
  const out = [];

  if (run.dnf) out.push(msg(pick(OPEN_DNF, r)(n)));
  else if (run.pos === 1) out.push(msg(pick(OPEN_WIN, r)(n)));
  else if (run.pos <= 3) out.push(msg(pick(OPEN_PODIUM, r)(n, run.pos)));
  else if (run.of && run.pos >= run.of) out.push(msg(pick(OPEN_LAST, r)(n)));
  else out.push(msg(pick(OPEN_MID, r)(n, run.pos)));

  // The specific bit. Worst corner by time lost, unless the run was genuinely clean.
  const worst = (run.corners || []).filter(c => c.kind !== 'clean')
    .sort((a, b) => b.lost - a.lost)[0];
  if (worst && worst.lost >= 0.15) {
    const fix = (FIX[worst.kind] || FIX.wide)(worst.id);
    out.push(msg(`aw ${n} ${fix} ${pick(SANDWICH, r)}`));
    if (worst.lost >= 0.8) out.push(msg(`thats ${worst.lost.toFixed(2)} right there. thats the whole gap`));
  } else if ((run.corners || []).length) {
    out.push(msg(`and i couldnt find a single thing wrong with it. thats rare`));
  }

  if (run.best) out.push(msg(`personal best too!! ${fmt(run.time)}. framing it`));
  if (run.streak >= 3) out.push(msg(`${run.streak} days in a row. thats the bit that wins championships`));

  // One question, most of the time. Never two — he's chatty, not a form.
  if (r() < 0.7) {
    const q = run.carChanged
      ? QUESTIONS[0]
      : pick(QUESTIONS.slice(1), r);
    out.push(msg(q.text, { q: { key: q.key, opts: q.opts } }));
  }
  return out;
}

// --- the room ------------------------------------------------------------------------
// What he says about everyone ELSE, so the chat has a pulse before you've even run. When
// a real teammate has a real time this gets replaced by their real debrief.
const IDLE = [
  () => `morning all. stage is open. i've made coffee`,
  () => `whoever left the spare wheel in the service park — it's still there`,
  d => `${d} has run already. ${d} is making the rest of you look bad`,
  d => `has anyone heard from ${d}`,
  () => `reminder: points are points. a bad run you finish beats a great run you dont`,
  d => `${d} i saw that jump. we do not have the budget for that`,
];

export function chatter(day, drivers = TEAM.drivers.slice(1), seed = 0) {
  const r = rng(seed || hash(day));
  const out = [];
  const k = 1 + Math.floor(r() * 2);
  for (let i = 0; i < k; i++) out.push(msg(pick(IDLE, r)(pick(drivers, r))));
  return out;
}

// What he says when you tap one of his options. He always takes it well.
export function ack(key, yes, seed = 0) {
  const r = rng(seed || (key.length * 31 + (yes ? 7 : 3)));
  const YES = {
    car:   'good! its yours then. ill leave it in that spec',
    rear:  'softening the rear. youll feel it on the slow stuff',
    gear:  'shorter gears going on now',
    tyres: 'harder tyre it is. dont slide it about too much',
    notes: 'ill have him call them earlier. dont panic when they come',
  };
  const NO = {
    car:   'noted!! back to the old one then. you know best',
    rear:  'leaving it. youre the one driving it',
    gear:  'fair enough. ill shut up about the limiter',
    tyres: 'ok ok!! soft tyre. dont come crying to me at the end',
    notes: 'fine! theyre good notes arent they',
  };
  return [msg((yes ? YES : NO)[key] || (yes ? 'done!' : 'no worries!')), ...(r() < 0.25 ? [msg('right. go again')] : [])];
}

const fmt = t => {
  if (!t) return '--';
  const m = Math.floor(t / 60), s = t - m * 60;
  return (m ? m + ':' : '') + (m && s < 10 ? '0' : '') + s.toFixed(2);
};
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) h = (h ^ String(str).charCodeAt(i)) * 16777619;
  return h >>> 0;
}
