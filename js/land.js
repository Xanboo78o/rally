// land.js — a Terrain, turned into something you can look at.
//
// Chunked for the same reason the stage is: one mesh four kilometres across has a
// bounding sphere the size of the world and can never be culled, so all of it is
// submitted every frame.
//
// The colour is the point. There is no texture — the ground is painted per vertex out
// of the material's four colours, by what the land is DOING at that vertex: steep faces
// go bare to the rock, shelves and low ground carry growth, high ground bleaches to
// dust. So rolling a new material doesn't just recolour the world, it re-reads it, and
// you can see the shape of the land in the colour before you've driven a metre of it.

import { surfaceTexture } from './texture.js';

const CHUNK = 64;              // cells per chunk

const rgb = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function buildLandMesh(THREE, terrain, pal, opts = {}) {
  const group = new THREE.Group();
  const n = terrain.n, step = terrain.step, half = terrain.size / 2;
  // A slight surface on top of the painting. Same map the stage uses, and for the same
  // reason: the per-vertex grain below is one value per CELL, which at four metres a
  // cell is a pattern of squares rather than a surface.
  const GRAIN_M = 2.6;
  const texAmt = opts.tex ?? 1;
  const tex = texAmt > 0 ? surfaceTexture(THREE, { amount: texAmt, aniso: opts.aniso ?? 8 }) : null;
  const rock = rgb(pal.stone), dust = rgb(pal.road), growth = rgb(pal.tuft), deep = rgb(pal.tree);
  const span = Math.max(1, terrain.max - terrain.min);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex });

  for (let cz = 0; cz < n - 1; cz += CHUNK) {
    for (let cx = 0; cx < n - 1; cx += CHUNK) {
      const x1 = Math.min(n - 1, cx + CHUNK), z1 = Math.min(n - 1, cz + CHUNK);
      const w = x1 - cx + 1, d = z1 - cz + 1;
      const pos = new Float32Array(w * d * 3);
      const col = new Float32Array(w * d * 3);
      const uv = new Float32Array(w * d * 2);
      let k = 0, ku = 0;
      for (let j = cz; j <= z1; j++) {
        for (let i = cx; i <= x1; i++) {
          const x = -half + i * step, z = -half + j * step;
          const y = terrain.h[j * n + i];
          pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
          uv[ku] = x / GRAIN_M; uv[ku + 1] = z / GRAIN_M; ku += 2;

          // Steepness from the grid directly — cheaper than terrain.normal() and this
          // runs half a million times.
          const il = Math.max(0, i - 1), ir = Math.min(n - 1, i + 1);
          const jl = Math.max(0, j - 1), jr = Math.min(n - 1, j + 1);
          const dx = (terrain.h[j * n + ir] - terrain.h[j * n + il]) / (2 * step);
          const dz = (terrain.h[jr * n + i] - terrain.h[jl * n + i]) / (2 * step);
          const steep = Math.min(1, Math.hypot(dx, dz));
          const hh = (y - terrain.min) / span;

          // Low and flat is growth; high is bleached; steep is bare rock. The two
          // mixes run in that order so a cliff high up still reads as rock rather than
          // as pale nothing.
          let c = lerp3(growth, deep, smooth(0.0, 0.35, 1 - hh) * 0.45);
          c = lerp3(c, dust, smooth(0.35, 0.95, hh));
          c = lerp3(c, rock, smooth(0.30, 0.85, steep));
          // A little per-vertex grain, keyed off the grid so it never crawls.
          const g = 0.94 + (((i * 73856093) ^ (j * 19349663)) & 63) / 512;
          col[k] = c[0] * g; col[k + 1] = c[1] * g; col[k + 2] = c[2] * g;
          k += 3;
        }
      }
      const idx = [];
      for (let j = 0; j < d - 1; j++) {
        for (let i = 0; i < w - 1; i++) {
          const a = j * w + i;
          idx.push(a, a + w, a + 1, a + 1, a + w, a + w + 1);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      // Where this chunk is, so a caller can switch it off by distance. Frustum culling
      // alone isn't enough: standing on the ground with 700m of fog, most of the plot is
      // still inside the frustum and still gets rasterised into fog-coloured nothing.
      mesh.userData.centre = [-half + (cx + x1) * 0.5 * step, -half + (cz + z1) * 0.5 * step];
      mesh.userData.radius = CHUNK * step * 0.75;
      group.add(mesh);
    }
  }
  return group;
}

// Switch off everything past the fog. One number, and it takes drive mode from the whole
// plot down to the handful of chunks you could actually see.
export function cullLand(land, x, z, far) {
  for (const m of land.children) {
    const c = m.userData.centre;
    m.visible = Math.hypot(c[0] - x, c[1] - z) - m.userData.radius < far;
  }
}

// The plot from above, hillshaded — the sheet a road eventually gets drawn on. Shading
// comes from the slope toward one low sun, which is the only way a heightmap reads as
// landscape rather than as a grey blur.
export function drawMap(terrain, pal, canvas) {
  const n = terrain.n, N = canvas.width;
  const img = canvas.getContext('2d').createImageData(N, N);
  const span = Math.max(1, terrain.max - terrain.min);
  const rock = rgb(pal.stone), dust = rgb(pal.road), growth = rgb(pal.tuft);
  const q = n / N;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = Math.min(n - 2, (x * q) | 0), j = Math.min(n - 2, (y * q) | 0);
      const h = terrain.h[j * n + i];
      const dx = (terrain.h[j * n + i + 1] - h) / terrain.step;
      const dz = (terrain.h[(j + 1) * n + i] - h) / terrain.step;
      const hh = (h - terrain.min) / span;
      let c = lerp3(growth, dust, smooth(0.3, 0.95, hh));
      c = lerp3(c, rock, smooth(0.25, 0.8, Math.min(1, Math.hypot(dx, dz))));
      // Sun from the north-west, the way every map in the world is lit.
      const shade = Math.max(0.25, Math.min(1.5, 1 + (dx * 0.9 + dz * 0.9) * 2.2));
      const o = (y * N + x) * 4;
      img.data[o] = Math.min(255, c[0] * 255 * shade);
      img.data[o + 1] = Math.min(255, c[1] * 255 * shade);
      img.data[o + 2] = Math.min(255, c[2] * 255 * shade);
      img.data[o + 3] = 255;
    }
  }
  canvas.getContext('2d').putImageData(img, 0, 0);
}
