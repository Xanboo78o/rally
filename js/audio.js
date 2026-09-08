// audio.js — a parameter-driven sound matrix, not one recorded file.
//
//                   ┌──► engine rpm / load ──► engine loop
//   game state ─────┼──► velocity ───────────► surface loop (pitch + volume)
//                   ├──► surface material ───► crossfades between surface banks
//                   ├──► slip ───────────────► harsher grinding layer fades in
//                   └──► suspension ─────────► one-shot thuds and creaks
//
// Everything continuous is a loop whose gain and pitch are driven live; everything
// impulsive is a one-shot picked at random from a bank and detuned, so nothing ever
// machine-guns. The banks below are SYNTHESISED PLACEHOLDERS — swap in real CC0
// samples by replacing the buffer builders, the parameter graph doesn't change.
// sound.html is the bench: sliders for every parameter, so it can be judged by ear.

const CENT = c => Math.pow(2, c / 1200);
const rnd = (a, b) => a + Math.random() * (b - a);

export const SURFACES = {
  //           filter        cut    Q     level  grain (loose stones pinging about)
  tarmac:  { type: 'highpass', f: 1800, q: 0.6, g: 0.75, grain: 0.00 },
  gravel:  { type: 'bandpass', f: 1250, q: 0.7, g: 1.00, grain: 0.85 },
  dirt:    { type: 'lowpass',  f: 1050, q: 1.1, g: 2.30, grain: 1.60 },   // off-road: loud and full of stones
  grass:   { type: 'lowpass',  f:  520, q: 0.9, g: 0.80, grain: 0.10 },
};

export class Sound {
  constructor() {
    this.ready = false;
    this.ctx = null;
    this.surface = 'gravel';
    this._lastThud = 0;
    this._lastGrain = 0;
    this._lastCrunch = 0;
  }

  // --- noise banks. Several different buffers so loops don't sound identical ------
  _noise(seconds, seed) {
    const n = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = seed >>> 0, last = 0;
    for (let i = 0; i < n; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const w = (s / 4294967296) * 2 - 1;
      last = last * 0.32 + w * 0.68;          // slight colouring, less fizzy than white
      d[i] = last;
    }
    return buf;
  }

  start() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(ctx.destination);

    // ---- ENGINE ---------------------------------------------------------------
    // Firing frequency, not crank speed: a four-pot fires twice a revolution. Saw
    // fundamental plus harmonics through a filter that opens up under load.
    this.engBus = ctx.createGain(); this.engBus.gain.value = 0;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 900;
    this.engFilter.Q.value = 1.1;
    this.engFilter.connect(this.engBus);
    this.engBus.connect(this.master);

    this.engOscs = [];
    for (const [mult, type, lvl] of [[0.5, 'square', 0.34], [1, 'sawtooth', 1.0], [2, 'sawtooth', 0.42], [3, 'sawtooth', 0.18]]) {
      const o = ctx.createOscillator();
      o.type = type;
      const g = ctx.createGain(); g.gain.value = lvl;
      o.connect(g); g.connect(this.engFilter);
      o.start();
      this.engOscs.push({ o, mult });
    }
    // Induction roar so it isn't a pure tone.
    this.engNoise = ctx.createBufferSource();
    this.engNoise.buffer = this._noise(2, 7);
    this.engNoise.loop = true;
    const engNf = ctx.createBiquadFilter();
    engNf.type = 'bandpass'; engNf.frequency.value = 420; engNf.Q.value = 0.8;
    this.engNoiseGain = ctx.createGain(); this.engNoiseGain.gain.value = 0.5;
    this.engNoise.connect(engNf); engNf.connect(this.engNoiseGain);
    this.engNoiseGain.connect(this.engFilter);
    this.engNoise.start();

    // ---- SURFACE BANKS --------------------------------------------------------
    // One loop per material, all running, crossfaded by the surface parameter.
    this.surf = {};
    let si = 0;
    for (const [name, cfg] of Object.entries(SURFACES)) {
      const src = ctx.createBufferSource();
      src.buffer = this._noise(3, 101 + si * 977);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = cfg.type; f.frequency.value = cfg.f; f.Q.value = cfg.q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
      this.surf[name] = { src, f, g, cfg };
      si++;
    }

    // A slow LFO on playback rate keeps the loops from ever repeating exactly.
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.23;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0.03;            // +/- 3%
    this.lfo.connect(this.lfoGain);
    for (const k of Object.keys(this.surf)) this.lfoGain.connect(this.surf[k].src.playbackRate);
    this.lfo.start();

    // ---- SLIP ----------------------------------------------------------------
    // The tell that you're sliding: harsher, higher, and it sits on top of everything.
    this.slipSrc = ctx.createBufferSource();
    this.slipSrc.buffer = this._noise(2, 5551);
    this.slipSrc.loop = true;
    this.slipF = ctx.createBiquadFilter();
    this.slipF.type = 'bandpass'; this.slipF.frequency.value = 2400; this.slipF.Q.value = 1.6;
    this.slipG = ctx.createGain(); this.slipG.gain.value = 0;
    this.slipSrc.connect(this.slipF); this.slipF.connect(this.slipG);
    this.slipG.connect(this.master);
    this.slipSrc.start();

    // ---- WIND -----------------------------------------------------------------
    this.windSrc = ctx.createBufferSource();
    this.windSrc.buffer = this._noise(2, 31337);
    this.windSrc.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'highpass'; wf.frequency.value = 620;
    this.windG = ctx.createGain(); this.windG.gain.value = 0;
    this.windSrc.connect(wf); wf.connect(this.windG); this.windG.connect(this.master);
    this.windSrc.start();

