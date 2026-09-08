// menu.js — the shell around the driving: home, standings, how-to, results.
//
// It builds its own markup and brings its own stylesheet (menu.css), so it can grow
// without touching index.html. Two sessions work in this repo and shared files are
// where they collide.
//
// The home screen is the two dailies, side by side, because that IS the game's shape:
//
//   THE DAILY         one minute, brutal, modifiers, runs all day. This is the streak.
//   STAGE OF THE DAY  the real race, 04:00 to midnight, the only thing that pays points.
//
// Portrait first: you open the link in the group chat holding the phone upright, and you
// only turn it sideways to drive. Nothing here needs a rotation to press.

import { POINTS, dayKey, stageIsOpen, msUntilStageChange, msUntilSprintChange } from './day.js';
import * as scores from './scores.js';

const $ = (sel, el = document) => el.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export const fmtTime = t => {
  if (!t) return '--';
  const m = Math.floor(t / 60), s = t - m * 60;
  return (m ? m + ':' : '') + (m && s < 10 ? '0' : '') + s.toFixed(2);
};

// "4h 12m" / "12m" / "48s" — enough to know whether it's worth opening, no more.
function fmtLeft(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h) return h + 'h ' + m + 'm';
  if (m) return m + 'm';
  return s + 's';
}

// Today's sprint is one of the stage's own sections, rotating by date. No new road is
// generated or authored: the eight places you drive on Sunday become eight sprints the
// game serves one at a time, so a brutal one-minute time trial is always a road you
// already know. Same day, same section, for everyone.
export function sprintOfDay(stage, key = dayKey()) {
  const day = Math.floor(Date.parse(key + 'T12:00:00') / 86400000);
  return stage.sections[((day % stage.sections.length) + stage.sections.length) % stage.sections.length];
}

export class Menu {
  // onStart({ mode, from, to, key, title }) hands a run spec back to the game.
  constructor({ stage, atmos, onStart, onResume, onRestart, onQuit }) {
    this.stage = stage;
    this.atmos = atmos;
    this.onStart = onStart;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onQuit = onQuit;
    this.root = el('div', '');
    this.root.id = 'menu';
    document.body.appendChild(this.root);
    this._build();
    this._buildPause();
    this._tick = this._tick.bind(this);
    setInterval(this._tick, 1000);
  }

  // ---- markup ---------------------------------------------------------------
  _build() {
    const home = el('div', 'screen on');
    home.dataset.screen = 'home';
    home.appendChild(el('div', 'mHead', `
      <h1>RALLY</h1>
      <div class="streak"><i></i><b>0</b> DAY STREAK</div>`));

    const cards = el('div', 'cards');
    cards.appendChild(this._card('sprint', 'THE DAILY'));
    cards.appendChild(this._card('stage', 'STAGE OF THE DAY'));
    home.appendChild(cards);

    const list = el('div', 'mList');
    list.appendChild(this._row('STANDINGS', 'standings'));
    list.appendChild(this._row('HOW TO DRIVE', 'how'));
    home.appendChild(list);
    this.root.appendChild(home);

    this.root.appendChild(this._standings());
    this.root.appendChild(this._how());
    this.root.appendChild(this._result());

    this.root.addEventListener('click', e => {
      const go = e.target.closest('[data-go]');
      if (go) this.show(go.dataset.go);
      const run = e.target.closest('[data-run]');
      if (run && !run.disabled) this._start(run.dataset.run);
    });
  }

  // The pause overlay is NOT one of the menu screens: it sits over the frozen frame, so
  // it needs to be translucent and it needs to live outside #menu, which is opaque.
  _buildPause() {
    const p = el('div', '');
    p.id = 'pause';
    p.innerHTML = `
      <div class="pCard">
        <div class="kind" data-pkind>PAUSED</div>
        <h2 data-ptime>0.00</h2>
        <div class="sub" data-pwhere>—</div>
        <button class="mGo" data-pause="resume">RESUME</button>
        <button class="mRow" data-pause="restart">START AGAIN<span class="arrow">›</span></button>
        <button class="mRow" data-pause="quit">QUIT TO HOME<span class="arrow">›</span></button>
      </div>`;
    document.body.appendChild(p);
    this.pauseEl = p;
    p.addEventListener('click', e => {
      const b = e.target.closest('[data-pause]');
      if (!b) return;
      if (b.dataset.pause === 'resume') this.onResume?.();
      if (b.dataset.pause === 'restart') this.onRestart?.();
      if (b.dataset.pause === 'quit') this.onQuit?.();
    });

    // The count back in. Coming straight off a menu into a corner at 90mph with the
    // clock already running isn't a pause, it's a penalty.
    const c = el('div', '');
    c.id = 'resumeCount';
    document.body.appendChild(c);
    this.countEl = c;
  }

