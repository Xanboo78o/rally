// voice.js — the co-driver. Real recordings, sequenced live: the notes were never
// written as sentences to be read out, they're a fixed vocabulary, so a call like
// "LEFT 5 LONG" is three clips played back to back rather than one recording of that
// exact corner. That's what lets 124 clips cover a stage of any length.
//
// Everything arrives through the intercom in radio.js. He is a foot away with a helmet
// on; nothing he says is ever heard in the open air.

import { makeRadio } from './radio.js';

// Note text -> clips. The notes in stage.js are already written in the vocabulary he
// recorded, so this reads them rather than requiring a second, parallel list that could
// drift out of step with them. Longest phrase wins, which is why the order matters.
const PHRASES = [
  ['dont touch the edge', 'dont-touch-the-edge'], ['dont drop a wheel', 'dont-drop-a-wheel'],
  ['flick down to rotate', 'flick-down-to-rotate'], ['start turning early', 'start-turning-early'],
  ['nothing on the outside', 'nothing-outside'], ['rocks on the inside', 'rocks-inside'],
  ['rock on the inside', 'rocks-inside'], ['rock on the right', 'rocks-inside'],
  ['rock on the left', 'rocks-inside'], ['tree on the inside', 'tree-inside'],
  ['walls both sides', 'walls-both-sides'], ['walls on both sides', 'walls-both-sides'],
  ['road falls away', 'road-falls-away'], ['hold the handbrake', 'hold-the-handbrake'],
  ['keep the rhythm', 'keep-the-rhythm'], ['narrowest point', 'narrowest-point'],
  ['someones been here', 'someones-been-here'], ['out of the village', 'out-of-the-village'],
  ['out of the trees', 'out-of-the-trees'], ['out of the dark', 'out-of-the-dark'],
  ['handbrake again', 'handbrake-again'], ['under the arch', 'under-the-arch'],
  ['flat to finish', 'flat-to-finish'], ['land straight', 'land-straight'],
  ['dont overturn', 'dont-overturn'], ['slow it down', 'slow-it-down'],
  ['then immediately', 'then-immediately'], ['personal best', 'personal-best'],
  ['warning light', 'warning-light'], ['last corner', 'last-corner'],
  ['stage start', 'stage-start'], ['stage end', 'stage-end'],
  ['over the top', 'over-the-top'], ['over crest', 'over-crest'], ['over roots', 'over-roots'],
  ['over water', 'over-water'], ['flick down', 'flick-down'], ['keep left', 'keep-left'],
  ['keep right', 'keep-right'], ['very tight', 'very-tight'], ['dont cut', 'dont-cut'],
  ['dont lift', 'dont-lift'], ['big jump', 'big-jump'], ['flat out', 'flat-out'],
  ['handbrake', 'handbrake'], ['tightens', 'tightens'], ['climbing', 'climbing'],
  ['downhill', 'downhill'], ['narrows', 'narrows'], ['caution', 'caution'],
  ['landing', 'landing'], ['bridge', 'bridge'], ['uphill', 'uphill'], ['narrow', 'narrow'],
  ['square', 'square'], ['spikes', 'spikes'], ['blind', 'blind'], ['bumpy', 'bumpy'],
  ['opens', 'opens'], ['crest', 'crest'], ['tight', 'tight'], ['short', 'short'],
  ['long', 'long'], ['flat', 'flat'], ['jump', 'jump'], ['dust', 'dust'], ['care', 'care'],
  ['into the trees', 'into|p-pines'], ['into the village', 'into|p-village'],
  ['into the gorge', 'into|p-gorge'], ['into trees', 'into|p-pines'],
  ['the drop zone', 'p-drop-zone'], ['the old road', 'p-old-road'], ['the plateau', 'p-plateau'],
  ['the descent', 'p-descent'], ['the village', 'p-village'], ['the pines', 'p-pines'],
  ['the gorge', 'p-gorge'], ['the climb', 'p-climb'],
  ['into', 'into'], ['then', 'then'], ['and', 'and'],
];
const DISTANCES = [30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200];

