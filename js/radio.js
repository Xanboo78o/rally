// radio.js — the co-driver does not reach you through the air. He's a foot away with a
// helmet on, shouting into a mic that cost forty quid, and it comes back at you through
// an earpiece. That whole path is what makes a pace note sound like a pace note rather
// than like a man in a room, and it's four cheap nodes.
//
// It's a live chain rather than something baked into the files, because the intercom is
// part of the CAR: it can get worse when the car is damaged, duck under a big landing,
// and crackle when you're off the road. None of that is possible once it's printed into
// an mp3.

// Drive curve. tanh, so it rounds over rather than snapping off — a real preamp running
// out of headroom compresses before it clips, and the difference between those two is
// most of why cheap distortion sounds digital.
function driveCurve(amount) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return c;
}

export const PRESETS = {
  // A modern helmet intercom: band-limited but not thin, and mostly clean. The safe one.
  helmet: { hp: 320,  lp: 3600, peak: 1900, peakG: 6,  scoop: -3, drive: 2.0, comp: -22, hiss: 0.0020 },
  // Cheap and overdriven — a bargain-bin unit being shouted into. More character, and
  // more of it survives being buried under an engine.
  cheap:  { hp: 480,  lp: 2900, peak: 2200, peakG: 9,  scoop: -5, drive: 4.5, comp: -26, hiss: 0.0055 },
  // Actively failing. For a damaged car, and for the moment after a big one.
  broken: { hp: 620,  lp: 2300, peak: 2600, peakG: 12, scoop: -7, drive: 8.0, comp: -30, hiss: 0.0130 },
};

// Returns { input, output, set(name), gain } — patch a source into `input`, take
// `output` to wherever the voice should land (dry, not the world bus: it's inside your
// helmet, so the gorge does not get to echo it).
export function makeRadio(ctx, name = 'helmet') {
  const input = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.Q.value = 0.7;
  // The presence peak IS the sound of a small speaker. Everything else is subtraction;
  // this is the only thing being added, and it's what makes it honk.
  const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.Q.value = 1.6;
  // Scooping the low mids is what stops it sounding like a man with a blanket on his
  // head — band-limiting alone leaves the mud behind.
  const scoop = ctx.createBiquadFilter(); scoop.type = 'peaking'; scoop.frequency.value = 700; scoop.Q.value = 1.2;
  const shaper = ctx.createWaveShaper(); shaper.oversample = '4x';
  // Hard compression, because an intercom has no dynamics at all — a whisper and a
  // scream arrive at the same level, which is exactly why the SHOUTING reads as panic
  // rather than as volume.
  const comp = ctx.createDynamicsCompressor();
  comp.ratio.value = 12; comp.attack.value = 0.004; comp.release.value = 0.12; comp.knee.value = 6;
  const makeup = ctx.createGain();
  const out = ctx.createGain();

  // Carrier hiss, always on underneath. The line is open even when nobody's talking,
  // and that continuous floor is a surprising amount of the illusion — silence between
  // notes sounds like a file ending; hiss sounds like a channel.
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = nb.getChannelData(0);
  let s = 22222;
  for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 2147483648) - 1; }
  const hiss = ctx.createBufferSource(); hiss.buffer = nb; hiss.loop = true;
  const hissF = ctx.createBiquadFilter(); hissF.type = 'bandpass'; hissF.frequency.value = 2000; hissF.Q.value = 0.8;
  const hissG = ctx.createGain(); hissG.gain.value = 0;
  hiss.connect(hissF); hissF.connect(hissG); hissG.connect(out);
  hiss.start();

  input.connect(hp); hp.connect(lp); lp.connect(peak); peak.connect(scoop);
  scoop.connect(shaper); shaper.connect(comp); comp.connect(makeup); makeup.connect(out);

  function set(n) {
    const P = PRESETS[n] || PRESETS.helmet;
    const t = ctx.currentTime;
    hp.frequency.setTargetAtTime(P.hp, t, 0.02);
    lp.frequency.setTargetAtTime(P.lp, t, 0.02);
    peak.frequency.setTargetAtTime(P.peak, t, 0.02);
    peak.gain.setTargetAtTime(P.peakG, t, 0.02);
    scoop.gain.setTargetAtTime(P.scoop, t, 0.02);
    shaper.curve = driveCurve(P.drive);
    comp.threshold.setTargetAtTime(P.comp, t, 0.02);
    // Harder drive and harder compression both make it louder, so pull it back by
    // roughly what they added or switching preset becomes a volume test.
    makeup.gain.setTargetAtTime(1 / (1 + P.drive * 0.16), t, 0.02);
    hissG.gain.setTargetAtTime(P.hiss, t, 0.05);
    return P;
  }
  set(name);

  return { input, output: out, set, gain: out.gain, _hiss: hissG };
}
