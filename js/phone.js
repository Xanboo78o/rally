// phone.js — the shell, and the whole idea: the menu IS a phone home screen.
//
// You open the link in the group chat holding the phone upright and you get a phone,
// inside your phone. Apps and widgets on a four-column grid; long-press and everything
// jiggles so you can drag it about, throw a tile off, or add one back. That is the only
// customisation there is, and nobody on earth needs it explained.
//
// Rotate to landscape and you get in the car. Upright = the phone, sideways = the road.
//
// Rules this file keeps to:
//   NO STATUS BAR. Not a fake battery, not fake signal. Adam's call, and he's right —
//     the joke is funny once and then it's clutter on every screen forever.
//   THE WALLPAPER IS ADAM'S ART. `art/wall/*.png`, listed in ART.md. What's drawn here
//     is a placeholder that gets out of the way the moment a real one lands.
//   ONE PIECE OF DIRTY GLASS over the lot. The same screen protector that dusts this
//     home screen becomes the windscreen when you rotate. The menu and the game are one
//     object seen through one bit of filth.
//   EVERY FEATURE IS A TILE. Nothing this game grows ever needs a new menu again.

import { debrief, chatter, ack, MANAGER, TEAM } from './manager.js';

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const LS = 'rally.phone.v1';

// --- icons -----------------------------------------------------------------------
// Flat, chunky, two-tone, no emoji ever. These are placeholders in the same sense the
// wallpaper is: each one is a slot for a drawing (ART.md).
const ICON = {
  messages: '<path d="M4 5h16v11H9l-5 4z"/>',
  roadbook: '<path d="M6 3h12v18H6z" opacity=".35"/><path d="M12 18V9M12 9l-4 3M12 9l4 3" fill="none" stroke="currentColor" stroke-width="2"/>',
  car:      '<path d="M2 16l1.6-3.4 3.2-.6 2.2-3.4h6.4l2.4 3.6 3.4 1.2.8 2.6v2H2z"/><circle cx="7" cy="18.4" r="2.9" fill="#0d1013"/><circle cx="7" cy="18.4" r="1.4"/><circle cx="17" cy="18.4" r="2.9" fill="#0d1013"/><circle cx="17" cy="18.4" r="1.4"/>',
  codriver: '<path d="M12 3.4a8.2 8.2 0 018.2 8.2v4.4a3 3 0 01-3 3H6.8a3 3 0 01-3-3v-4.4A8.2 8.2 0 0112 3.4z"/><path d="M6.4 10.6a5.8 5.8 0 0111.2 0l.4 3.2H6z" fill="#0d1013"/><path d="M4 16.4h16v1.8H4z" opacity=".45"/>',
  worlds:   '<path d="M2 19l6-11 4 6 3-4 7 9z"/>',
  clips:    '<path d="M3 5h18v14H3z" opacity=".35"/><path d="M10 9l6 3-6 3z"/>',
  history:  '<path d="M12 4a8 8 0 108 8h-3l4 5 4-5h-3" opacity=".0"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l4 2" fill="none" stroke="currentColor" stroke-width="2"/>',
  team:     '<circle cx="9" cy="9" r="3.4"/><circle cx="16" cy="10" r="2.8" opacity=".55"/><path d="M3 19a6 6 0 0112 0z"/><path d="M13 19a5 5 0 018 0z" opacity=".55"/>',
  settings: '<path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="9" cy="7" r="2.4"/><circle cx="15" cy="12" r="2.4"/><circle cx="8" cy="17" r="2.4"/>',
};
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ''}</svg>`;

// --- the tiles ---------------------------------------------------------------------
// w/h are grid cells. A 1x1 is an app, anything bigger is a widget. Adding a feature to
// this game means adding a row here.
const TILES = [
  { id: 'stage',    kind: 'widget', w: 4, h: 2, label: 'STAGE OF THE DAY' },
  { id: 'daily',    kind: 'widget', w: 2, h: 2, label: 'THE DAILY' },
  { id: 'standings',kind: 'widget', w: 2, h: 2, label: 'CHAMPIONSHIP' },
  { id: 'manager',  kind: 'widget', w: 4, h: 1, label: 'THE MANAGER' },
  { id: 'teamw',    kind: 'widget', w: 2, h: 2, label: 'YOUR TEAM' },
  { id: 'messages', kind: 'app', w: 1, h: 1, label: 'MESSAGES', icon: 'messages' },
  { id: 'roadbook', kind: 'app', w: 1, h: 1, label: 'ROADBOOK', icon: 'roadbook' },
  { id: 'car',      kind: 'app', w: 1, h: 1, label: 'THE CAR',  icon: 'car' },
  { id: 'codriver', kind: 'app', w: 1, h: 1, label: 'CO-DRIVER',icon: 'codriver' },
  { id: 'worlds',   kind: 'app', w: 1, h: 1, label: 'WORLDS',   icon: 'worlds' },
  { id: 'clips',    kind: 'app', w: 1, h: 1, label: 'CLIPS',    icon: 'clips' },
  { id: 'history',  kind: 'app', w: 1, h: 1, label: 'HISTORY',  icon: 'history' },
  { id: 'team',     kind: 'app', w: 1, h: 1, label: 'TEAM',     icon: 'team' },
  { id: 'settings', kind: 'app', w: 1, h: 1, label: 'SETTINGS', icon: 'settings' },
];
const BY_ID = Object.fromEntries(TILES.map(t => [t.id, t]));

// Every tile carries three colours and a design, per Adam: text, fill, outline, and a
// pattern behind them. `null` on a colour means "leave the built-in look alone", so an
// untouched home screen still looks like the game rather than like a paint set.
const PALETTE = ['#f2efe9', '#0d1013', '#d8433a', '#e8792a', '#e8c23a',
  '#5fbf6a', '#2fb3a8', '#4a90d8', '#8a6fd8', '#e069a8'];
const DESIGNS = [['none', 'PLAIN'], ['dots', 'DOTS'], ['stripes', 'STRIPES']];
const DEFAULT_ON = ['stage', 'daily', 'standings', 'manager', 'messages', 'roadbook',
  'car', 'codriver', 'worlds', 'clips'];

export class Phone {
  // data  { place, best, sprintBest, streak, countdown, standings, team }  — everything
  //       the tiles read. The bench fakes it; main.js will hand it the real thing.
  constructor({ root = document.body, data = {}, onDrive = () => {}, onApp = null } = {}) {
    this.data = data;
    this.onDrive = onDrive;
    this.onApp = onApp;
    this.thread = [];
    this.unread = 0;

    this.root = el('div', 'phone');
    root.appendChild(this.root);

    this.wall = el('div', 'wall');
    this.wallImg = el('div', 'wallImg');
    this.wall.appendChild(this.wallImg);
    this.root.appendChild(this.wall);

    this.pages = el('div', 'pages');
    this.root.appendChild(this.pages);

    this.home = el('div', 'page home on');
    this.grid = el('div', 'grid');
    this.home.appendChild(this.grid);
    this.pages.appendChild(this.home);

    this.app = el('div', 'page app');
    this.pages.appendChild(this.app);

    this.glass = el('canvas', 'glass');
    this.root.appendChild(this.glass);

    this.banner = el('div', 'banner');
    this.root.appendChild(this.banner);

    this._loadLayout();
    this._render();
    this._dirtyGlass();
    this._jiggleWiring();
    this.setWallpaper(null);

    addEventListener('resize', () => { this._cell(); this._dirtyGlass(); });
    this.seedThread();
  }

  // ---- layout store -----------------------------------------------------------
  _loadLayout() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
    this.order = (s && s.order || DEFAULT_ON).filter(id => BY_ID[id]);
    this.themes = (s && s.themes) || {};
    this.off = TILES.map(t => t.id).filter(id => !this.order.includes(id));
  }
  _saveLayout() {
    try {
      localStorage.setItem(LS, JSON.stringify({ order: this.order, themes: this.themes }));
    } catch (e) {}
  }

  // The three colours land as custom properties, so one write re-themes everything
  // inside the tile — including the accent, which follows the text colour. Without that
  // a green widget keeps a red DRIVE on it and looks broken rather than customised.
  _applyTheme(node, id) {
    const t = this.themes[id] || {};
    node.classList.remove('pat-dots', 'pat-stripes');
    if (t.design && t.design !== 'none') node.classList.add('pat-' + t.design);
    const set = (k, v) => v ? node.style.setProperty(k, v) : node.style.removeProperty(k);
    set('--tx', t.text);
    set('--ac', t.text);
    set('--fill', t.fill);
    set('--out', t.outline);
    set('--pat', t.pat);
  }

  // ---- render -----------------------------------------------------------------
  _render() {
    this.grid.innerHTML = '';
    for (const id of this.order) this.grid.appendChild(this._tile(BY_ID[id]));
    this.grid.appendChild(this._addTile());
    this._cell();
  }

  _cell() {
    const w = this.grid.clientWidth || this.root.clientWidth;
    const gap = 12;
    this.grid.style.setProperty('--cell', ((w - gap * 3) / 4) + 'px');
  }

  _tile(t) {
    const n = el('div', 'tile ' + t.kind);
    n.setAttribute('role', 'button');
    n.dataset.id = t.id;
    n.style.gridColumn = 'span ' + t.w;
    n.style.gridRow = 'span ' + t.h;
    if (t.kind === 'app') {
      n.innerHTML = `<span class="ico">${svg(t.icon)}</span><span class="lbl">${t.label}</span>`;
      if (t.id === 'messages' && this.unread) n.appendChild(el('i', 'badge', String(this.unread)));
    } else {
      n.appendChild(this['_w_' + t.id] ? this['_w_' + t.id]() : el('div', 'wbody', t.label));
    }
    n.appendChild(el('i', 'minus', '&minus;'));
    n.appendChild(el('i', 'paint', '&#9673;'));
    this._applyTheme(n, t.id);
    return n;
  }

  _addTile() {
    const n = el('div', 'tile app add');
    n.setAttribute('role', 'button');
    n.dataset.add = '1';
    n.innerHTML = '<span class="ico">+</span><span class="lbl">ADD</span>';
    return n;
  }

  // ---- widgets ----------------------------------------------------------------
  _w_stage() {
    const d = this.data;
    const n = el('div', 'wbody stageW', `
      <div class="wtop"><b>STAGE OF THE DAY</b><span class="left">${d.countdown || '--'} LEFT</span></div>
      <div class="place">${d.place || 'THE DESCENT'}</div>
      <div class="wrow"><span>${d.length || '8.9 KM'}</span><span>${d.duration || '~5 MIN'}</span>
        <span class="best">BEST <b>${d.best || '--'}</b></span></div>
      <div class="go">DRIVE <i>&rsaquo;</i></div>`);
    return n;
  }
  _w_daily() {
    const d = this.data;
    return el('div', 'wbody dailyW', `
      <div class="wtop"><b>THE DAILY</b></div>
      <div class="streak"><b>${d.streak ?? 0}</b><span>DAY STREAK</span></div>
      <div class="sub">${d.sprintPlace || 'THE PINES'}</div>
      <div class="sub dim">1 MIN · BEST ${d.sprintBest || '--'}</div>`);
  }
  _w_standings() {
    const rows = (this.data.standings || [
      { name: 'Gavin', pts: 128 }, { name: 'You', pts: 121, me: 1 }, { name: 'Raven', pts: 96 },
    ]).slice(0, 3).map((r, i) =>
      `<li${r.me ? ' class="me"' : ''}><i>${i + 1}</i><span>${r.name}</span><b>${r.pts}</b></li>`).join('');
    return el('div', 'wbody standW', `<div class="wtop"><b>CHAMPIONSHIP</b></div><ol>${rows}</ol>`);
  }
  _w_teamw() {
    const t = this.data.team || TEAM;
    return el('div', 'wbody teamW', `
      <div class="wtop"><b>YOUR TEAM</b></div>
      <div class="tname">${t.name}</div>
      <div class="sub dim">${(t.drivers || []).join(' · ')}</div>`);
  }
  _w_manager() {
    const last = [...this.thread].reverse().find(m => m.from === 'manager');
    return el('div', 'wbody mgrW', `
      <span class="av">${MANAGER.handle[0]}</span>
      <span class="line"><b>${MANAGER.handle}</b> ${last ? esc(last.text) : 'stage is open. go on then'}</span>`);
  }

  // ---- wallpaper --------------------------------------------------------------
  // src null = the placeholder. It is deliberately plain: it exists to be replaced by a
  // drawing, and a pretty placeholder is how you end up never replacing it.
  setWallpaper(src) {
    if (src) { this.wallImg.style.backgroundImage = `url(${JSON.stringify(src)})`; this.wallImg.classList.add('art'); return; }
    this.wallImg.classList.remove('art');
    this.wallImg.style.backgroundImage = '';
  }

  // ---- the glass ---------------------------------------------------------------
  // A screen protector that has lived in a rally car: dust, one thumb smear, a chipped
  // corner. Drawn once. The same layer becomes the windscreen when you rotate.
  _dirtyGlass() {
    const c = this.glass, dpr = Math.min(2, devicePixelRatio || 1);
    const w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    let s = 20260909;
    const r = () => (s = (s * 1664525 + 1013904223) | 0, ((s >>> 8) & 0xffffff) / 0xffffff);

    g.fillStyle = 'rgba(255,252,244,.5)';
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = r() * h, rad = 0.3 + r() * 1.1;
      g.globalAlpha = 0.05 + r() * 0.16;
      g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    }
    // thumb smear, low right, where a thumb actually goes
    g.globalAlpha = 1;
    const sm = g.createRadialGradient(w * 0.74, h * 0.82, 4, w * 0.74, h * 0.82, w * 0.30);
    sm.addColorStop(0, 'rgba(255,255,255,.055)');
    sm.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sm; g.fillRect(0, 0, w, h);
    // chipped corner
    g.globalAlpha = 0.5;
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(w - 2, 26); g.lineTo(w - 21, 3); g.stroke();
    g.beginPath(); g.moveTo(w - 2, 15); g.lineTo(w - 12, 3); g.stroke();
    g.globalAlpha = 1;
  }

  // ---- jiggle, drag, remove, add ------------------------------------------------
  // A finger that has travelled is SCROLLING. The first version of this measured
  // movementX/movementY, which do not exist on touch events — so every attempt to
  // scroll sat still for 420ms and armed jiggle mode instead of moving the page. Never
  // use movementX for touch; measure against where the finger went down.
  _jiggleWiring() {
    const SLOP = 9;
    let press = null, timer = null, drag = null;

    this.grid.addEventListener('pointerdown', e => {
      const tile = e.target.closest('.tile');
      if (!tile) return;
      press = { tile, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
      if (this.jiggling) return;                    // already jiggling: this may be a drag
      timer = setTimeout(() => {
        timer = null; this.setJiggle(true); navigator.vibrate?.(12);
      }, 420);
    });

    this.grid.addEventListener('pointermove', e => {
      if (!press || e.pointerId !== press.id) return;
      if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) < SLOP) return;
      press.moved = true;
      if (timer) { clearTimeout(timer); timer = null; }   // scrolling, so let it scroll
      if (this.jiggling && !drag && !press.tile.dataset.add) drag = this._beginDrag(press.tile, e);
      if (drag) drag.move(e);
    });

    const finish = e => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (drag) { drag.end(); drag = null; }
      else if (press && !press.moved && e.type === 'pointerup') this._tap(e);
      press = null;
    };
    this.grid.addEventListener('pointerup', finish);
    this.grid.addEventListener('pointercancel', finish);
    this.wall.addEventListener('pointerdown', () => this.setJiggle(false));
  }

  setJiggle(on) {
    this.jiggling = on;
    this.root.classList.toggle('jiggle', on);
  }

  _tap(e) {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    if (tile.dataset.add) return this._openAdd();
    const id = tile.dataset.id;
    if (this.jiggling) {
      if (e.target.closest('.minus')) this._remove(id);
      else this._openPaint(id);
      return;
    }
    if (id === 'stage') return this.onDrive('stage');
    if (id === 'daily') return this.onDrive('sprint');
    if (id === 'manager' || id === 'messages') return this.open('messages');
    this.open(id);
  }

  _remove(id) {
    this.order = this.order.filter(x => x !== id);
    this.off.push(id);
    this._saveLayout(); this._render(); this.setJiggle(true);
  }

  _openAdd() {
    const sheet = el('div', 'sheet');
    const list = this.off.length
      ? this.off.map(id => `<button data-id="${id}"><span class="ico">${BY_ID[id].kind === 'app' ? svg(BY_ID[id].icon) : '&#9632;'}</span>${BY_ID[id].label}</button>`).join('')
      : '<p class="dim">everything is already on your home screen</p>';
    sheet.innerHTML = `<div class="sheetIn"><h3>ADD</h3><div class="opts">${list}</div>
      <button class="close">DONE</button></div>`;
    sheet.addEventListener('click', e => {
      const b = e.target.closest('button[data-id]');
      if (b) {
        this.order.push(b.dataset.id);
        this.off = this.off.filter(x => x !== b.dataset.id);
        this._saveLayout(); this._render();
      }
      if (e.target.closest('.close') || e.target === sheet) sheet.remove();
    });
    this.root.appendChild(sheet);
  }

  // Returns { move, end } — the gesture code above owns the pointer, this just knows
  // how to follow it and where to drop the tile.
  _beginDrag(tile, e) {
    let rec = tile.getBoundingClientRect();
    let sx = e.clientX, sy = e.clientY;
    tile.classList.add('dragging');

    const put = ev => {
      tile.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px) scale(1.06)`;
    };
    const move = ev => {
      put(ev);
      tile.style.pointerEvents = 'none';
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.tile');
      tile.style.pointerEvents = '';
      if (over && over !== tile && !over.dataset.add) {
        const after = tile.compareDocumentPosition(over) & Node.DOCUMENT_POSITION_FOLLOWING;
        this.grid.insertBefore(tile, after ? over.nextSibling : over);
        // The tile just moved in the flow, so re-baseline or it jumps out from under
        // the finger by exactly the distance it was reordered.
        tile.style.transform = '';
        const nr = tile.getBoundingClientRect();
        sx += nr.left - rec.left; sy += nr.top - rec.top; rec = nr;
        put(ev);
      }
    };
    const end = () => {
      tile.style.transform = '';
      tile.classList.remove('dragging');
      this.order = [...this.grid.querySelectorAll('.tile')]
        .filter(t => !t.dataset.add).map(t => t.dataset.id);
      this._saveLayout();
    };
    return { move, end };
  }

  // ---- the paint sheet ----------------------------------------------------------
  // Three colours and a design, on the tile you tapped, applied live. Adam wanted full
  // control, so every row has the ten-swatch shortcut AND a real colour picker.
  _openPaint(id) {
    const node = this.grid.querySelector(`.tile[data-id="${id}"]`);
    const theme = this.themes[id] = { ...(this.themes[id] || {}) };

    const row = (key, label) => `
      <div class="row"><b>${label}</b><div class="swatches" data-key="${key}">
        <button data-v="" class="${theme[key] ? '' : 'on'}"
          style="background:repeating-linear-gradient(45deg,#2a3037 0 5px,#171b20 5px 10px)"></button>
        ${PALETTE.map(c => `<button data-v="${c}" class="${theme[key] === c ? 'on' : ''}"
          style="background:${c}"></button>`).join('')}
        <label class="pick"><input type="color" data-key="${key}"
          value="${theme[key] || '#d8433a'}"></label>
      </div></div>`;

    const sheet = el('div', 'sheet paintSheet');
    sheet.innerHTML = `<div class="sheetIn">
      <h3>${BY_ID[id].label}</h3>
      ${row('text', 'TEXT')}
      ${row('fill', 'FILL')}
      ${row('outline', 'OUTLINE')}
      <div class="row"><b>DESIGN</b><div class="designs">
        ${DESIGNS.map(([v, l]) => `<button data-design="${v}" class="d-${v}
          ${(theme.design || 'none') === v ? 'on' : ''}">${l}</button>`).join('')}
      </div></div>
      ${row('pat', 'DESIGN COLOUR')}
      <button class="close">DONE</button></div>`;

    const touch = () => { this._applyTheme(node, id); this._saveLayout(); };
    const mark = (host, v) => [...host.children].forEach(c =>
      c.classList?.toggle('on', c.dataset && 'v' in c.dataset && (c.dataset.v || '') === (v || '')));

    sheet.addEventListener('click', e => {
      const sw = e.target.closest('.swatches button');
      if (sw) {
        const key = sw.parentElement.dataset.key;
        theme[key] = sw.dataset.v || null;
        mark(sw.parentElement, sw.dataset.v);
        touch();
      }
      const dz = e.target.closest('[data-design]');
      if (dz) {
        theme.design = dz.dataset.design;
        [...dz.parentElement.children].forEach(c => c.classList.toggle('on', c === dz));
        touch();
      }
      if (e.target.closest('.close') || e.target === sheet) sheet.remove();
    });
    sheet.addEventListener('input', e => {
      const key = e.target.dataset.key;
      if (!key) return;
      theme[key] = e.target.value;
      mark(e.target.closest('.swatches'), e.target.value);
      touch();
    });
    this.root.appendChild(sheet);
  }

  // ---- apps ---------------------------------------------------------------------
  open(id) {
    if (this.onApp && this.onApp(id) === true) return;
    this.app.innerHTML = '';
    const head = el('div', 'appHead', `<button class="back">&lsaquo;</button><h2>${BY_ID[id]?.label || id}</h2>`);
    head.querySelector('.back').onclick = () => this.close();
    this.app.appendChild(head);
    if (id === 'messages') this._messages();
    else this.app.appendChild(el('div', 'stub', `<p>${BY_ID[id]?.label || id}</p><p class="dim">not built yet</p>`));
    this.root.classList.add('inApp');
    this.app.classList.add('on');
  }
  close() {
    this.root.classList.remove('inApp');
    this.app.classList.remove('on');
    this._render();
  }

  // The team chat. The manager talks here, not in a DM — the whole point is that the
  // others watch him praise you, and watch him ask you about T5.
  _messages() {
    const wrap = el('div', 'chat');
    const list = el('div', 'msgs');
    wrap.appendChild(list);
    const reply = el('div', 'replies');
    wrap.appendChild(reply);
    this.app.appendChild(wrap);
    this._list = list; this._reply = reply;
    this.unread = 0;
    this._paint();
  }

  _paint() {
    if (!this._list) return;
    this._list.innerHTML = this.thread.map(m => m.from === 'manager'
      ? `<div class="m mgr"><span class="av">${MANAGER.handle[0]}</span><div class="b">
           <i>${MANAGER.handle} &middot; ${MANAGER.role}</i><p>${esc(m.text)}</p></div></div>`
      : `<div class="m me"><div class="b"><p>${esc(m.text)}</p></div></div>`).join('');
    this._list.scrollTop = this._list.scrollHeight;

    const q = [...this.thread].reverse().find(m => m.q)?.q;
    const answered = this.thread.some(m => m.from === 'me' && m.answers === (q && q.key));
    this._reply.innerHTML = q && !answered
      ? q.opts.map((o, i) => `<button data-yes="${i === 0 ? 1 : 0}" data-key="${q.key}">${esc(o)}</button>`).join('')
      : '';
    this._reply.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      this.push({ from: 'me', text: b.textContent, answers: b.dataset.key });
      setTimeout(() => this.push(...ack(b.dataset.key, b.dataset.yes === '1')), 700);
    };
  }

  push(...msgs) {
    for (const m of msgs) this.thread.push(m);
    if (!this.app.classList.contains('on')) this.unread += msgs.filter(m => m.from === 'manager').length;
    this._paint();
    if (!this.app.classList.contains('on')) this._render();
  }

  // A manager message that slides down over whatever you're looking at. The social loop
  // of this game IS a notification, so it should be one.
  notify(text) {
    this.banner.innerHTML = `<span class="av">${MANAGER.handle[0]}</span>
      <span><b>${MANAGER.handle}</b><br>${esc(text)}</span>`;
    this.banner.classList.add('on');
    this.banner.onclick = () => { this.banner.classList.remove('on'); this.open('messages'); };
    clearTimeout(this._bt);
    this._bt = setTimeout(() => this.banner.classList.remove('on'), 4600);
  }

  // Post a run to the chat, the way it will happen for real after a stage.
  postRun(run) {
    const msgs = debrief(run);
    this.push(...msgs);
    this.notify(msgs[0].text);
  }

  seedThread() {
    this.thread = chatter(new Date().toDateString());
    this._render();
  }
}

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