  pause(info) {
    const p = this.pauseEl;
    $('[data-pkind]', p).textContent = info.mode === 'sprint' ? 'THE DAILY — PAUSED' : 'STAGE OF THE DAY — PAUSED';
    $('[data-ptime]', p).textContent = fmtTime(info.time) === '--' ? '0.00' : fmtTime(info.time);
    $('[data-pwhere]', p).textContent = info.title || '';
    p.classList.add('on');
  }

  unpause() { this.pauseEl.classList.remove('on'); }

  // n > 0 shows the number; 0 clears it.
  count(n) {
    this.countEl.textContent = n > 0 ? String(n) : '';
    this.countEl.classList.toggle('on', n > 0);
    if (n > 0) { this.countEl.style.animation = 'none'; void this.countEl.offsetWidth; this.countEl.style.animation = ''; }
  }

  _card(mode, title) {
    const c = el('div', 'mCard');
    c.dataset.card = mode;
    // The badge is doing the explaining: one of these keeps your streak alive, the other
    // is the one that pays. Without it they're two identical red buttons.
    const badge = mode === 'sprint'
      ? '<em class="badge streak">KEEPS YOUR STREAK</em>'
      : '<em class="badge pts">30 PTS FOR A WIN</em>';
    c.innerHTML = `
      <div class="kind">${mode === 'sprint' ? 'ALL DAY, EVERY DAY' : '04:00 — MIDNIGHT'}${badge}</div>
      <h2>${title}</h2>
      <div class="sub" data-where>—</div>
      <div class="mClock"><span data-clocklabel>—</span> <em data-clock>—</em></div>
      <div class="mStats">
        <div><span>TODAY</span><b data-today class="none">--</b></div>
        <div><span>YOUR BEST</span><b data-best class="none">--</b></div>
      </div>
      <button class="mGo" data-run="${mode}">RUN IT</button>`;
    return c;
  }

  _row(label, screen) {
    const b = el('button', 'mRow', `${label}<span class="arrow">›</span>`);
    b.dataset.go = screen;
    return b;
  }

  _standings() {
    const s = el('div', 'screen');
    s.dataset.screen = 'standings';
    s.innerHTML = `
      <button class="mBack" data-go="home">‹ BACK</button>
      <div class="mHead"><h1>STANDINGS</h1></div>
      <div class="mPoints">${POINTS.map((p, i) =>
        `<span>P${i + 1} <b>${p}</b></span>`).join('')}</div>
      <div class="mNote">Points go to the Stage of the Day, once the day closes at
        midnight and everyone's times are in. Your own runs are below — the table fills
        out when the group is connected.</div>
      <table class="mTable"><thead><tr><th>DAY</th><th>YOUR STAGE TIME</th></tr></thead>
        <tbody data-history></tbody></table>`;
    return s;
  }

  _how() {
    const s = el('div', 'screen');
    s.dataset.screen = 'how';
    s.innerHTML = `
      <button class="mBack" data-go="home">‹ BACK</button>
      <div class="mHead"><h1>HOW TO DRIVE</h1></div>
      <ul class="mHow">
        <li><b>LEFT THUMB — THE WHEEL</b>Grip it and sweep in an arc. Sweep left and up to
          go left. It's heavy at speed, so start turning before the corner arrives. Let go
          and it unwinds on its own.</li>
        <li><b>RIGHT THUMB — HOLD FOR HANDBRAKE</b>Blunt. Locks the rear, scrubs speed,
          swings the car right round. For hairpins.</li>
        <li><b>RIGHT THUMB — FLICK DOWN TO DOWNSHIFT</b>A scalpel. The engine braking
          kicks the car into rotation but keeps your speed. For fast corners.</li>
        <li><b>NO THROTTLE</b>You're always flat out. The only question is how you get the
          car pointed.</li>
        <li><b>TILT TO LOOK</b>Tip the phone down for the console and footwell, up for more
          windscreen. Neutral is wherever you're holding it when the run starts.</li>
      </ul>
      <div class="mKeys">desk: A/D steer · SPACE handbrake · S downshift · 1-8 filters, 0 auto, P post off</div>`;
    return s;
  }

  _result() {
    const s = el('div', 'screen');
    s.dataset.screen = 'result';
    s.innerHTML = `
      <div class="mHead"><h1 data-rtitle>FINISHED</h1></div>
      <div class="mCard">
        <div class="kind" data-rkind>—</div>
        <div class="mStats">
          <div><span>YOUR TIME</span><b data-rtime>--</b></div>
          <div><span>BEST</span><b data-rbest>--</b></div>
        </div>
        <div class="sub" data-rtag></div>
      </div>
      <div class="mList">
        <button class="mRow" data-run="again">RUN IT AGAIN<span class="arrow">›</span></button>
        <button class="mRow" data-go="home">HOME<span class="arrow">›</span></button>
      </div>`;
    return s;
  }

