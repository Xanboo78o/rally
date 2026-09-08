// cockpit.js — only the BONNET lives in 3D now.
//
// The dashboard, A-pillars and steering wheel moved to a DOM overlay (see #cockpit in
// index.html). That's not a shortcut: a real onboard camera is bolted to the car, so the
// interior is perfectly static and only the world moves behind it. Keeping the interior
// in 3D meant it inherited perspective and FOV changes it had no business inheriting,
// and the wheel was far less readable.
//
// The bonnet stays in 3D so it takes real light and occludes the road properly.

export const VISUAL_LOCK = Math.PI * 2;   // rim rotation at full lock: one turn each way

export function buildCockpit(THREE) {
  const g = new THREE.Group();
  const mid = new THREE.MeshLambertMaterial({ color: 0x3a3f47 });

  // Sits just proud of the dash overlay, so you get a strip of real, lit bonnet
  // between the road and the interior.
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.11, 1.9), mid);
  hood.position.set(0, -0.92, -2.75);
  g.add(hood);

  // A slight lip at the leading edge, so the nose reads against the road.
  const lip = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.07, 0.16), new THREE.MeshLambertMaterial({ color: 0x474d57 }));
  lip.position.set(0, -0.88, -3.60);
  g.add(lip);

  return { group: g };
}
