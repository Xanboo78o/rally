// audio.js — a parameter-driven sound matrix, not one recorded file.
//
//                   ┌──► engine rpm / load ──► engine loop
//   game state ─────┼──► velocity ───────────► surface loop (pitch + volume)
//                   ├──► surface material ───► crossfades between surface banks
//                   ├──► slip ───────────────► harsher grinding layer fades in
//                   └──► suspension ─────────► one-shot thuds and creaks
//
//                   └──► WHERE YOU ARE ──────► how big the space is, and how dark
//
// Everything continuous is a loop whose gain and pitch are driven live; everything
// impulsive is a one-shot picked at random from a bank and detuned, so nothing ever
// machine-guns.
//
// STEREO. Everything outside the car is placed. Stones off the wheels scatter across
// the field, the gravel bed is two copies of the same recording pulled apart left and
// right, the slide moves to the side the back end is going, and dropping a wheel off
// makes the noise come from THAT side of the car — which is the one cue that tells you
// which way to correct without looking.
//
// SPACE. Outside sound goes through a room before it reaches you: a short pre-delay
// into three tuned feedback lines, panned apart. It is not decoration — it is how the
// gorge sounds like a gorge and the village sounds like walls a metre away. The size,
// the decay, the darkness and the wet level all come from js/atmos.js, per place, so
// the world closes in around you at exactly the point the fog does. The banks below are SYNTHESISED PLACEHOLDERS — swap in real CC0
// samples by replacing the buffer builders, the parameter graph doesn't change.
// sound.html is the bench: sliders for every parameter, so it can be judged by ear.

const CENT = c => Math.pow(2, c / 1200);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp1 = v => Math.max(-1, Math.min(1, v));

// Which way round the stereo field is. Derived, not guessed: the camera is rotated by
// PI + yaw, so its local +X maps to world -X, which puts world +X on the driver's LEFT
// — and stage.sample()'s `lateral` is measured along +X at zero heading. So a positive
// lateral means the car is off toward the driver's left, and StereoPanner wants -1 for
// left. Hence the negation in main.js. If it ever sounds mirrored on a real device,
// flip this rather than re-deriving it.
export const SOUND = { panInvert: false };
const PAN = v => clamp1(SOUND.panInvert ? -v : v);

// Real recordings, granular. None of these files is a continuous "driving on gravel"
// loop — they're discrete events (falling rock, digging dirt, snapping sticks). So the
// ground is built the way good gravel always is: one sustained BED underneath, plus a
// stream of GRAINS — short random windows cut out of the one-shots, fired at a rate
// that scales with speed, each at a random pitch. That's the same shape as the matrix
// spec, and it's why it never machine-guns however long you drive.
export const SURFACES = {
  tarmac: { bed: null, bedGain: 0, bedRate: 1.0, cut: 2200, q: 0.6,
            grain: [], rate: 0, gGain: 0 },
  gravel: { bed: 'dirt-bed', bedGain: 0.62, bedRate: 1.00, cut: 1500, q: 0.9,
            grain: ['grit-1', 'grit-2', 'grit-3', 'rock-1'], rate: 16, gGain: 0.55 },
  // Off the road: louder bed, and the bank gains sticks and wood, because that's what
  // you're actually driving through out there.
  dirt:   { bed: 'dirt-bed', bedGain: 1.15, bedRate: 1.22, cut: 1050, q: 1.2,
            grain: ['grit-1', 'grit-2', 'rock-1', 'rock-2', 'stick-1', 'stick-2', 'stick-3', 'wood-1'],
            rate: 40, gGain: 1.0 },
  grass:  { bed: 'dirt-bed', bedGain: 0.85, bedRate: 0.92, cut: 700, q: 1.1,
            grain: ['stick-1', 'stick-2', 'stick-3', 'wood-1', 'grit-2'], rate: 30, gGain: 0.9 },
};

const CLIPS = ['dirt-bed', 'grit-1', 'grit-2', 'grit-3', 'rock-1', 'rock-2', 'rock-3',
               'smash-1', 'stick-1', 'stick-2', 'stick-3', 'wood-1'];