  // ---- state ----------------------------------------------------------------
  show(screen) {
    for (const s of this.root.querySelectorAll('.screen')) s.classList.toggle('on', s.dataset.screen === screen);
    this.root.classList.add('on');
    this.root.scrollTop = 0;
    if (screen === 'home') this.refresh();
    if (screen === 'standings') this._fillHistory();
  }

  hide() { this.root.classList.remove('on'); }
  get visible() { return this.root.classList.contains('on'); }

  refresh() {
    const day = dayKey();
    const n = scores.sprintStreak();
    const st = $('.streak', this.root);
    $('b', st).textContent = n;
    st.classList.toggle('cold', n === 0);

    // --- the sprint: today's section, always open
    const sec = sprintOfDay(this.stage, day);
    const sc = $('[data-card="sprint"]', this.root);
    $('[data-where]', sc).textContent = (this.atmos[sec.key]?.name || sec.key)
      + ' · ' + Math.round(sec.end - sec.start) + ' M';
    this._time(sc, '[data-today]', scores.dayBest(day, 'sprint'));
    this._time(sc, '[data-best]', scores.bestOn('sprint', sec.key));
    // The sprint is always open, and it rolls at midnight — the same instant the Stage
    // shuts. Showing that countdown all day just prints the same number on both cards
    // and reads as a bug. So it only appears when it starts to matter: the last three
    // hours, when what's running out is your streak.
    const left = msUntilSprintChange();
    const urgent = left < 3 * 3600e3 && !scores.runsOn(day, 'sprint').length;
    $('.mClock', sc).style.display = urgent ? '' : 'none';
    $('[data-clocklabel]', sc).textContent = 'STREAK ENDS IN';
    $('[data-clock]', sc).textContent = fmtLeft(left);
    $('.mClock', sc).classList.toggle('shut', urgent);

    // --- the stage: shut for four hours overnight
    const gc = $('[data-card="stage"]', this.root);
    const open = stageIsOpen();
    $('[data-where]', gc).textContent = 'THE FULL STAGE · '
      + (this.stage.length / 1000).toFixed(1) + ' KM · ' + this.stage.sections.length + ' PLACES';
    this._time(gc, '[data-today]', scores.dayBest(day, 'stage'));
    this._time(gc, '[data-best]', scores.bestOn('stage', 'full'));
    $('[data-clocklabel]', gc).textContent = open ? 'CLOSES IN' : 'OPENS IN';
    $('[data-clock]', gc).textContent = fmtLeft(msUntilStageChange());
    $('.mClock', gc).classList.toggle('shut', !open);
    const btn = $('[data-run="stage"]', gc);
    btn.disabled = !open;
    btn.textContent = open ? 'RUN IT' : 'SHUT UNTIL 04:00';
  }

  _time(card, sel, t) {
    const b = $(sel, card);
    b.textContent = fmtTime(t);
    b.classList.toggle('none', !t);
  }

  _tick() {
    if (this.visible && $('.screen.on', this.root)?.dataset.screen === 'home') this.refresh();
  }

  _fillHistory() {
    const body = $('[data-history]', this.root);
    const rows = scores.stageHistory();
    body.innerHTML = rows.length
      ? rows.map(r => `<tr class="me"><td>${r.day}</td><td>${fmtTime(r.time)}</td></tr>`).join('')
      : `<tr><td colspan="2" style="color:rgba(242,239,233,.35)">No stage runs yet.</td></tr>`;
  }

  // ---- starting a run --------------------------------------------------------
  _start(what) {
    if (what === 'again' && this._last) return this.onStart(this._last);
    const day = dayKey();
    let spec;
    if (what === 'sprint') {
      const sec = sprintOfDay(this.stage, day);
      spec = { mode: 'sprint', from: sec.start, to: sec.end, key: sec.key,
               title: this.atmos[sec.key]?.name || sec.key };
    } else {
      spec = { mode: 'stage', from: 0, to: this.stage.length - 6, key: 'full',
               title: 'STAGE OF THE DAY' };
    }
    this._last = spec;
    this.onStart(spec);
  }

  // Called by the game when a run ends. Records it, then shows what it was worth.
  finished(spec, time) {
    scores.record(spec.mode, spec.key, time);
    const best = scores.bestOn(spec.mode, spec.key);
    const isPB = Math.abs(best - time) < 1e-6;
    const s = $('[data-screen="result"]', this.root);
    $('[data-rtitle]', s).textContent = isPB ? 'PERSONAL BEST' : 'FINISHED';
    $('[data-rkind]', s).textContent = (spec.mode === 'sprint' ? 'THE DAILY · ' : 'STAGE OF THE DAY · ')
      + spec.title;
    $('[data-rtime]', s).textContent = fmtTime(time);
    $('[data-rbest]', s).textContent = fmtTime(best);
    $('[data-rtag]', s).textContent = spec.mode === 'sprint'
      ? 'Streak: ' + scores.sprintStreak() + ' day' + (scores.sprintStreak() === 1 ? '' : 's')
      : 'Points are settled when the day closes at midnight.';
    this.show('result');
  }
}
