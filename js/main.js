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
import { buildCockpit, VISUAL_LOCK } from './cockpit.js';
import { Glass } from './glass.js';
import { Look } from './look.js';
import { Sound } from './audio.js';

const FIXED = 1 / 120;
const NOTE_LEAD = 55;      // metres before a corner that the co-driver calls it

const $ = id => document.getElementById(id);

// Deterministic road texture as a function of distance along the stage. Same bumps
// every run, so you can learn them — and because it's driven by position rather than
// random noise, it reads as a SURFACE rather than as camera shake.
function surfaceBump(d) {
  return Math.sin(d * 2.7) * 0.55 + Math.sin(d * 6.1 + 1.3) * 0.30 + Math.sin(d * 13.7 + 2.9) * 0.15;
}

// ---------------------------------------------------------------------------
// scene
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb4c4);
scene.fog = new THREE.Fog(0x9fb4c4, 120, 620);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.12, 2000);
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xcfe0ee, 0x40492f, 1.05));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.15);
sun.position.set(-90, 140, 60);
scene.add(sun);

const stage = new Stage();
scene.add(buildStageMesh(THREE, stage));

const { group: cockpit } = buildCockpit(THREE);
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

let running = false;
let timer = 0, timing = false, finished = false;
let best = parseFloat(localStorage.getItem('rally.best') || '0') || 0;
let noteSeg = -1, noteUntil = 0;
let bestAir = parseFloat(localStorage.getItem('rally.air') || '0') || 0;
let camShake = 0;

const controls = new Controls($('app'), wheel, () => {
  if (car.downshift()) flash($('shiftLight'));
});

// TEST HOOK. ?auto drives the stage on its own so the game can be screenshotted
// headlessly — I can't hold the phone, so this is how I check it renders at all.
const AUTO = new URLSearchParams(location.search).has('auto');
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

function resetRun() {
  const s0 = stage.samples[0];
  car.x = s0.x; car.z = s0.z; car.y = s0.y;
  car.yaw = s0.head; car.vf = 0; car.vr = 0; car.vy = 0; car.yawRate = 0;
  car.airborne = false; car.airTime = 0; car.pitch = 0; car.roll = 0;
  car.rolled = false; car.rollSpin = 0; car.landingHit = 0;
  wheel.pos = 0; wheel.target = 0; wheel.release();
  glass.clear();
  timer = 0; timing = false; finished = false;
  noteSeg = -1; noteUntil = 0;
  $('finish').classList.remove('show');
  say(SEGMENTS[0].note);
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
  const dtReal = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!running) return;

  controls.update(dtReal);
  const ts = air.update(dtReal, car);

  acc += dtReal * ts;
  let guard = 0;
  while (acc >= FIXED && guard++ < 8) {
    step(FIXED);
    acc -= FIXED;
  }

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
    } else break;
  }

  // --- on your roof ---------------------------------------------------------
  if (car.rolled && !finished) {
    finished = true; timing = false;
    $('finishTime').textContent = 'ROLLED';
    $('finishTag').textContent = '\\o/  you are fine';
    $('finish').classList.add('show');
  }

  // --- timing --------------------------------------------------------------
  if (!timing && p > 12) timing = true;
  if (timing && !finished) {
    timer += dt;
    if (p >= stage.length - 6) {
      finished = true; timing = false;
      const isPB = !best || timer < best;
      if (isPB) { best = timer; localStorage.setItem('rally.best', String(best)); }
      $('finishTime').textContent = fmt(timer);
      $('finishTag').textContent = isPB ? 'PERSONAL BEST' : 'BEST ' + fmt(best);
      $('finish').classList.add('show');
    }
  }
}

// ---------------------------------------------------------------------------
// camera + render
// ---------------------------------------------------------------------------
const eye = new THREE.Vector3();

function render(dtReal) {
  const ground = stage.sample(car.x, car.z);
  camera.fov += (air.fov - camera.fov) * Math.min(1, 14 * dtReal);
  camera.updateProjectionMatrix();

  // Driver sits slightly left of centre and back from the nose.
  const s = Math.sin(car.yaw), c = Math.cos(car.yaw);
  eye.set(
    car.x + (-0.34 * c + -0.15 * s),
    car.y + 1.16 - air.dip,
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
    const amp = 0.030 * car.speedFactor * (ground.onRoad ? 1 : 3.2);
    eye.y += surfaceBump(d) * amp;
    rumbleRoll = surfaceBump(d * 0.7 + 11) * amp * 0.9;
    rumblePitch = surfaceBump(d * 1.3 + 5) * amp * 0.7;
  }

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
  camera.rotateX(car.pitch + rumblePitch + lookDeg * 0.01745 + air.shake * (Math.random() - 0.5) * 0.06);

  // The bonnet belongs to the CAR, not to your head, so counter-rotate it out of the
  // look. Without this it stays pinned to the screen while you glance around, which is
  // the one thing that would give the whole illusion away.
  cockpit.rotation.x = -lookDeg * 0.01745;
  camera.rotateZ(car.roll * 0.75 + rumbleRoll);

  // The rim visibly lags your thumb, and unwinds on its own when you let go.
  rimEl.setAttribute('transform', 'rotate(' + (wheel.pos * VISUAL_LOCK * 57.2958).toFixed(2) + ')');

  glass.update(dtReal, car.speedFactor, ground.onRoad);
  glass.draw();

  sound.update(car.speedFactor, ground.onRoad, air.duck, dtReal);
  renderer.render(scene, camera);
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
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

$('start').addEventListener('click', () => {
  sound.start();
  look.enable();          // needs the tap: iOS won't hand over the sensor otherwise
  $('start').classList.add('gone');
  resetRun();
  running = true;
  last = performance.now();
});

$('retry').addEventListener('click', e => { e.stopPropagation(); resetRun(); });
$('resetBtn').addEventListener('click', e => { e.stopPropagation(); resetRun(); });

resetRun();
if (AUTO) {
  $('start').classList.add('gone');
  // ?at=<seconds> fast-forwards the simulation before the first frame, so a screenshot
  // can be taken at an exact moment (mid-jump, say) rather than whenever the headless
  // browser happens to get round to it.
  const at = parseFloat(new URLSearchParams(location.search).get('at') || '0');
  for (let t = 0; t < at; t += FIXED) step(FIXED);
  running = true;
  last = performance.now();
}
requestAnimationFrame(frame);