// "LEFT 5 LONG — START TURNING EARLY" -> left-5, long, start-turning-early
export function slugsFor(text) {
  let t = ' ' + String(text).toLowerCase()
    .replace(/[—–]/g, ' , ').replace(/[.'"!]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  const out = [];
  // Corners first: they're the only part with a number attached to a word, so pulling
  // them out early stops "left 5" being read as a distance of five metres.
  t = t.replace(/\bhairpin (left|right)( \d)?\b/g, (_, d) => { out.push(['@', 'hairpin-' + d]); return ' @ '; });
  t = t.replace(/\b(left|right) ([1-6])\b/g, (_, d, n) => { out.push(['@', d + '-' + n]); return ' @ '; });

  const res = [];
  let words = t.split(/\s+/).filter(Boolean);
  let holes = 0;
  for (let i = 0; i < words.length; ) {
    if (words[i] === '@') { res.push(out[holes++][1]); i++; continue; }
    let hit = null;
    for (const [phrase, slug] of PHRASES) {
      const n = phrase.split(' ').length;
      if (words.slice(i, i + n).join(' ') === phrase) { hit = [slug, n]; break; }
    }
    if (hit) { res.push(...hit[0].split('|')); i += hit[1]; continue; }
    const n = parseInt(words[i], 10);
    if (!Number.isNaN(n) && n >= 20) {
      // Distances are called to the nearest one he actually recorded. A pace note is an
      // approximation anyway — nobody says "eighty-five".
      res.push('d-' + DISTANCES.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a));
    }
    i++;
  }
  // Four clips is already a mouthful at 90mph, and the corner arrives whether he's
  // finished or not.
  return res.slice(0, 4);
}

export class Voice {
  constructor() {
    this.ready = false;
    this.bank = new Map();      // slug -> [AudioBuffer, ...] one per take
    this.manifest = null;
    this.nextFree = 0;          // when the queue frees up, in ctx time
    this.gain = null;
  }

  // Called once the game's AudioContext exists, so the co-driver shares its clock.
  // Nothing in here may ever take the rest of the game's audio down with it. He is the
  // last thing added to the graph and the first thing that should be dropped: an engine
  // with no co-driver is a game, a co-driver with no engine is silence.
  async attach(ctx, out) {
    try {
      this.ctx = ctx;
      this.radio = makeRadio(ctx, 'helmet');
      this.gain = ctx.createGain();
      this.gain.gain.value = 1.0;
      this.radio.output.connect(this.gain);
      this.gain.connect(out || ctx.destination);
      this.manifest = await (await fetch('./vo/manifest.json')).json();
      this.ready = true;
    } catch (e) {
      this.ready = false;
      try { this.gain?.disconnect(); this.radio?.output?.disconnect(); } catch {}
      console.warn('co-driver off:', e && e.message);
    }
  }

  async _buf(slug) {
    if (this.bank.has(slug)) return this.bank.get(slug);
    const takes = this.manifest.filter(m => m.slug === slug);
    if (!takes.length) { this.bank.set(slug, null); return null; }
    const bufs = [];
    for (const t of takes) {
      try {
        const r = await fetch('./vo/clip/' + t.file);
        bufs.push(await this.ctx.decodeAudioData(await r.arrayBuffer()));
      } catch { /* a missing clip is silence, not a crash */ }
    }
    const v = bufs.length ? bufs : null;
    this.bank.set(slug, v);
    return v;
  }

  // Queue a run of clips end to end. Gaps are short and even, because he reads them as
  // one call — a pause between "left" and "four" would be a different note.
  async say(slugs) {
    if (!this.ready || !slugs.length) return;
    try { return await this._say(slugs); } catch (e) { console.warn('co-driver:', e && e.message); }
  }

  async _say(slugs) {
    const bufs = [];
    for (const s of slugs) {
      const b = await this._buf(s);
      if (b) bufs.push(b[(Math.random() * b.length) | 0]);
    }
    if (!bufs.length) return;
    const now = this.ctx.currentTime;
    // A new call interrupts an old one that's still running: on a stage you are always
    // being told about the corner you're about to hit, never the one you just left.
    let t = Math.max(now + 0.02, Math.min(this.nextFree, now + 0.18));
    for (const b of bufs) {
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.connect(this.radio.input);
      src.start(t);
      t += b.duration + 0.045;
    }
    this.nextFree = t;
  }

  note(text) { return this.say(slugsFor(text)); }

  // Cut him off — a run ending, or a menu opening, shouldn't leave a note hanging.
  silence() {
    if (!this.ready) return;
    this.nextFree = 0;
    this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gain.gain.setTargetAtTime(1, this.ctx.currentTime + 0.15, 0.05);
  }
}
