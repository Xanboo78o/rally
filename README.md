# RALLY — feel prototype

Unnamed phone rally game. This repo currently contains **only the driving prototype**:
one hand-authored stretch of gravel with a jump, so the controls can be judged by thumb.

Play: https://xanboo78o.github.io/rally/

## Controls

- **Left thumb** — grip the wheel and sweep it in an arc. Sweep left and up to go left.
  The wheel is heavy at speed and your thumb can outrun it; let go and it unwinds.
- **Right thumb** — **hold** for handbrake, **flick down** for a downshift.
- No throttle. You're always flat out.
- Desk: `A`/`D` steer, `Space` handbrake, `S` downshift.

## What to tell me after driving it

The one thing that can't be designed on paper is the **resistance curve** — how much lock
one thumb sweep buys you. Everything in `js/wheel.js` under `TUNE` is meant to be moved.

- too floaty / can't catch a slide → raise `baseRate`, lower `lockHeavy`
- too heavy at speed → lower `speedHeavy`
- wheel snaps back too fast when you lift → lower `returnBase` / `returnSpeed`
- your thumb runs out of screen → lower `fullLockSweep`, or raise `rimRadius`

## Tools

- `node tools/simcheck.mjs [--v]` — drives the stage headlessly with a crude autopilot
  and reports stage time, time off road, and every flight. Physics changes should keep
  all three verdicts green.
- `node tools/shot.mjs [ms ...]` — headless screenshots.
- `?auto` drives itself; `?auto&at=29` fast-forwards to an exact second first.

See `DESIGN.md` for the whole game — traps, streaks, the world tour, crashes, cars.
