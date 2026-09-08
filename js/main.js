// main.js — glue. Fixed-step physics, first-person camera, pace notes, timing.
//
// This is a FEEL PROTOTYPE. One hand-authored stage, one jump, no traps, no calendar,
// no menus. The only questions it exists to answer are: does the wheel feel heavy in
// the right way, and does the jump feel huge.

import * as THREE from 'three';
import { Stage, buildStageMesh, SEGMENTS } from './stage.js';
import { Car } from './car.js';
import { Wheel, TUNE } from './wheel.js';
import { Controls } from './controls.js';
import { AirFx } from './air.js';
import { buildCockpit, VISUAL_LOCK, SEAM_Z } from './cockpit.js';
import { Glass } from './glass.js';
import { Look } from './look.js';
import { Sound } from './audio.js';
import { atmosAt, ATMOS, ATMOS_KEYS } from './atmos.js';
import { Menu, sprintOfDay } from './menu.js';
import { Post } from './post.js';
import { Voice } from './voice.js';

const FIXED = 1 / 120;
// Speed fraction at which each gear runs out. rpm sawtooths inside each one, so the
// engine climbs and drops the way a gearbox actually sounds.
const GEARS = [0.14, 0.27, 0.42, 0.62, 1.0];
function rpmFor(sf) {
  let lo = 0;
  for (const hi of GEARS) {
    if (sf <= hi) return 0.26 + 0.74 * ((sf - lo) / (hi - lo));
    lo = hi;
  }
  return 1;
}
// What the revs would read one gear lower at this speed. A downshift doesn't invent a
// number — the wheels are still turning the same rate, so the engine has no choice but
// to jump to whatever the shorter gear demands. With the wide ratios below that is
// always past the limiter, so the flare is really "1 minus wherever you were" — which
// means a downshift low in a gear flares hard and one taken at the top of a gear
// barely moves. That's correct: if you're already screaming it can't scream more, and
// the exhaust bark is what acknowledges the input in that case.
function rpmDrop(sf) {
  for (let i = 0; i < GEARS.length; i++) {
    if (sf <= GEARS[i]) {
      if (i === 0) return 1;                       // already in first: it just screams
      const lo = i > 1 ? GEARS[i - 2] : 0;
      return Math.min(1, 0.26 + 0.74 * ((sf - lo) / (GEARS[i - 1] - lo)));
    }
  }
  return 1;
}
const NOTE_LEAD = 55;      // metres before a corner that the co-driver calls it

const $ = id => document.getElementById(id);

// Deterministic road texture as a function of distance along the stage. Same bumps
// every run, so you can learn them — and because it's driven by position rather than
// random noise, it reads as a SURFACE rather than as camera shake.
function surfaceBump(d) {
  // Long wavelengths on purpose. The first version peaked around a 2m wavelength, which
  // at speed is ~17Hz — that's a vibration you can't see. 11m and 5m come through at a
  // few Hz, which reads as the car being thrown about by actual bumps.
  return Math.sin(d * 0.55) * 0.50 + Math.sin(d * 1.31 + 1.3) * 0.32 + Math.sin(d * 3.1 + 2.9) * 0.18;
}

// ---------------------------------------------------------------------------
// scene
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
$('app').appendChild(renderer.domElement);

// ?post=0 turns the whole filter pass off — one flag to check whether something odd on
// a device is the grade or the scene underneath it.
const QS = new URLSearchParams(location.search);
const post = new Post(THREE, renderer);
post.enabled = QS.get('post') !== '0';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb4c4);
scene.fog = new THREE.Fog(0x9fb4c4, 120, 620);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.12, 2000);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xcfe0ee, 0x40492f, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 1.15);
sun.position.set(-90, 140, 60);
scene.add(sun);

const stage = new Stage();
scene.add(buildStageMesh(THREE, stage));

// ---------------------------------------------------------------------------
// WHERE YOU ARE. One blended atmos entry per frame drives the sky, the fog, both
// lights, the depth of field the camera can see to, the whole colour grade and the
// size of the room you can hear. Keys 1-8 pin one so a look can be judged on its own
// instead of only in the two hundred metres of stage where it happens to occur.
// ---------------------------------------------------------------------------
let atmosPin = QS.get('atmos') && ATMOS[QS.get('atmos')] ? QS.get('atmos') : null;
let atmosNow = ATMOS.dawn;
let shownPlace = '';

