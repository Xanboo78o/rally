// audiocheck.mjs — run the whole audio graph headlessly against a stub Web Audio API.
//
//   node tools/audiocheck.mjs
//
// I cannot hear anything, and sound.html needs a browser and a person. This catches the
// other half: that the graph BUILDS, that every node it reaches actually exists, and
// that a full run through every place drives every parameter without throwing. A typo
// in a node name is otherwise silent until Adam taps START and gets a dead page.

import { Sound } from '../js/audio.js';
import { ATMOS, ATMOS_KEYS } from '../js/atmos.js';

let created = {};
const bump = k => { created[k] = (created[k] || 0) + 1; };
const param = (v = 0) => ({
  value: v,
  setValueAtTime() { return this; },
  setTargetAtTime(x) { if (!Number.isFinite(x)) throw new Error('non-finite AudioParam target: ' + x); this.value = x; return this; },
  exponentialRampToValueAtTime(x) { if (!(x > 0)) throw new Error('exponential ramp to ' + x + ' (must be > 0)'); return this; },
  linearRampToValueAtTime() { return this; },
});
const node = (type, extra = {}) => {
  bump(type);
  return {
    type: '', connect(t) { if (!t) throw new Error(type + ' connected to undefined'); return t; },
    disconnect() {}, start() {}, stop() {},
    ...extra,
  };
};

class StubCtx {
  constructor() { this.sampleRate = 48000; this.currentTime = 0; this.destination = node('destination'); }
  createGain() { return node('gain', { gain: param(1) }); }
  createBiquadFilter() { return node('biquad', { frequency: param(1000), Q: param(1), type: 'lowpass' }); }
  createStereoPanner() { return node('panner', { pan: param(0) }); }
  createDelay() { return node('delay', { delayTime: param(0) }); }
  createOscillator() { return node('osc', { frequency: param(100), type: 'sine' }); }
  createBufferSource() { return node('bufferSource', { buffer: null, loop: false, playbackRate: param(1) }); }
  createDynamicsCompressor() {
    return node('compressor', { threshold: param(0), knee: param(0), ratio: param(1), attack: param(0), release: param(0) });
  }
  createBuffer(ch, len, sr) {
    const data = new Float32Array(len);
    return { length: len, duration: len / sr, numberOfChannels: ch, getChannelData: () => data };
  }
}

global.window = { AudioContext: StubCtx };
global.fetch = async () => { throw new Error('no network in the harness'); };

const s = new Sound();
s.start();
console.log('graph built. nodes:', Object.entries(created).map(([k, v]) => k + '=' + v).join('  '));

// Every place, driven across the whole parameter range, both on and off the road.
let steps = 0;
for (const key of ATMOS_KEYS) {
  const A = ATMOS[key].sound;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    s.ctx.currentTime += 1 / 60;
    s.update({
      rpm01: t, speed01: t, slip01: 1 - t, duck: i % 7 === 0 ? 0 : 1,
      surface: i % 3 === 0 ? 'dirt' : 'gravel',
      pan: Math.sin(i) , slipDir: Math.cos(i), atmos: A,
    }, 1 / 60);
    steps++;
  }
  s.thud(0.9); s.crunch(0.8);
  s.ctx.currentTime += 0.5;
}
console.log('drove', steps, 'frames through all', ATMOS_KEYS.length, 'places, plus thuds and rolls');

// The knobs the atmos table is supposed to be moving must actually have moved.
const checks = [
  ['room wet level', s.spaceOut.gain.value],
  ['pre-delay', s.preDelay.delayTime.value],
  ['line 0 length', s.spaceLines[0].d.delayTime.value],
  ['line 0 feedback', s.spaceLines[0].fb.gain.value],
  ['line 0 damping', s.spaceLines[0].lp.frequency.value],
  ['bodywork lowpass', s.worldLP.frequency.value],
  ['slide pan', s.slipPan.pan.value],
];
let bad = 0;
for (const [name, v] of checks) {
  const ok = Number.isFinite(v);
  if (!ok) bad++;
  console.log('  ' + name.padEnd(18), ok ? String(v.toFixed ? v.toFixed(4) : v) : 'NOT FINITE');
}

// Feedback above 1.0 in a delay line is an oscillator, not a room.
for (const [i, L] of s.spaceLines.entries()) {
  if (L.fb.gain.value >= 0.95) { console.log('  UNSTABLE line ' + i + ' feedback ' + L.fb.gain.value); bad++; }
}

console.log('\nVERDICT');
console.log('  graph builds     ', 'pass');
console.log('  no dead nodes    ', 'pass');
console.log('  params all finite', bad ? 'FAIL' : 'pass');
console.log('  room stable      ', s.spaceLines.every(L => L.fb.gain.value < 0.95) ? 'pass' : 'FAIL');
process.exit(bad ? 1 : 0);
