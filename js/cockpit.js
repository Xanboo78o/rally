// cockpit.js — first person interior, parented to the camera.
//
// The steering wheel in here is not decoration. It is the only channel telling you
// how heavy the wheel is: when your thumb outruns it you SEE the rim lagging behind,
// and when you let go you watch it unwind by itself.
//
// Everything else is deliberately minimal. The first version had a full roll cage and
// a header rail and you could barely see the road past it — in a feel prototype the
// road and the rim are the only things that earn screen space.

// Two full rotations lock to lock, like a real rally car: 360 degrees each way from
// centre. The old 145 degrees made it feel like a go-kart.
export const VISUAL_LOCK = Math.PI * 2;

export function buildCockpit(THREE) {
  const g = new THREE.Group();

  const dark = new THREE.MeshLambertMaterial({ color: 0x191b1f });
  const mid = new THREE.MeshLambertMaterial({ color: 0x272a30 });
  const cage = new THREE.MeshLambertMaterial({ color: 0x8d3b34 });

  // A sliver of bonnet above the dash, so the car has a nose you can place.
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 1.7), mid);
  hood.position.set(0, -0.72, -2.4);
  g.add(hood);

  // Dashboard. Low, so the horizon and the road stay clear.
  const dash = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.50, 0.80), dark);
  dash.position.set(0, -0.64, -1.00);
  g.add(dash);

  const binnacle = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.13, 0.30), dark);
  binnacle.position.set(-0.02, -0.34, -0.95);
  g.add(binnacle);

  // A-pillars only, thin, right at the edges of vision.
  const barGeo = new THREE.CylinderGeometry(0.028, 0.028, 1.9, 8);
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(barGeo, cage);
    bar.position.set(1.20 * side, 0.16, -1.05);
    bar.rotation.z = 0.26 * side;
    g.add(bar);
  }

  // ---- the wheel -----------------------------------------------------------
  // Sits in the lower third: fully visible, overlapping the dash, without covering
  // the part of the road you actually steer by.
  const wheel = new THREE.Group();
  wheel.position.set(-0.02, -0.285, -0.62);
  wheel.rotation.x = -0.40;                      // tilted toward the driver

  const R = 0.155;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(R, 0.019, 8, 30),
    new THREE.MeshLambertMaterial({ color: 0x101116 })
  );
  wheel.add(rim);

  const spokeMat = new THREE.MeshLambertMaterial({ color: 0x2b2e35 });
  for (const a of [Math.PI * 0.5, Math.PI * 1.17, Math.PI * 1.83]) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.028, R * 0.94, 0.015), spokeMat);
    sp.position.set(Math.cos(a) * R * 0.48, Math.sin(a) * R * 0.48, 0);
    sp.rotation.z = a - Math.PI / 2;
    wheel.add(sp);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.028, 12), spokeMat);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);

  // Top-centre marker, so rim angle is readable at a glance.
  const mark = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.026, 0.024),
    new THREE.MeshBasicMaterial({ color: 0xd8433a })
  );
  mark.position.set(0, R, 0.012);
  wheel.add(mark);

  g.add(wheel);

  return { group: g, wheel };
}