function applyAtmos(A) {
  atmosNow = A;
  scene.background.setHex(A.sky);
  scene.fog.color.setHex(A.sky);
  scene.fog.near = A.fog[0];
  scene.fog.far = A.fog[1];
  // The far plane follows the fog. Nothing past it is visible anyway, so this culls
  // most of the stage for free AND — the reason it matters — it buys back a lot of
  // depth-buffer precision, which is what the distance blur reads.
  camera.far = A.fog[1] * 1.25;
  sun.color.setHex(A.sun.color);
  sun.intensity = A.sun.int;
  sun.position.set(A.sun.pos[0], A.sun.pos[1], A.sun.pos[2]);
  hemi.color.setHex(A.hemi.sky);
  hemi.groundColor.setHex(A.hemi.ground);
  hemi.intensity = A.hemi.int;
  post.apply(A.look);
}

const { group: cockpit, mat: hoodMat } = buildCockpit(THREE);
camera.add(cockpit);

// Interior is a DOM overlay now; these are the bits the sim drives.
const rimEl = document.getElementById('wheelRot');
const glass = new Glass(document.getElementById('glass'));
const cabinEl = document.getElementById('cabin');
const look = new Look();

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------
const car = new Car();
const wheel = new Wheel();
const air = new AirFx();
const sound = new Sound();
const voice = new Voice();     // the co-driver, on the intercom

// A RUN is a stretch of THIS stage: the whole thing for the Stage of the Day, or one
// section for the daily sprint. Same road, same physics — only where you start and where
// the clock stops. Nothing new is generated or authored to make a sprint exist.
let run = null;
let running = false;
let paused = false;
let resumeIn = 0;        // seconds of count-in left before the clock starts again
// The start line. Five seconds of sitting there, and he only joins in at three — the
// first two are yours, with nothing but an idling engine, which is what makes the
// moment his voice arrives mean anything.
let countIn = 0;
let countShown = null;
let timer = 0, timing = false, finished = false;
let best = parseFloat(localStorage.getItem('rally.best') || '0') || 0;
let noteSeg = -1, noteUntil = 0;
let dsFlare = 0;           // extra revs still hanging on after a downshift
let bestAir = parseFloat(localStorage.getItem('rally.air') || '0') || 0;
let camShake = 0;
let hoodDirt = 0;
let fading = false;
let prevBumpY = 0;
let cabinBump = 0;
let cabinTarget = 0;
const CABIN_LAG = 0.09;   // seconds of head lag. Higher = heavier, sloppier head.

// FOUR-CORNER SUSPENSION. The camera shake used to be the road waveform read straight
// off, which is why it teleported: its fastest component is ~20Hz at speed, and at
// 60fps that's just aliasing into jitter. A real car never sees that, because the
// springs are between it and the road. So each corner is now a mass on a spring with a
// damper, chasing the ground under it, and the camera is driven by what the BODY does:
//   heave = all four together, pitch = front vs rear, roll = left vs right.
// Soft and underdamped, because a rally car is: it wallows and keeps moving after the
// bump, which is the difference between suspension and shake.
const SUS = {
  freq: 1.75,        // Hz. Low = long, soft travel.
  damp: 0.34,        // ratio. Under 1 so it overshoots and floats.
  wheelbase: 2.55,
  track: 1.55,
  roadOnRoad: 0.16,  // metres of road input
  roadOffRoad: 0.55, // off it, the ground is savage
  lateral: 0.75,     // left/right road difference. Must be SMALL — offset the sides by
                     // half a wavelength and the corners cancel and nothing moves.
};
const susY = [0, 0, 0, 0];   // FL FR RL RR body-corner heights
const susV = [0, 0, 0, 0];

function startFade() {
  fading = true;
  $('fade').classList.add('on');
  setTimeout(() => {
    resetRun();
    running = false;
    fading = false;
    $('fade').classList.remove('on');
    // On your roof is not a time, so there's nothing to record — you land back on the
    // home screen with the day's clock still running and can go again.
    menu.show('home');
  }, 1150);
}

const controls = new Controls($('app'), wheel, () => {
  if (!car.downshift()) return;
  flash($('shiftLight'));
  // Take the higher of the two so a second shift before the first has died away
  // doesn't quietly cancel it.
  dsFlare = Math.max(dsFlare, rpmDrop(car.speedFactor) - rpmFor(car.speedFactor));
  sound.downshift(car.speedFactor);
});

