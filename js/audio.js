// audio.js — PLACEHOLDER SOUND ONLY.
//
// Adam's standing rule is that real noises get sourced from CC0 stock, not synthesised
// by me. This module exists because the single most important trick for making air time
// feel huge is CUTTING the sound on takeoff, and that can't be judged in silence. So:
// a stand-in engine, gravel and wind bed, wired so real samples replace them without
// touching anything else. Swap the three source nodes, keep the gain envelopes.

export class Sound {
  constructor() {
    this.ready = false;
    this.ctx = null;
    this.airDuck = 1;   // 1 = on the ground, ~0 = flying
  }

  start() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(ctx.destination);

    // --- engine: [PLACEHOLDER] swap for a looped CC0 engine sample ------------
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 1300;
    this.osc = ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = 60;
    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'square';
    this.osc2.frequency.value = 30;
    const sub = ctx.createGain(); sub.gain.value = 0.35;
    this.osc.connect(this.engFilter);
    this.osc2.connect(sub); sub.connect(this.engFilter);
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.master);
    this.osc.start(); this.osc2.start();

    // --- noise bed, used for both gravel and wind ----------------------------
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const mkNoise = (type, freq, gain) => {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
      return { g, f };
    };
    this.gravel = mkNoise('bandpass', 900, 0);
    this.wind = mkNoise('highpass', 520, 0);

    this.ready = true;
  }

  // Called every frame. airDuck is driven by the air module.
  update(speedFactor, onRoad, airDuck, dt) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const s = Math.max(0, Math.min(1, speedFactor));
    this.airDuck = airDuck;

    // Engine note climbs with speed. Sound of the road disappears in the air.
    const rpm = 55 + s * 190;
    this.osc.frequency.setTargetAtTime(rpm, now, 0.05);
    this.osc2.frequency.setTargetAtTime(rpm * 0.5, now, 0.05);
    this.engFilter.frequency.setTargetAtTime(700 + s * 2100, now, 0.06);
    this.engGain.gain.setTargetAtTime(0.10 * (0.35 + 0.65 * s) * airDuck, now, 0.03);

    const gravelAmt = onRoad ? 0.055 : 0.115;
    this.gravel.g.gain.setTargetAtTime(gravelAmt * s * airDuck, now, 0.05);
    this.gravel.f.frequency.setTargetAtTime(700 + s * 1400, now, 0.08);

    // Wind is the only thing left when you're flying — it's what makes air feel long.
    this.wind.g.gain.setTargetAtTime(0.016 * s + 0.075 * s * (1 - airDuck), now, 0.05);
  }

  // --- landing slam: [PLACEHOLDER] swap for a CC0 impact sample --------------
  thud(strength) {
    if (!this.ready) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, now);
    o.frequency.exponentialRampToValueAtTime(38, now + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.30 * (0.4 + strength), now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + 0.45);
  }
}