    // Impact one-shots share a few noise buffers, picked at random per hit.
    this.hitBufs = [this._noise(0.7, 11), this._noise(0.7, 222), this._noise(0.7, 3333), this._noise(0.7, 44444)];

    this.ready = true;
  }

  // p: { rpm01, speed01, surface, slip01, duck, airborne }
  update(p, dt) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const duck = p.duck ?? 1;
    const sp = Math.max(0, Math.min(1, p.speed01 || 0));
    const rpm = Math.max(0, Math.min(1, p.rpm01 || 0));
    const slip = Math.max(0, Math.min(1, p.slip01 || 0));

    // ---- engine: firing frequency and how open the filter is ------------------
    const f0 = 42 + rpm * 148;
    for (const { o, mult } of this.engOscs) o.frequency.setTargetAtTime(f0 * mult, now, 0.035);
    this.engFilter.frequency.setTargetAtTime(500 + rpm * 2600 + sp * 700, now, 0.05);
    this.engBus.gain.setTargetAtTime(0.115 * (0.42 + 0.58 * rpm) * duck, now, 0.04);
    this.engNoiseGain.gain.setTargetAtTime(0.22 + rpm * 0.5, now, 0.06);

    // ---- surfaces: crossfade the banks, drive level and pitch from speed -------
    if (p.surface && this.surf[p.surface]) this.surface = p.surface;
    for (const [name, s] of Object.entries(this.surf)) {
      const on = name === this.surface ? 1 : 0;
      const level = 0.10 * s.cfg.g * Math.pow(sp, 0.75) * duck * on;
      s.g.gain.setTargetAtTime(level, now, 0.15);         // crossfade, never a cut
      s.src.playbackRate.setTargetAtTime(0.72 + sp * 0.75, now, 0.10);
      s.f.frequency.setTargetAtTime(s.cfg.f * (0.72 + sp * 0.6), now, 0.10);
    }

    // Loose stones pinging off the underside — random, rate scales with speed.
    const grain = SURFACES[this.surface].grain;
    if (grain > 0 && duck > 0.5 && now - this._lastGrain > 0.045) {
      if (Math.random() < grain * sp * dt * 34) { this._ping(sp); this._lastGrain = now; }
    }

    // ---- slip ------------------------------------------------------------------
    this.slipG.gain.setTargetAtTime(0.085 * slip * Math.pow(sp, 0.6) * duck, now, 0.08);
    this.slipF.frequency.setTargetAtTime(1700 + slip * 1900, now, 0.08);

    // ---- wind: the only thing left when the wheels leave the ground ------------
    this.windG.gain.setTargetAtTime(0.014 * sp + 0.085 * sp * (1 - duck), now, 0.05);
  }

  // --- one-shots --------------------------------------------------------------
  _burst(buf, { gain, cut, q, type = 'bandpass', dur, rate = 1, delay = 0 }) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = cut; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  // Suspension: a body thud plus the shock topping out. Randomised bank and pitch so
  // repeated bumps never sound like the same sample twice.
  thud(force = 1) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - this._lastThud < 0.07) return;
    this._lastThud = now;
    const f = Math.max(0.05, Math.min(1, force));
    const buf = this.hitBufs[(Math.random() * this.hitBufs.length) | 0];
    const rate = CENT(rnd(-100, 100));

    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(rnd(95, 130), now);
    o.frequency.exponentialRampToValueAtTime(rnd(32, 44), now + 0.16);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.26 * (0.35 + f), now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + 0.4);

    this._burst(buf, { gain: 0.16 * f, cut: rnd(260, 420), q: 1.1, dur: 0.20, rate });
    if (f > 0.45) this._burst(buf, { gain: 0.07 * f, cut: rnd(2100, 3400), q: 2.4, dur: 0.10, rate: rate * 1.4, delay: 0.012 });
  }

  // A stone off the floorpan.
  _ping(sp) {
    const buf = this.hitBufs[(Math.random() * this.hitBufs.length) | 0];
    this._burst(buf, { gain: 0.020 + 0.03 * sp, cut: rnd(1700, 4200), q: rnd(5, 12), dur: rnd(0.04, 0.10), rate: CENT(rnd(-200, 200)) });
  }

  // Rolling it: panel crush plus glass and metal. Several detuned resonances stacked,
  // all randomised, so no two impacts in a tumble sound alike.
  crunch(force = 1) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - this._lastCrunch < 0.10) return;
    this._lastCrunch = now;
    const f = Math.max(0.15, Math.min(1, force));
    const buf = this.hitBufs[(Math.random() * this.hitBufs.length) | 0];

    // the deep crumple
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(rnd(70, 100), now);
    o.frequency.exponentialRampToValueAtTime(rnd(26, 38), now + 0.26);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.30 * f, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + 0.6);

    // tearing sheet metal
    this._burst(buf, { gain: 0.20 * f, cut: rnd(700, 1200), q: 0.9, dur: rnd(0.22, 0.40), rate: CENT(rnd(-150, 150)) });
    // ringing panels and glass
    for (let i = 0; i < 3; i++) {
      this._burst(buf, {
        gain: (0.05 + 0.05 * f) / (i + 1), cut: rnd(1800, 5200), q: rnd(8, 22),
        dur: rnd(0.10, 0.30), rate: CENT(rnd(-250, 250)), delay: rnd(0, 0.07),
      });
    }
  }
}