// TEST HOOK. ?auto drives the stage on its own so the game can be screenshotted
// headlessly — I can't hold the phone, so this is how I check it renders at all.
const AUTO = QS.has('auto');
const angDiff = a => Math.atan2(Math.sin(a), Math.cos(a));
function autopilot(g) {
  // Lookahead scales with speed and it brakes for what's coming — same logic as
  // tools/simcheck.mjs. A fixed lookahead is only a fraction of a second at 100mph.
  const aheadM = Math.max(18, Math.min(75, 14 + car.speed * 0.95));
  const step = Math.round(aheadM / 2);
  const a = stage.samples[Math.min(stage.samples.length - 1, g.index + step)];
  const err = angDiff(Math.atan2(a.x - car.x, a.z - car.z) - car.yaw);
  wheel.held = true;
  wheel.target = Math.max(-1, Math.min(1, -err * 2.1));

  const bi = Math.min(stage.samples.length - 1, g.index + step + 15);
  const curve = Math.abs(angDiff(stage.samples[bi].head - stage.samples[g.index].head));
  const arc = Math.max(6, (bi - g.index) * 2);
  const needLat = curve > 1e-4 ? (car.speed * car.speed) * (curve / arc) : 0;
  controls.handbrake = (needLat > 9.0 || Math.abs(err) > 0.42) && car.speed > 14 ? 1 : 0;
}

function flash(el) {
  if (!el) return;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}

// Index of the sample at a given distance along the road.
function sampleAt(dist) {
  const S = stage.samples;
  let lo = 0, hi = S.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (S[mid].dist < dist) lo = mid + 1; else hi = mid; }
  return lo;
}

function resetRun() {
  if (!run) run = { mode: 'stage', from: 0, to: stage.length - 6, key: 'full', title: 'STAGE' };
  const i0 = sampleAt(run.from);
  const s0 = stage.samples[i0];
  // The road-finder walks locally from wherever it last was, so dropping the car 5km
  // down the stage without telling it means the first lookup is a full scan from a
  // stale index. Point it at the start line.
  stage._hint = i0;
  car.x = s0.x; car.z = s0.z; car.y = s0.y;
  car.yaw = s0.head; car.vf = 0; car.vr = 0; car.vy = 0; car.yawRate = 0;
  car.airborne = false; car.airTime = 0; car.pitch = 0; car.roll = 0;
  car.rolled = false; car.settled = false; car.tumble = 0; car.tumbleRate = 0;
  car.impact = 0; car.landingHit = 0;
  wheel.pos = 0; wheel.target = 0; wheel.release();
  glass.clear();
  hoodDirt = 0;
  hoodMat.color.setRGB(1, 1, 1);
  timer = 0; timing = false; finished = false;
  noteSeg = s0.seg - 1;          // so the first call is the corner you're actually on
  noteUntil = 0;
  dsFlare = 0;
  // Seed the place so the line you get on the start line is the co-driver's first call,
  // not the name of somewhere you're already standing. Only ARRIVING somewhere is news.
  shownPlace = atmosAt(stage.sections, run.from).name;
  $('finish').classList.remove('show');
  say(SEGMENTS[s0.seg].note);
  // Headless runs screenshot at exact seconds, so they skip the count and drive — but
  // ?count=1 holds the car on the line, which is the only way to photograph the start.
  countIn = (AUTO && QS.get('count') !== '1') ? -99 : 5.0; countShown = null;
  voice.silence();
}

function pauseRun() {
  if (!running || paused) return;
  paused = true;
  resumeIn = 0;
  menu.count(0);
  // Suspending the context is the honest way to stop the engine: without it the loops
  // just carry on at whatever revs you paused at.
  sound.ctx?.suspend?.();
  controls.handbrake = 0;
  wheel.release();
  menu.pause({ mode: run.mode, time: timer, title: run.title });
}

function resumeRun() {
  if (!paused) return;
  paused = false;
  menu.unpause();
  sound.ctx?.resume?.();
  // You may well have put the phone down. Neutral is wherever you're holding it NOW.
  look.recentre();
  resumeIn = 3;
  menu.count(3);
  last = performance.now();
}

function say(text) {
  const el = $('note');
  el.textContent = text;
  el.classList.add('show');
  noteUntil = performance.now() + 2400;
}

