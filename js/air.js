// air.js — making air time feel much bigger than it is.
//
// Five tricks stacked, in rough order of how much they matter:
//   1. SILENCE. The engine and gravel drop away to almost nothing and leave wind.
//      Nothing else here comes close to this one for making a second feel like four.
//   2. Slight time dilation. Not slow motion — just enough that it feels wrong to end.
//   3. FOV pulls back on takeoff and snaps in hard on landing.
//   4. The camera dips on impact and takes a beat to recover instead of settling.
//   5. You can rotate the car in the air, so you have something to DO up there.
//      (That one lives in car.js, but it's the reason the rest works.)

export const AIR = {
  timeScale: 0.86,
  scaleIn: 0.09,        // seconds to ease into dilation
  scaleOut: 0.16,

  fovGround: 62,
  fovAir: 86,
  fovLand: 56,          // the snap-in on touchdown
  fovAirEase: 0.55,
  fovLandEase: 0.10,
  fovRecover: 0.40,

  duckTo: 0.07,         // how far the engine/gravel drop in the air
  duckIn: 0.10,
  duckOut: 0.05,

  dipMax: 0.85,         // metres the camera drops on a heavy landing
  dipRecover: 0.42,
  minAirForFx: 0.22,    // ignore little kerb hops
};

const approach = (a, b, tau, dt) => a + (b - a) * (1 - Math.exp(-dt / Math.max(tau, 1e-4)));

export class AirFx {
  constructor() {
    this.timeScale = 1;
    this.fov = AIR.fovGround;
    this.duck = 1;
    this.dip = 0;
    this.shake = 0;
    this._landT = 999;
    this._flying = false;
  }

  // Call with real (undilated) dt, before physics, so the dilation applies this frame.
  update(dtReal, car) {
    const flying = car.airborne && car.airTime > AIR.minAirForFx;

    if (car.justLanded) {
      car.justLanded = false;
      if (car.lastAirTime > AIR.minAirForFx) {
        this._landT = 0;
        this.dip = AIR.dipMax * (0.35 + 0.65 * car.landingHit);
        this.shake = car.landingHit;
        this.fov = AIR.fovLand;
      }
    }
    this._landT += dtReal;
    this._flying = flying;

    this.timeScale = approach(this.timeScale, flying ? AIR.timeScale : 1,
      flying ? AIR.scaleIn : AIR.scaleOut, dtReal);

    this.duck = approach(this.duck, flying ? AIR.duckTo : 1,
      flying ? AIR.duckIn : AIR.duckOut, dtReal);

    // On landing the FOV was slammed to fovLand; let it walk back out.
    const fovTarget = flying ? AIR.fovAir : AIR.fovGround;
    const tau = flying ? AIR.fovAirEase : (this._landT < AIR.fovRecover ? AIR.fovRecover : AIR.fovLandEase);
    this.fov = approach(this.fov, fovTarget, tau, dtReal);

    this.dip = approach(this.dip, 0, AIR.dipRecover, dtReal);
    this.shake = approach(this.shake, 0, 0.18, dtReal);

    return this.timeScale;
  }

  get flying() { return this._flying; }
}
