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

  // One full four-stroke cycle at the given rpm: four firings, each a decaying
  // resonance plus a burst of noise, unevenly spaced and unevenly loud.
  _engineCycle(rpm, cylinders = 4) {
    const sr = this.ctx.sampleRate;
    const cycle = 120 / rpm;                    // seconds for two crank revolutions
    const n = Math.max(64, Math.floor(sr * cycle));
    const buf = this.ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    let s = 9871 + (rpm | 0);
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

    for (let c = 0; c < cylinders; c++) {
      const jitter = (rand() - 0.5) * 0.06;     // never perfectly even
      const at = Math.floor(n * ((c + 0.5) / cylinders + jitter));
      const amp = 0.72 + rand() * 0.45;
      const fRes = 95 + rand() * 85;            // exhaust resonance for this pot
      const decay = 0.0034 + rand() * 0.0028;
      const len = Math.min(n, Math.floor(sr * decay * 7));
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-t / decay);
        const tone = Math.sin(2 * Math.PI * fRes * t) + 0.45 * Math.sin(2 * Math.PI * fRes * 2.6 * t);
        const hiss = (rand() * 2 - 1) * 0.55 * Math.exp(-t / (decay * 0.4));
        d[(at + i) % n] += amp * env * (tone * 0.55 + hiss);
      }
    }
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < n; i++) d[i] /= peak;
    return buf;
  }

  start() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    // A limiter on the end means everything below can be driven properly loud without
    // the peaks clipping. The old chain sat at 0.6 with tiny bus levels under it, which
    // is why it was barely audible.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.004;
    this.limiter.release.value = 0.12;
    this.limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 1.5;
    this.master.connect(this.limiter);

    // ---- ENGINE ---------------------------------------------------------------
    // Sawtooth oscillators sound like a synth because an engine isn't a tone — it's a
    // string of combustion pulses. So the buffer below IS a firing sequence: four
    // bangs per cycle, each a sharp resonant burst that decays, with the timing and
    // level of each slightly uneven the way a real one never fires perfectly evenly.
    // Two of them at different reference revs, crossfaded, so neither gets stretched
    // far enough to sound like a tape slowing down.
    this.engBus = ctx.createGain(); this.engBus.gain.value = 0;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 900;
    this.engFilter.Q.value = 1.5;
    this.engFilter.connect(this.engBus);
    this.engBus.connect(this.master);

    this.engLayers = [];
    for (const refRpm of [1500, 4600]) {
      const src = ctx.createBufferSource();
      src.buffer = this._engineCycle(refRpm);
      src.loop = true;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(this.engFilter);
      src.start();
      this.engLayers.push({ src, g, refRpm });
    }

    // Low-order body boom, so it has some weight underneath the pulses.
    this.engSub = ctx.createOscillator();
    this.engSub.type = 'sine';
    this.engSubG = ctx.createGain(); this.engSubG.gain.value = 0;
    this.engSub.connect(this.engSubG); this.engSubG.connect(this.master);
    this.engSub.start();

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

    // ---- engine: play the firing sequence at the right rate --------------------
    const revs = 850 + rpm * 6400;
    for (const L of this.engLayers) {
      L.src.playbackRate.setTargetAtTime(revs / L.refRpm, now, 0.03);
      // Crossfade toward whichever reference is closer, in octaves.
      const dist = Math.abs(Math.log2(revs / L.refRpm));
      L.g.gain.setTargetAtTime(Math.max(0, 1 - dist * 0.85), now, 0.05);
    }
    this.engFilter.frequency.setTargetAtTime(620 + rpm * 3400 + sp * 900, now, 0.05);
    this.engBus.gain.setTargetAtTime(0.34 * (0.45 + 0.55 * rpm) * duck, now, 0.04);
    this.engSub.frequency.setTargetAtTime(revs / 60 * 2, now, 0.04);
    this.engSubG.gain.setTargetAtTime(0.075 * (0.3 + 0.7 * rpm) * duck, now, 0.05);

    // ---- surfaces: crossfade the banks, drive level and pitch from speed -------
    if (p.surface && this.surf[p.surface]) this.surface = p.surface;
    for (const [name, s] of Object.entries(this.surf)) {
      const on = name === this.surface ? 1 : 0;
      const level = 0.26 * s.cfg.g * Math.pow(sp, 0.75) * duck * on;
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
    this.slipG.gain.setTargetAtTime(0.20 * slip * Math.pow(sp, 0.6) * duck, now, 0.08);
    this.slipF.frequency.setTargetAtTime(1700 + slip * 1900, now, 0.08);

    // ---- wind: the only thing left when the wheels leave the ground ------------
    this.windG.gain.setTargetAtTime(0.05 * sp + 0.22 * sp * (1 - duck), now, 0.05);
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
    g.gain.exponentialRampToValueAtTime(0.46 * (0.35 + f), now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + 0.4);

    this._burst(buf, { gain: 0.30 * f, cut: rnd(260, 420), q: 1.1, dur: 0.20, rate });
    if (f > 0.45) this._burst(buf, { gain: 0.14 * f, cut: rnd(2100, 3400), q: 2.4, dur: 0.10, rate: rate * 1.4, delay: 0.012 });
  }

  // A stone off the floorpan.
  _ping(sp) {
    const buf = this.hitBufs[(Math.random() * this.hitBufs.length) | 0];
    this._burst(buf, { gain: 0.045 + 0.06 * sp, cut: rnd(1700, 4200), q: rnd(5, 12), dur: rnd(0.04, 0.10), rate: CENT(rnd(-200, 200)) });
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
    g.gain.exponentialRampToValueAtTime(0.55 * f, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + 0.6);

    // tearing sheet metal
    this._burst(buf, { gain: 0.38 * f, cut: rnd(700, 1200), q: 0.9, dur: rnd(0.22, 0.40), rate: CENT(rnd(-150, 150)) });
    // ringing panels and glass
    for (let i = 0; i < 3; i++) {
      this._burst(buf, {
        gain: (0.10 + 0.10 * f) / (i + 1), cut: rnd(1800, 5200), q: rnd(8, 22),
        dur: rnd(0.10, 0.30), rate: CENT(rnd(-250, 250)), delay: rnd(0, 0.07),
      });
    }
  }
}