// ---------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------
let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  fitCanvas();
  const dtReal = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!running) return;

  // Paused, or counting back in: keep DRAWING (a canvas that stops being redrawn can be
  // dropped by the compositor, and the whole point is that the road stays visible behind
  // the card) but run no physics and move no clock.
  if (paused) { render(0); return; }
  if (resumeIn > 0) {
    resumeIn -= dtReal;
    menu.count(Math.ceil(resumeIn));
    render(0);
    if (resumeIn > 0) return;
    resumeIn = 0;
    menu.count(0);
  }

  // The start-line count. No physics runs, so the car sits on the line and the world
  // stays there to be looked at — which is the whole reason the start area exists.
  if (countIn > -0.9) {
    // ?count=1 parks a headless run on the line for good: virtual time races through
    // five real seconds long before the shutter, so a photograph of the start area
    // needs the clock stopped, not started.
    if (!(AUTO && QS.get('count') === '1')) countIn -= dtReal;
    const n = countIn > 0 ? Math.ceil(countIn) : 'GO';
    if (n !== countShown) {
      countShown = n;
      menu.count(n);
      if (n === 3 || n === 2 || n === 1) voice.say(['count-' + n]);
      else if (n === 'GO') voice.say(['count-go']);
    }
    render(0);
    if (countIn > -0.9) return;
    menu.count(0);
    countShown = null;
    // And the first pace note lands as you pull away, not before it.
    voice.note(SEGMENTS[stage.samples[sampleAt(run.from)].seg].note);
  }

  controls.update(dtReal);
  const ts = air.update(dtReal, car, car.speedFactor);

  acc += dtReal * ts;
  let guard = 0;
  while (acc >= FIXED && guard++ < 8) {
    step(FIXED);
    acc -= FIXED;
  }

  // Revs fall back to where the speed says they should be. Exponential, because that's
  // what a flywheel does when you stop dragging it.
  if (dsFlare > 0.001) dsFlare *= Math.exp(-dtReal / 0.38); else dsFlare = 0;

  if (noteUntil && now > noteUntil) { $('note').classList.remove('show'); noteUntil = 0; }

  render(dtReal);
  hud();
}

function step(dt) {
  const ground = stage.sample(car.x, car.z);
  if (AUTO) autopilot(ground);
  wheel.update(dt, car.speedFactor);
  const wasAir = car.airborne;
  car.step(dt, wheel.pos, controls.handbrake, ground);

  if (car.justLanded && car.lastAirTime > 0.22) {
    sound.thud(car.landingHit);
    camShake = Math.max(camShake, 0.5 + car.landingHit);
    if (car.lastAirTime > bestAir) {
      bestAir = car.lastAirTime;
      localStorage.setItem('rally.air', String(bestAir));
    }
    flash($('airFlash'));
  }
  if (!wasAir && car.airborne && car.airTime === 0) { /* takeoff handled by AirFx */ }

  // --- pace notes ----------------------------------------------------------
  const p = ground.progress;
  for (let si = noteSeg + 1; si < SEGMENTS.length; si++) {
    if (p >= stage.segStartDist(si) - NOTE_LEAD) {
      noteSeg = si;
      say(SEGMENTS[si].note);
      voice.note(SEGMENTS[si].note);
    } else break;
  }

  // --- on your roof: the tumble plays out, then it fades and you're back at the
  //     menu. No banner over the top of it.
  const hit = car.takeImpact();
  if (hit > 0) sound.crunch(hit);
  if (car.rolled) { timing = false; if (car.settled && !fading) startFade(); }

  // --- timing --------------------------------------------------------------
  if (!timing && p > run.from + 12) timing = true;
  if (timing && !finished) {
    timer += dt;
    if (p >= run.to) {
      finished = true; timing = false;
      running = false;
      voice.say(['stage-end']);
      menu.finished(run, timer);
    }
  }
}

// ---------------------------------------------------------------------------
// camera + render
// ---------------------------------------------------------------------------
const eye = new THREE.Vector3();