export class Sound {
  constructor() {
    this.ready = false;
    this.ctx = null;
    this.surface = 'gravel';
    this.groundPan = 0;        // which side of the car the ground noise is coming from
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

  // MANY cycles, not one. Looping a single cycle was the mistake: the per-firing
  // irregularity I baked in then repeated identically forever, which makes it a fixed
  // periodic waveform — which is a tone with harmonics, which is a synth. Engines
  // don't repeat. Twenty cycles, each firing different, and the loop is long enough
  // that the ear stops hearing a period at all.
  _engineLoop(rpm, cylinders = 4, cycles = 20) {
    const sr = this.ctx.sampleRate;
    const cycle = 120 / rpm;                    // seconds for two crank revolutions
    const n = Math.max(256, Math.floor(sr * cycle * cycles));
    const buf = this.ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    let s = 9871 + (rpm | 0);
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

    const total = cycles * cylinders;
    for (let k = 0; k < total; k++) {
      const ci = Math.floor(k / cylinders), pot = k % cylinders;
      const jitter = (rand() - 0.5) * 0.05;
      const at = Math.floor(sr * cycle * (ci + (pot + 0.5) / cylinders + jitter));
      const amp = 0.62 + rand() * 0.6;
      const fRes = 88 + rand() * 110;
      const decay = 0.0030 + rand() * 0.0034;
      const len = Math.min(n - 1, Math.floor(sr * decay * 8));
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-t / decay);
        const tone = Math.sin(2 * Math.PI * fRes * t) + 0.42 * Math.sin(2 * Math.PI * fRes * 2.6 * t);
        const hiss = (rand() * 2 - 1) * 0.6 * Math.exp(-t / (decay * 0.35));
        d[(at + i) % n] += amp * env * (tone * 0.5 + hiss);
      }
    }
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < n; i++) d[i] /= peak;
    return buf;
  }

  async _loadAll() {
    // Decoded in the background. Everything below degrades gracefully until they land,
    // so a slow connection never blocks the start of a run.
    await Promise.all(CLIPS.map(async name => {
      try {
        const res = await fetch('./audio/' + name + '.mp3');
        this.buf[name] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch (e) { /* keep going without it */ }
    }));
    // TWO copies of the one bed recording, started at different points in the file and
    // running at slightly different rates, hard left and hard right. Because they drift
    // against each other they never correlate, so a mono recording becomes a wide,
    // moving surface instead of a stripe down the middle of your head. This is most of
    // what makes the gravel feel like it's under the whole car.
    const bed = this.buf['dirt-bed'];
    if (bed && !this.bedSrcs.length) {
      for (const [off, rate, pan] of [[0.00, 1.000, -0.85], [0.37, 1.017, 0.85]]) {
        const src = this.ctx.createBufferSource();
        src.buffer = bed;
        src.loop = true;
        src.playbackRate.value = rate;
        const pn = this.ctx.createStereoPanner();
        pn.pan.value = pan;
        src.connect(pn);
        pn.connect(this.bedFilter);
        this.lfoGain.connect(src.playbackRate);
        src.start(0, off * bed.duration);
        this.bedSrcs.push({ src, rate });
      }
    }
    this.loaded = true;
  }

  // A GRAIN: a short window cut from a random point in a real recording, at a random
  // pitch. A handful of files gives effectively endless variation this way.
  _grain(name, gain, dur, rate = 1, delay = 0, pan = null) {
    const b = this.buf[name];
    if (!b) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008);
    g.gain.setValueAtTime(Math.max(0.0002, gain), t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // Every stone lands somewhere. Scattered around wherever the ground currently is,
    // so on the road they spray across the whole field and off it they pile up on the
    // side you dropped the wheel.
    const pn = ctx.createStereoPanner();
    pn.pan.value = PAN(pan === null ? rnd(-0.9, 0.9) : clamp1(pan));
    src.connect(g); g.connect(pn); pn.connect(this.grainBus);
    const off = Math.random() * Math.max(0.01, b.duration - dur * rate - 0.02);
    src.start(t, off, dur * rate + 0.02);
    src.stop(t + dur + 0.05);
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

    // ---- THE WORLD BUS --------------------------------------------------------
    // Everything that happens OUTSIDE the car goes through here: gravel, stones, wind,
    // the slide, panel impacts. One lowpass on it is the bodywork you're sitting in —
    // close it down and the world goes muffled, which is what actually happens when the
    // wheels leave the ground, and it's a far better takeoff cue than gain alone.
    this.worldBus = ctx.createGain();
    this.worldLP = ctx.createBiquadFilter();
    this.worldLP.type = 'lowpass';
    this.worldLP.frequency.value = 9000;
    this.worldLP.Q.value = 0.5;
    this.worldBus.connect(this.worldLP);
    this.worldLP.connect(this.master);

    // ---- THE SPACE ------------------------------------------------------------
    // A feedback delay network rather than a convolver: three short lines with damped
    // feedback. It costs almost nothing, and unlike a fixed impulse response every
    // dimension of it can be MOVED while you drive — which is the whole point, because
    // the room has to grow as the gorge closes in. Times are mutually prime so they
    // never line up into a single ringing pitch.
    this.spaceOut = ctx.createGain();
    this.spaceOut.gain.value = 0;
    this.spaceOut.connect(this.master);

    this.spaceIn = ctx.createGain();
    this.spaceIn.gain.value = 1;
    this.worldLP.connect(this.spaceIn);

    this.preDelay = ctx.createDelay(0.5);
    this.preDelay.delayTime.value = 0.03;
    this.spaceIn.connect(this.preDelay);

    this.spaceLines = [];
    const LINES = [[0.0297, -0.85], [0.0411, 0.10], [0.0577, 0.85]];
    for (const [base, panPos] of LINES) {
      const d = ctx.createDelay(1.5);
      d.delayTime.value = base;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4;
      const fb = ctx.createGain(); fb.gain.value = 0.45;
      const pan = ctx.createStereoPanner(); pan.pan.value = panPos;
      // d -> lp -> fb -> d is the loop; the tap comes off lp so the output is damped
      // the same way the feedback is.
      this.preDelay.connect(d);
      d.connect(lp);
      lp.connect(fb);
      fb.connect(d);
      lp.connect(pan);
      pan.connect(this.spaceOut);
      this.spaceLines.push({ d, lp, fb, base });
    }

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

    // Three references instead of two, so idle is genuinely slow thumps rather than a
    // fast loop dragged down to a crawl.
    this.engLayers = [];
    for (const refRpm of [950, 2500, 5600]) {
      const src = ctx.createBufferSource();
      src.buffer = this._engineLoop(refRpm);
      src.loop = true;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(this.engFilter);
      src.start();
      this.engLayers.push({ src, g, refRpm });
    }

    // EXHAUST FORMANTS. Fixed resonances alongside the dry signal, so the engine keeps
    // one voice while its pitch moves — the way a real pipe does, since its length
    // doesn't change with revs. This is a lot of what stops it sounding like a synth.
    // Panned apart, which is the cheap way to stop the engine being a single point in
    // the middle of your head. The body boom stays centred (you feel that through the
    // seat, it has no direction); the pipe resonances spread.
    for (const [f, q, g, pan] of [[128, 8, 1.0, 0.0], [385, 5.5, 0.6, -0.35], [1040, 3.5, 0.32, 0.40]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const gg = ctx.createGain(); gg.gain.value = g;
      const pn = ctx.createStereoPanner(); pn.pan.value = pan;
      this.engFilter.connect(bp); bp.connect(gg); gg.connect(pn); pn.connect(this.engBus);
    }

    // A little of the engine goes out into the world, so it echoes off the gorge walls
    // and off the houses. Only a little: most of what you hear is coming through the
    // bulkhead a foot in front of you, not off the scenery.
    this.engSend = ctx.createGain();
    this.engSend.gain.value = 0.35;
    this.engBus.connect(this.engSend);
    this.engSend.connect(this.spaceIn);

    // Low-order body boom, so it has some weight underneath the pulses.
    this.engSub = ctx.createOscillator();
    this.engSub.type = 'sine';
    this.engSubG = ctx.createGain(); this.engSubG.gain.value = 0;
    this.engSub.connect(this.engSubG); this.engSubG.connect(this.master);
    this.engSub.start();

    // ---- SURFACE: one sampled bed, retuned per material -----------------------
    this.bedGain = ctx.createGain(); this.bedGain.gain.value = 0;
    this.bedFilter = ctx.createBiquadFilter();
    this.bedFilter.type = 'lowpass';
    this.bedFilter.frequency.value = 1400;
    this.bedFilter.Q.value = 1.0;
    this.bedFilter.connect(this.bedGain);
    this.bedGain.connect(this.worldBus);
    this.bedSrcs = [];           // started once the sample has decoded

    // A slow wander on the bed's playback rate, so a looped recording never lands on
    // the same texture twice however long you hold a speed.
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.value = 0.23;
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = 0.03;            // +/- 3%
    this.lfo.connect(this.lfoGain);
    this.lfo.start();

    // Grains and impacts share this bus so the whole ground can be ducked at once.
    this.grainBus = ctx.createGain(); this.grainBus.gain.value = 1;
    this.grainBus.connect(this.worldBus);

    this.buf = {};
    this._loadAll();

    // ---- SLIP ----------------------------------------------------------------
    // The tell that you're sliding: harsher, higher, and it sits on top of everything.
    this.slipSrc = ctx.createBufferSource();
    this.slipSrc.buffer = this._noise(2, 5551);
    this.slipSrc.loop = true;
    this.slipF = ctx.createBiquadFilter();
    this.slipF.type = 'bandpass'; this.slipF.frequency.value = 2400; this.slipF.Q.value = 1.6;
    this.slipG = ctx.createGain(); this.slipG.gain.value = 0;
    // The scrub moves to whichever side the back end has gone, so a slide has a
    // direction you can hear before you can see it in a first-person view.
    this.slipPan = ctx.createStereoPanner();
    this.slipSrc.connect(this.slipF); this.slipF.connect(this.slipG);
    this.slipG.connect(this.slipPan); this.slipPan.connect(this.worldBus);
    this.slipSrc.start();

    // ---- WIND -----------------------------------------------------------------
    // Two DIFFERENT noise buffers, one per ear. The same buffer panned twice is still
    // mono and collapses into the centre; two uncorrelated ones open right up, which is
    // what you want the instant the wheels leave the ground and wind is all there is.
    this.windG = ctx.createGain(); this.windG.gain.value = 0;
    this.windG.connect(this.master);
    for (const [seed, pan] of [[31337, -0.9], [90210, 0.9]]) {
      const src = ctx.createBufferSource();
      src.buffer = this._noise(2, seed);
      src.loop = true;
      const wf = ctx.createBiquadFilter();
      wf.type = 'highpass'; wf.frequency.value = 620;
      const pn = ctx.createStereoPanner(); pn.pan.value = pan;
      src.connect(wf); wf.connect(pn); pn.connect(this.windG);
      src.start();
    }

    // Impact one-shots share a few noise buffers, picked at random per hit.
    this.hitBufs = [this._noise(0.7, 11), this._noise(0.7, 222), this._noise(0.7, 3333), this._noise(0.7, 44444)];

    this.ready = true;
  }

  // p: { rpm01, speed01, surface, slip01, duck, airborne, pan, slipDir, atmos }
  //    pan     -1..1  which side of the car the ground noise is coming from
  //    slipDir -1..1  which way the back end has stepped out
  //    atmos   { space, size, decay, tone, dark, air } straight out of js/atmos.js
  update(p, dt) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const duck = p.duck ?? 1;
    const sp = Math.max(0, Math.min(1, p.speed01 || 0));
    const rpm = Math.max(0, Math.min(1, p.rpm01 || 0));
    const slip = Math.max(0, Math.min(1, p.slip01 || 0));

    // ---- where you are --------------------------------------------------------
    const A = p.atmos || {};
    // Stored RAW. PAN() is applied at each point of use (grains, bursts, thuds), so
    // baking it in here too would invert twice and quietly cancel the flag out.
    this.groundPan = clamp1(p.pan || 0);

    // The bodywork. It shuts down as the wheels leave the ground: the world going
    // muffled is a much stronger takeoff cue than the world merely going quiet, and it
    // costs one filter. It also closes in the places that are closed in.
    const dark = (A.dark ?? 9000) * (0.14 + 0.86 * duck);
    this.worldLP.frequency.setTargetAtTime(Math.max(220, dark), now, 0.08);

    // The room. Wet level, pre-delay, line lengths, feedback and damping all move
    // together, so "somewhere bigger" is one number in the atmos table rather than six
    // here. Ducked with the rest on takeoff — there's nothing to reflect off up there.
    const size = A.size ?? 0.04;
    this.spaceOut.gain.setTargetAtTime((A.space ?? 0.15) * 0.85 * (0.25 + 0.75 * duck), now, 0.4);
    this.preDelay.delayTime.setTargetAtTime(Math.min(0.4, size), now, 0.5);
    for (const L of this.spaceLines) {
      L.d.delayTime.setTargetAtTime(L.base * (0.55 + size * 8.5), now, 0.5);
      L.fb.gain.setTargetAtTime(Math.min(0.86, A.decay ?? 0.4), now, 0.5);
      L.lp.frequency.setTargetAtTime(A.tone ?? 2400, now, 0.4);
    }

    // ---- engine: play the firing sequence at the right rate --------------------
    const revs = 850 + rpm * 6400;
    for (const L of this.engLayers) {
      L.src.playbackRate.setTargetAtTime(revs / L.refRpm, now, 0.03);
      // Crossfade toward whichever reference is closer, in octaves.
      const dist = Math.abs(Math.log2(revs / L.refRpm));
      L.g.gain.setTargetAtTime(Math.max(0, 1 - dist * 1.15), now, 0.05);
    }
    this.engFilter.frequency.setTargetAtTime(620 + rpm * 3400 + sp * 900, now, 0.05);
    this.engBus.gain.setTargetAtTime(0.34 * (0.45 + 0.55 * rpm) * duck, now, 0.04);
    this.engSub.frequency.setTargetAtTime(revs / 60 * 2, now, 0.04);
    this.engSubG.gain.setTargetAtTime(0.075 * (0.3 + 0.7 * rpm) * duck, now, 0.05);

    // ---- surfaces -------------------------------------------------------------
    if (p.surface && SURFACES[p.surface]) this.surface = p.surface;
    const S = SURFACES[this.surface];

    // The bed is one recording retuned per material, so switching surfaces is a
    // crossfade of gain/pitch/filter rather than a cut between clips.
    this.bedGain.gain.setTargetAtTime(0.62 * S.bedGain * Math.pow(sp, 0.7) * duck, now, 0.14);
    for (const B of this.bedSrcs) {
      B.src.playbackRate.setTargetAtTime(B.rate * S.bedRate * (0.68 + sp * 0.62), now, 0.12);
    }
    this.bedFilter.frequency.setTargetAtTime(S.cut * (0.7 + sp * 0.65), now, 0.12);
    this.bedFilter.Q.setTargetAtTime(S.q, now, 0.2);

    // Grains: stones and sticks flying off the surface. Rate rises with speed, and
    // each one is a different window at a different pitch.
    this.grainBus.gain.setTargetAtTime(duck, now, 0.05);
    if (S.grain.length && duck > 0.45) {
      const n = S.rate * Math.pow(sp, 1.25) * dt;
      let tries = n > 1 ? Math.floor(n) : 0;
      if (Math.random() < n - tries) tries++;
      for (let i = 0; i < Math.min(tries, 4); i++) {
        const name = S.grain[(Math.random() * S.grain.length) | 0];
        // On the road the spray is symmetrical; off it, it collects hard on the side
        // that's actually in the dirt. That asymmetry is the whole point.
        const spread = 1 - 0.55 * Math.abs(this.groundPan);
        this._grain(name, (0.20 + 0.28 * sp) * S.gGain, rnd(0.06, 0.20),
                    CENT(rnd(-450, 450)), rnd(0, 0.03),
                    this.groundPan + rnd(-spread, spread));
      }
    }

    // ---- slip ------------------------------------------------------------------
    this.slipG.gain.setTargetAtTime(0.20 * slip * Math.pow(sp, 0.6) * duck, now, 0.08);
    this.slipF.frequency.setTargetAtTime(1700 + slip * 1900, now, 0.08);
    this.slipPan.pan.setTargetAtTime(PAN(clamp1((p.slipDir || 0) * 0.75)), now, 0.12);

    // ---- wind: the only thing left when the wheels leave the ground ------------
    this.windG.gain.setTargetAtTime((0.05 * sp + 0.22 * sp * (1 - duck)) * (A.air ?? 1), now, 0.05);
  }

  // --- one-shots --------------------------------------------------------------
  _burst(buf, { gain, cut, q, type = 'bandpass', dur, rate = 1, delay = 0, pan = 0, dry = false }) {
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
    const pn = ctx.createStereoPanner();
    pn.pan.value = PAN(clamp1(pan));
    // Impacts go out through the world bus so they echo off the place you're in — a
    // roll in the gorge should come back at you. `dry` keeps the ones that are really
    // happening inside the car out of the room.
    src.connect(f); f.connect(g); g.connect(pn);
    pn.connect(dry ? this.master : this.worldBus);
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
    // Which corner took the hit. Biased toward whichever side the ground is on, so a
    // wheel dropped off the left thumps on the left.
    const side = clamp1(this.groundPan * 0.7 + rnd(-0.45, 0.45));

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

    this._burst(buf, { gain: 0.30 * f, cut: rnd(260, 420), q: 1.1, dur: 0.20, rate, pan: side, dry: true });
    if (f > 0.45) this._burst(buf, { gain: 0.14 * f, cut: rnd(2100, 3400), q: 2.4, dur: 0.10, rate: rate * 1.4, delay: 0.012, pan: side });
  }

  // A stone off the floorpan.
  _ping(sp) {
    this._grain(Math.random() < 0.5 ? 'grit-1' : 'rock-1', 0.16 + 0.2 * sp,
                rnd(0.05, 0.13), CENT(rnd(-500, 500)));
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

    // Real debris on top of the synthesised crumple: rock smashing, wood splitting,
    // stone tumbling. Two or three at once, all pitched differently.
    // Debris goes everywhere, so every piece of it lands somewhere different — which
    // is a big part of why a roll reads as the car coming apart around you rather than
    // as one sample being played.
    const wreck = ['smash-1', 'rock-2', 'rock-3', 'wood-1', 'stick-3'];
    for (let i = 0; i < 3; i++) {
      this._grain(wreck[(Math.random() * wreck.length) | 0], (0.45 + 0.4 * f) / (i * 0.6 + 1),
                  rnd(0.18, 0.55), CENT(rnd(-350, 250)), rnd(0, 0.09), rnd(-1, 1));
    }
    // tearing sheet metal
    this._burst(buf, { gain: 0.22 * f, cut: rnd(700, 1200), q: 0.9, dur: rnd(0.22, 0.40), rate: CENT(rnd(-150, 150)), pan: rnd(-0.5, 0.5) });
    // ringing panels and glass
    for (let i = 0; i < 3; i++) {
      this._burst(buf, {
        gain: (0.10 + 0.10 * f) / (i + 1), cut: rnd(1800, 5200), q: rnd(8, 22),
        dur: rnd(0.10, 0.30), rate: CENT(rnd(-250, 250)), delay: rnd(0, 0.07), pan: rnd(-1, 1),
      });
    }
  }
}
