// dust.js — what the wheels throw into the air.
//
// In first person you cannot see your own car, so a dust plume behind you is worth
// nothing on its own. What makes it read is WHERE it comes from: when the car is
// sideways the plume comes off the wheels and out past the side glass, so you see it in
// your periphery exactly when you are doing the thing that makes it. Off the road every
// wheel throws, including the fronts, and those you see straight through the screen.
//
// One Points cloud, one draw call, a ring buffer of particles. A dead particle is a live
// one with zero alpha, so nothing is allocated while you are driving.

import { puffSprite } from './texture.js';

const VERT = `
attribute float aSize;
attribute float aAlpha;
varying float vA;
uniform float uScale;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
  vA = aAlpha;
}`;

const FRAG = `
uniform sampler2D uTex;
uniform vec3 uColor;
varying float vA;
void main() {
  float a = texture2D(uTex, gl_PointCoord).a * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export class Dust {
  constructor(THREE, scene, { max = 520, color = 0xb5a48c } = {}) {
    this.THREE = THREE;
    this.max = max;
    this.head = 0;

    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.ttl = new Float32Array(max);
    this.grow = new Float32Array(max);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = g;

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: puffSprite(THREE, 64) },
        uColor: { value: new THREE.Color(color) },
        uScale: { value: 600 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(g, this.mat);
    // The cloud has no meaningful bounding box once particles start moving, and a
    // culled plume that vanishes when you look away is worse than no plume.
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    scene.add(this.points);
  }

  // The place decides the colour of its own dust — chalk does not throw basalt.
  setColor(hex) { this.mat.uniforms.uColor.value.setHex(hex); }

  // One puff. Velocity is in metres per second and gets dragged down hard, because a
  // dust cloud stops travelling almost immediately and then just hangs and spreads.
  spawn(x, y, z, vx, vy, vz, size, ttl, grow) {
    const i = this.head = (this.head + 1) % this.max;
    const p = i * 3;
    this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z;
    this.vel[p] = vx; this.vel[p + 1] = vy; this.vel[p + 2] = vz;
    this.size[i] = size;
    this.grow[i] = grow;
    this.life[i] = 0;
    this.ttl[i] = ttl;
    this.alpha[i] = 0;
  }

  // Throw from one wheel. `heat` 0..1 is how hard it is working — slip for a slide,
  // speed for going off — and it drives both how much comes off and how far it flies.
  emit(x, y, z, n, heat, dirX, dirZ, opts = {}) {
    const rise = opts.rise ?? 0.9;
    const spread = opts.spread ?? 1.5;
    for (let k = 0; k < n; k++) {
      const r = () => Math.random() - 0.5;
      this.spawn(
        x + r() * 0.5, y + 0.05 + Math.random() * 0.2, z + r() * 0.5,
        dirX * (1.2 + heat * 5.5) + r() * spread,
        rise + Math.random() * (0.5 + heat * 1.4),
        dirZ * (1.2 + heat * 5.5) + r() * spread,
        (opts.size ?? 0.55) * (0.7 + Math.random() * 0.8),
        (opts.ttl ?? 1.1) * (0.7 + Math.random() * 0.7),
        opts.grow ?? 2.2,
      );
    }
  }

  update(dt, camera, heightPx) {
    // gl_PointSize is in pixels, so the world-to-pixel scale has to come from the
    // projection every frame — the FOV is pulled around by the air effect.
    this.mat.uniforms.uScale.value = 0.5 * heightPx * camera.projectionMatrix.elements[5];

    const { pos, vel, size, alpha, life, ttl, grow } = this;
    const drag = Math.exp(-2.6 * dt);
    let live = 0;
    for (let i = 0; i < this.max; i++) {
      if (ttl[i] <= 0) { alpha[i] = 0; continue; }
      const t = (life[i] += dt) / ttl[i];
      if (t >= 1) { ttl[i] = 0; alpha[i] = 0; continue; }
      const p = i * 3;
      vel[p] *= drag; vel[p + 2] *= drag;
      vel[p + 1] = vel[p + 1] * drag + 0.35 * dt;      // it keeps drifting upward
      pos[p] += vel[p] * dt;
      pos[p + 1] += vel[p + 1] * dt;
      pos[p + 2] += vel[p + 2] * dt;
      size[i] += grow[i] * dt;
      // Up fast, out slow: dust appears the instant the wheel breaks traction and then
      // takes a second to thin out.
      alpha[i] = Math.min(1, t * 9) * (1 - t) * (1 - t) * 0.5;
      live++;
    }
    this.live = live;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  clear() {
    this.ttl.fill(0);
    this.alpha.fill(0);
    this.geo.attributes.aAlpha.needsUpdate = true;
  }
}