function render(dtReal) {
  const ground = stage.sample(car.x, car.z);

  const A = atmosPin ? ATMOS[atmosPin] : atmosAt(stage.sections, ground.progress);
  applyAtmos(A);
  // Arriving somewhere is worth naming, and the note slot already exists — so this
  // costs no new chrome, which is the rule.
  if (A.name !== shownPlace) { shownPlace = A.name; say(A.name); voice.note(A.name); }

  camera.fov += (air.fov - camera.fov) * Math.min(1, 14 * dtReal);
  camera.updateProjectionMatrix();

  // Driver sits slightly left of centre and back from the nose.
  const s = Math.sin(car.yaw), c = Math.cos(car.yaw);
  eye.set(
    car.x + (-0.34 * c + -0.15 * s),
    car.y + 1.28 - air.dip,   // a touch higher: you see more road surface, and more
                              // visible ground is more optical flow
    car.z + (0.34 * s + -0.15 * c)
  );

  camShake = Math.max(0, camShake - dtReal * 3.2);
  const shake = camShake * 0.055;
  eye.y += (Math.random() - 0.5) * shake;
  eye.x += (Math.random() - 0.5) * shake * 0.6;

  // The gravel rattles you while you're on it, and goes GLASS SMOOTH the moment you
  // leave the ground. That contrast is what makes air time feel like flying — without
  // it the road feels the same as the sky and the jump has nothing to stand against.
  let rumbleRoll = 0, rumblePitch = 0;
  if (!car.airborne) {
    const d = ground.progress;
    // Road height under each wheel. The rear hits a bump AFTER the front, which is
    // what makes a car pitch over bumps rather than just bounce.
    const amp = (ground.onRoad ? SUS.roadOnRoad : SUS.roadOffRoad) * car.speedFactor;
    const half = SUS.wheelbase * 0.5;
    const road = [
      surfaceBump(d + half) * amp, surfaceBump(d + half + SUS.lateral) * amp,
      surfaceBump(d - half) * amp, surfaceBump(d - half + SUS.lateral) * amp,
    ];

    const w = 2 * Math.PI * SUS.freq;
    const K = w * w, C = 2 * SUS.damp * w;
    for (let i = 0; i < 4; i++) {
      susV[i] += ((road[i] - susY[i]) * K - susV[i] * C) * dtReal;
      susY[i] += susV[i] * dtReal;
    }

    const heave = (susY[0] + susY[1] + susY[2] + susY[3]) * 0.25;
    const bumpY = heave;
    eye.y += heave;
    rumblePitch = ((susY[0] + susY[1]) - (susY[2] + susY[3])) * 0.5 / SUS.wheelbase;
    rumbleRoll = ((susY[0] + susY[2]) - (susY[1] + susY[3])) * 0.5 / SUS.track;

    // Your head is on a seat; the dash is bolted to the car. So the interior moves
    // against you — but ONLY off the road, and a head has mass, so it can't snap to a
    // waveform. Two things keep it from looking like it's teleporting: the target uses
    // a single slow component instead of the full bump (the fast harmonics are a ~20Hz
    // buzz that just aliases into jitter), and it's then smoothed so the head lags.
    // Your head is on a seat, so it lags whatever the body is doing.
    cabinTarget = ground.onRoad ? 0 : -heave * 1.9 * innerHeight;

    // Suspension compression = how fast the body is being moved by the surface.
    // Past a threshold that's a real hit, so the shocks thud.
    let comp = 0;
    for (let i = 0; i < 4; i++) comp = Math.max(comp, Math.abs(road[i] - susY[i]));
    prevBumpY = bumpY;
    if (comp > 0.10) sound.thud(Math.min(1, (comp - 0.10) / 0.22));
  } else {
    // In the air the wheels hang: springs relax back to neutral, nothing shakes.
    for (let i = 0; i < 4; i++) {
      susV[i] += (-susY[i] * 40 - susV[i] * 9) * dtReal;
      susY[i] += susV[i] * dtReal;
    }
    prevBumpY = 0;
    cabinTarget = 0;
  }

  // One-pole smoothing: no overshoot, no snap when you cross onto grass and back.
  cabinBump += (cabinTarget - cabinBump) * (1 - Math.exp(-dtReal / CABIN_LAG));

  camera.position.copy(eye);

  // Look slightly into the direction of travel while sliding — drivers look through
  // the corner rather than where the nose happens to point.
  camera.rotation.set(0, 0, 0);
  // +PI because a three.js camera looks down its local -Z, while the car's heading
  // is (sin yaw, cos yaw). Without it you drive the whole stage in reverse.
  camera.rotateY(Math.PI + car.yaw - car.slip * 0.28);
  // Head pitch from the phone's tilt, on top of the car's own attitude.
  const lookDeg = look.update(dtReal);
  cabinEl.style.setProperty('--look', look.overlayPx(camera.fov, innerHeight).toFixed(1) + 'px');
  cabinEl.style.setProperty('--bump', cabinBump.toFixed(1) + 'px');
  camera.rotateX(car.pitch + rumblePitch + lookDeg * 0.01745 + air.shake * (Math.random() - 0.5) * 0.06);

  // The bonnet belongs to the CAR, not to your head, so counter-rotate it out of the
  // look. Without this it stays pinned to the screen while you glance around, which is
  // the one thing that would give the whole illusion away.
  cockpit.rotation.x = -lookDeg * 0.01745;

  // ...and for the same reason it has to take the off-road JOLT with the dashboard. The
  // dash and the bonnet are bolted to the same car; only your head is on a seat. The
  // interior was jolting against you and the bonnet was staying put, so the two halves
  // of one car visibly disagreed.
  //
  // Matched in PIXELS at the seam — the bonnet's near edge, where it meets the bottom of
  // the windscreen — because that's the only line where the 3D and the overlay touch. The
  // nose moves less on screen than the seam does, which is just perspective and correct:
  // it's a real object out in front of you, not a second flat layer.
  const pxToWorld = (2 * SEAM_Z * Math.tan(camera.fov * 0.5 * Math.PI / 180)) / innerHeight;
  cockpit.position.y = -cabinBump * pxToWorld;
  camera.rotateZ(car.bodyRoll + rumbleRoll);

  // The rim visibly lags your thumb, and unwinds on its own when you let go.
  rimEl.setAttribute('transform', 'rotate(' + (wheel.pos * VISUAL_LOCK * 57.2958).toFixed(2) + ')');

  // The bonnet picks up muck the same way the glass does, and it never comes off.
  if (!car.airborne && car.speedFactor > 0.08) {
    hoodDirt = Math.min(1, hoodDirt + dtReal * car.speedFactor * (ground.onRoad ? 0.012 : 0.16));
    const t = 1 - hoodDirt * 0.42;
    hoodMat.color.setRGB(t, t * 0.985, t * 0.95);
  }

  glass.update(dtReal, car.speedFactor, ground.onRoad);
  glass.speed = car.speedFactor;
  glass.draw();

  sound.update({
    rpm01: Math.min(1, rpmFor(car.speedFactor) + dsFlare),
    speed01: car.speedFactor,
    surface: ground.onRoad ? 'gravel' : 'dirt',
    slip01: Math.min(1, Math.abs(car.slip) / 0.45),
    duck: air.duck,
    airborne: car.airborne,
    // Which side the ground noise is on. `lateral` is positive toward the driver's
    // LEFT (the camera is rotated by PI + yaw, so world +X ends up on the left), and a
    // StereoPanner wants -1 for left — hence the negation. Ramps in over the last
    // couple of metres of road so it doesn't snap as you cross the edge.
    pan: -Math.max(-1, Math.min(1, ground.lateral / Math.max(1, ground.off > 0 ? 2.2 : 6))),
    slipDir: Math.max(-1, Math.min(1, car.slip / 0.45)),
    atmos: A.sound,
  }, dtReal);

  post.render(scene, camera, dtReal);
}

