// post.js — the VISUAL FILTERS. One full-screen pass over the rendered frame.
//
// The scene goes into a render target with a depth texture attached, and this shader
// reads both. Depth is what makes the interesting half possible: it's the difference
// between "tint the whole picture" and "the far side of the valley goes soft while the
// stones a metre off your wheel stay sharp".
//
//   heat    the air over hot ground boils, so distant things wobble
//   haze    distance blur — the further away, the softer, on top of the fog
//   grade   exposure, tint, saturation, contrast, lift
//   frame   vignette and grain
//
// Every knob is driven per-place from js/atmos.js, so the filter changes as you drive
// rather than being one setting for the whole stage.
//
// The windscreen (js/glass.js) is deliberately NOT in here: it's a separate canvas over
// the top, because dust sitting on the glass a foot from your eye should not be blurred
// by two hundred metres of haze.

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2  uTexel;
uniform float uNear, uFar, uTime;

uniform float uHaze, uHazeNear, uHazeFar;
uniform float uHeat;
uniform float uExposure, uSat, uCon, uVig, uGrain;
uniform vec3  uTint, uLift;

// Depth texture -> distance from the camera in metres.
float viewDist(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  float ndc = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, 1e-5), vec3(1.0 / 2.4)) - 0.055,
             step(vec3(0.0031308), c));
}

// A ring of taps rather than a box: a box grid bands visibly on the sky at these radii,
// where points around a circle read as a lens going soft. Six of them, not eight — this
// pass touches every pixel on a phone at 2x pixel ratio, where fill rate is the whole
// budget and each extra tap is another couple of million texture fetches a frame.
const int TAPS = 6;
const vec2 RING[6] = vec2[6](
  vec2( 1.000,  0.000), vec2( 0.500,  0.866), vec2(-0.500,  0.866),
  vec2(-1.000,  0.000), vec2(-0.500, -0.866), vec2( 0.500, -0.866)
);

void main() {
  vec2 uv = vUv;

  // ---- heat: the air itself moves -----------------------------------------
  // Masked by distance, because the shimmer is the whole column of air between you
  // and the thing — there is no air in front of your own bonnet to wobble.
  float dist = viewDist(vUv);
  if (uHeat > 0.001) {
    float m = uHeat * smoothstep(uHazeNear * 0.5, uHazeFar * 0.6, dist);
    // Two different frequencies so it rolls rather than pulsing on a beat.
    float w = sin(vUv.y * 92.0 + uTime * 5.7) + sin(vUv.y * 47.0 - uTime * 3.9);
    uv.x += w * 0.0012 * m;
    uv.y += sin(vUv.x * 61.0 + uTime * 4.4) * 0.0008 * m;
  }

  vec3 col = texture2D(tDiffuse, uv).rgb;

  // ---- haze: soften with distance ------------------------------------------
  float soft = uHaze * smoothstep(uHazeNear, uHazeFar, dist);
  if (soft > 0.004) {
    float r = soft * 2.6;                       // pixels
    vec3 sum = col;
    for (int i = 0; i < TAPS; i++) {
      sum += texture2D(tDiffuse, uv + RING[i] * uTexel * r).rgb;
    }
    // The second ring is the expensive half, so it waits until things are properly far
    // away — at which point it's the difference between a soft horizon and a melted one.
    float wide = smoothstep(0.55, 1.0, soft);
    if (wide > 0.001) {
      for (int i = 0; i < TAPS; i++) {
        sum += mix(col, texture2D(tDiffuse, uv + RING[i] * uTexel * r * 2.3).rgb, wide);
      }
      col = sum / float(TAPS * 2 + 1);
    } else {
      col = sum / float(TAPS + 1);
    }
  }

  // ---- grade ----------------------------------------------------------------
  // Exposure in linear light, everything else after the transfer curve, which is the
  // order a real grade happens in and behaves far more predictably.
  col = linearToSRGB(col * uExposure);
  col *= uTint;
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSat);
  col = (col - 0.5) * uCon + 0.5;
  col += uLift;

  // ---- frame ----------------------------------------------------------------
  float v = length(vUv - 0.5) * 1.42;
  col *= 1.0 - uVig * pow(v, 2.4);
  col += (hash(vUv * 1024.0 + fract(uTime) * 91.7) - 0.5) * uGrain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class Post {
  constructor(THREE, renderer) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.enabled = true;
    this.time = 0;

    const depth = new THREE.DepthTexture(1, 1);
    depth.type = THREE.UnsignedIntType;

    // No MSAA at high pixel ratios: a phone at 2x doesn't need it and it's the most
    // expensive thing in the frame. Desktop gets it, because 1x without it is rough.
    const samples = renderer.getPixelRatio() >= 2 ? 0 : 4;
    this.rt = new THREE.WebGLRenderTarget(1, 1, {
      depthTexture: depth,
      depthBuffer: true,
      samples,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    this.rt.texture.minFilter = THREE.LinearFilter;
    this.rt.texture.magFilter = THREE.LinearFilter;

    this.uniforms = {
      tDiffuse: { value: this.rt.texture },
      tDepth: { value: depth },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uNear: { value: 0.12 }, uFar: { value: 800 }, uTime: { value: 0 },
      uHaze: { value: 0.5 }, uHazeNear: { value: 100 }, uHazeFar: { value: 600 },
      uHeat: { value: 0 },
      uExposure: { value: 1 }, uSat: { value: 1 }, uCon: { value: 1 },
      uVig: { value: 0.3 }, uGrain: { value: 0.03 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uLift: { value: new THREE.Vector3(0, 0, 0) },
    };

    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
        depthTest: false, depthWrite: false,
      })
    );
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  setSize(w, h, dpr) {
    const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
    this.rt.setSize(pw, ph);
    this.uniforms.uTexel.value.set(1 / pw, 1 / ph);
  }

  // Pull the current look out of an atmos entry.
  apply(look) {
    const u = this.uniforms;
    u.uHaze.value = look.haze;
    u.uHazeNear.value = look.hazeNear;
    u.uHazeFar.value = look.hazeFar;
    u.uHeat.value = look.heat;
    u.uExposure.value = look.exposure;
    u.uSat.value = look.sat;
    u.uCon.value = look.con;
    u.uVig.value = look.vig;
    u.uGrain.value = look.grain;
    u.uTint.value.set(look.tint[0], look.tint[1], look.tint[2]);
    u.uLift.value.set(look.lift[0], look.lift[1], look.lift[2]);
  }

  render(scene, camera, dt) {
    const r = this.renderer;
    if (!this.enabled) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    this.uniforms.uNear.value = camera.near;
    this.uniforms.uFar.value = camera.far;

    r.setRenderTarget(this.rt);
    r.clear();
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.scene, this.cam);
  }
}