// ---------------------------------------------------------------------------
// hud
// ---------------------------------------------------------------------------
const fmt = t => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return (m ? m + ':' : '') + (m && s < 10 ? '0' : '') + s.toFixed(2);
};

let hudT = 0;
function hud() {
  $('speed').textContent = Math.round(car.speed * 2.237);
  $('time').textContent = fmt(timer);
  $('air').textContent = car.airborne ? car.airTime.toFixed(2) : '';
  $('bestAir').textContent = bestAir ? bestAir.toFixed(2) + 's' : '--';
  $('bestTime').textContent = best ? fmt(best) : '--';

  // Tuning readouts. The lag bar is the wheel's weight made visible: how far your
  // thumb is ahead of where the rim actually got to.
  const lag = wheel.lag;
  $('lagBar').style.transform = 'scaleX(' + Math.min(1, Math.abs(lag)) + ')';
  $('lagBar').style.transformOrigin = lag < 0 ? 'right' : 'left';
  $('posBar').style.transform = 'translateX(' + (wheel.pos * 50) + '%)';
  $('hbBar').style.transform = 'scaleY(' + controls.handbrake + ')';
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------
// Checked every frame rather than only on the resize event. Phones fire resize before
// the viewport has settled after a rotation (and again when the URL bar hides), which
// leaves the canvas at the old size with the page background showing beside it.
let fitW = 0, fitH = 0;
function fitCanvas() {
  if (innerWidth === fitW && innerHeight === fitH) return;
  fitW = innerWidth; fitH = innerHeight;
  camera.aspect = fitW / fitH;
  camera.updateProjectionMatrix();
  renderer.setSize(fitW, fitH, false);
  renderer.domElement.style.width = fitW + 'px';
  renderer.domElement.style.height = fitH + 'px';
  post.setSize(fitW, fitH, renderer.getPixelRatio());
  glass.resize();
}
addEventListener('resize', fitCanvas);
addEventListener('orientationchange', () => setTimeout(fitCanvas, 120));

// The menu is the front door. It hands back a run spec — which stretch of road, and
// what to call it — and gets told the time when the run ends.
const menu = new Menu({
  stage,
  atmos: ATMOS,
  onResume: () => resumeRun(),
  onRestart: () => {
    paused = false;
    menu.unpause();
    sound.ctx?.resume?.();
    resetRun();
    resumeIn = 0;
    menu.count(0);
    last = performance.now();
  },
  onQuit: () => {
    paused = false;
    running = false;
    resumeIn = 0;
    menu.count(0);
    menu.unpause();
    sound.ctx?.resume?.();   // leave the context running, or the menu's next run is mute
    menu.show('home');
  },
  onStart: spec => {
    run = spec;
    sound.start();
    // The context is created inside this click, so it should be running — but if the
    // browser handed it back suspended anyway, this is the last gesture we get.
    sound.ctx?.resume?.();
    voice.attach(sound.ctx, sound.master);
    look.enable();        // needs the tap: iOS won't hand over the sensor otherwise
    menu.hide();
    menu.unpause();
    paused = false; resumeIn = 0; menu.count(0);
    $('start').classList.add('gone');
    resetRun();
    running = true;
    last = performance.now();
  },
});

// 1-8 pin a filter, 0 hands it back to the stage, P toggles the pass entirely. Desk
// only — it's for judging the looks side by side, not a feature.
addEventListener('keydown', e => {
  const n = parseInt(e.key, 10);
  if (e.key === '0') { atmosPin = null; say('FILTER — AUTO'); }
  else if (n >= 1 && n <= ATMOS_KEYS.length) {
    atmosPin = ATMOS_KEYS[n - 1];
    say('FILTER — ' + ATMOS[atmosPin].name);
  } else if (e.key === 'p' || e.key === 'P') {
    post.enabled = !post.enabled;
    say('POST ' + (post.enabled ? 'ON' : 'OFF'));
  }
});

$('retry').addEventListener('click', e => { e.stopPropagation(); resetRun(); });
$('pauseBtn').addEventListener('click', e => { e.stopPropagation(); pauseRun(); });
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !running) return;
  paused ? resumeRun() : pauseRun();
});
// A call comes in, or you switch apps. The car should not still be driving when you
// come back, and the clock certainly shouldn't have been running.
addEventListener('visibilitychange', () => { if (document.hidden) pauseRun(); });
addEventListener('blur', () => pauseRun());


resetRun();
if (!AUTO) { $('start').classList.add('gone'); menu.show('home'); }
if (AUTO) {
  $('start').classList.add('gone');
  sound.start();          // so headless runs exercise the audio path too
  voice.attach(sound.ctx, sound.master);
} };

  // ?at=<seconds> fast-forwards the simulation before the first frame, so a screenshot
  // can be taken at an exact moment (mid-jump, say) rather than whenever the headless
  // browser happens to get round to it.
  // ?mode=sprint drives today's sprint instead of the whole stage, so the run spec
  // plumbing can be checked headlessly — a screenshot can't press a button.
  if (QS.get('mode') === 'sprint') {
    const sec = sprintOfDay(stage);
    run = { mode: 'sprint', from: sec.start, to: sec.end, key: sec.key,
            title: ATMOS[sec.key]?.name || sec.key };
    resetRun();
  }
  const at = parseFloat(QS.get('at') || '0');
  for (let t = 0; t < at; t += FIXED) step(FIXED);
  running = true;
  last = performance.now();
  // ?pause=1 opens the pause card over the frozen frame, so the overlay can be seen
  // headlessly — a screenshot can't press the button.
  if (QS.get('pause') === '1') pauseRun();
}
requestAnimationFrame(frame);
