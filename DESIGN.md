# RALLY — design bible

Unnamed. A phone rally game for the group chat. This file is the record of what's
locked; the code in `js/` is only the feel prototype for the driving.

---

## The shape of it

Rally is the only motorsport that is already **asynchronous** — everyone runs the same
stage alone against the clock. That's the GamePigeon format for free, with no netcode.

- **Weekdays** — a daily stage. Run it whenever. Streak = you **showed up and ran
  today**, not that you won.
- **Weekends** — multiplayer, on circuits. Quali is a clean solo lap; the race is where
  wheel-to-wheel defending lives.
- **Months** are themed, and the calendar is a **world tour** — a month is a planet you
  travel to. A month can be dedicated to a discipline (a circuits month is just hotlaps).

## The world

A whole galaxy: **"mostly 40k minus violence"** — the grit is scale, age and decay
(enormous, ancient, gold and banners, nobody remembers how any of it works), not gore.
Though there *is* violence out there, in other worlds, with wars. Plus a lot of Star
Wars and Mario Kart scenery. Entire **medieval worlds** with no sci-fi at all, even
though they're perfectly capable of interplanetary travel. The championship *arrives* —
something vast drops out of the sky, unloads the cars, and you go rallying through a
village that has never seen an engine.

**Pride month** is a world, not a paint job: somewhere that exists on the map all year
with its own name and history, built with the friends it's for rather than about them.
Rainbow-road-style tracks. Ideas that clear the bar of being a good racing mechanic
*first* and meaning something second:
- your trail doesn't fade, and driving through someone's trail gives you grip — the
  first person out takes all the risk and everyone behind gets an easier ride;
- you're faster in a group than alone, so a pack beats the quickest car driving solo;
- no single optimal racing line — two or three genuinely equal routes.
- *the meta one:* the track starts **grey** and is coloured in by everyone who drives
  it, so by the end of the month every stripe on it is a line a friend actually drove.

## Defending — the bike-kid law

Biking with friends, Adam couldn't pass a kid who was slower and in a lower gear. The
kid swerved, matched his position, and won by being fearless. Two things came out of it,
and both are load-bearing:

1. **Closing speed is a liability, not a weapon.** Adam was the faster one. His speed
   never became a pass — it became *braking*. A pass is a timing and gap problem, not a
   speed problem.
2. **Defending was free.** The kid stayed with the pack the whole time. Defending
   doesn't cost the defender; it transfers the entire cost to the attacker. So the
   stopwatch does **not** punish blocking — the road does. You can't watch behind you at
   rally speed.

Dust is the rally-canon version: on gravel the lead car blinds whoever's close. Free for
him, ruinous for you. Get out of his line into clean air and you're on the loose stuff
with no grip.

## Traps — asynchronous defending

A gadget that lays **spikes for whoever runs the stage after you**. This is how
defending works with nobody else on track: you don't have to be there, you leave
something behind. Real-rally precedent is running order — the first cars sweep the loose
gravel off the line and lose time for it.

- Spikes → puncture → the tyre-change sequence. The consequence already exists.
- Traps expire on **real time**, not runs. Upgrading a gadget extends **duration**, not
  lethality. Beginner spikes last ~30–60 min.
- So the stage is alive across the day and your friends' actual schedules become the
  map: lunch is a warzone, 3am is pristine glass. Timing your run is strategy.
- Keep trap *charges* per run tiny (~2) or the longest-serving player owns every day.
- The co-driver must call "caution" or a trap is robbery rather than strategy. Late-game
  upgrade: spikes your notes *don't* call.

Upgrades therefore split in two: **stuff that helps you** (jet engine, grip, suspension)
and **stuff that hurts whoever comes after**. With limited slots every loadout is a
choice between going faster and stopping the person behind — made in a menu, before you
drive.

## Crashes

Not a fail state. A severity spectrum, and meant to be shareable:
- small — a dent;
- medium — a popped tyre → warning light → get-out cutscene → **tyre-change minigame** →
  rejoin. A fixed time cost you have to perform while he drives off, which is exactly why
  you still won't hit the car in front;
- huge — the Monte Carlo send-off over the side of the mountain, driver climbs out and
  does the arms-up `\o/`. ~1% chance to recover, so once in a blue moon someone tumbles
  down the hill, lands on all four wheels and drives out of it.

## Cars

From manufacturers (identity and character), then changed up like Hill Climb Racing:
real car stuff for dummies, plus fantastical (JET ENGINE). Upgrades should be **trades,
not a power ladder** — otherwise the day-one player is permanently better than someone
who joins in March, which is the whole thing we're avoiding. Time played buys **options**
(more manufacturers, wider setup range), not power.

## Dailies without generating levels

The Google Snake model: ~10 categories of modifiers × ~10 each (10^10 — ten billion).
The **track is hand-authored; only the ruleset is rolled.** Candidate categories:
surface, weather, time of day, car class, tyre rules, damage rules, direction, gravity,
what the HUD shows you, and a starting handicap.

## Driving

**First person.** Which promotes the co-driver from flavour to the core mechanic: you
can't see over the crest, so trusting the voice *is* the skill. It also makes dust
genuinely blinding and makes traps fair. Problem to design around: you never see your own
car, so the personality goes *inside* — dashboard, switches, cage, whatever dangles off
the mirror.

The interior is a **2D overlay**, not 3D geometry — a real onboard camera is bolted to
the car, so the dash and wheel are perfectly static and only the world moves behind them.
Which means the interior is *artwork*: Adam can draw a dashboard per manufacturer the way
he draws everything else, and it costs nothing to render. Only the bonnet stays in 3D, so
it takes real light and occludes the road. The **windscreen is its own layer** on top —
dust builds up off the road, and it's where rain, mud and cracks go when the daily roll
asks for them.

**Controls — two thumbs, both parked on the dashboard where they block nothing.**

- No throttle. You're always flat out.
- **Left thumb — the wheel**, and it is an *object with state*, not an input mapping.
  It has an angle that persists, and resistance that grows both with how far it's turned
  and with car speed. Your thumb applies force; per tick the wheel travels toward it
  against that resistance. *"wheres the wheel, whats the speed, turn this amount per game
  tick."* The thumb sweeps an **arc**, gripping the bottom of the rim — which is also the
  motion a thumb naturally makes, since it pivots around its base joint.
  - steering goes heavy at speed by itself, so no fake assist is needed;
  - your thumb can **outrun** the wheel, and that lag *is* the feeling of weight;
  - let go and it unwinds — fast at speed, lazily when slow — and you watch it do that;
  - the Scandinavian flick becomes real momentum instead of a recognised gesture.
- **Right thumb — hold** for the handbrake (blunt: locks the rear, scrubs speed, big
  rotation, for hairpins). **Flick down** for a single downshift (scalpel: the engine
  braking kicks the car into rotation but *keeps* speed, for fast corners). Upshifts are
  automatic and there is no gear number, because Adam doesn't use manual gears — you just
  have two ways to turn the car, one big and one small.
- **The interlock:** the wheel is too heavy to whip at speed, so when you're quick you
  *cannot* rotate the car with steering alone — you have to use the handbrake or the
  downshift. Three inputs, one system, no rule to explain. And a heavy wheel takes time,
  so you must start turning before the corner arrives — which in first person you can't
  see. Acting on the notes early is mandatory, not flavour.
- **No tilt steering.** Ever. But **tilt to LOOK** — tip the phone down and your head goes
  down (console, shifter, footwell), tip it up and you get headliner and more windscreen.
  The cabin is built taller than the screen so there's something there to find, and the
  interior slides slightly further than the world does, which is what reads as depth.
  Neutral is calibrated from however you happen to be holding it when a run starts.

**Air time should feel much bigger than it is.** In order of how much they matter:
silence (cut the engine and gravel on takeoff, leave wind — this one is most of it),
slight time dilation, FOV pulling back then snapping in on landing, the camera dipping
on impact and recovering late, and mid-air rotation so you have something to *do* up
there. Landing straight keeps your speed; landing sideways doesn't.

**Co-driver.** Recorded, not TTS — TTS can't do the flat, fast, clipped rally cadence,
or the voice cracking when you're about to die. Pace notes are a fixed vocabulary
(~60–100 short clips, sequenced live), so one co-driver is an afternoon with a phone mic.
The recording script — every clip, every intensity — is `VOICELINES.md`.
Different accents become different *characters* with different call timing: early and
vague, late and precise, calm, panicky. Friends can record their own.

---

## The stage, and the filters

The prototype stage is **8.9 km, about five minutes**, hand-authored corner by corner in
`js/stage.js` (nothing generated — only the daily *ruleset* ever gets rolled). It's also
the tutorial, and it teaches in the only voice the game has: the co-driver. The first
time a technique is the only way through, he says so out loud; after that he trusts you
and just calls the corner.

| | place | the road | what it teaches |
|---|---|---|---|
| 1 | **THE DROP ZONE** | wide, fast, first light | the wheel is heavy — start turning early |
| 2 | **THE PINES** | narrow, dark, trees on the edge | the handbrake, on a hairpin with no room |
| 3 | **THE OLD ROAD** | fast sweepers, gold ruins | the downshift, where a handbrake would kill you |
| 4 | **THE VILLAGE** | square 90s between walls | placing the car to the metre |
| 5 | **THE GORGE** | linked corners, rock, no run-off | rhythm — a corner entered wrong stays wrong |
| 6 | **THE CLIMB** | five stacked hairpins | all of it, uphill |
| 7 | **THE PLATEAU** | flat out, heat haze, **the big jump** | landing straight |
| 8 | **THE DESCENT** | downhill, blind crests, evening | actually trusting the notes |

**Open question, not settled:** whether a daily stage should be a *tour* like this at all.
A real rally stage is one kind of road for five minutes, and a stage you learn deeply —
where mastery is knowing the third left tightens — is a different game from one that
keeps showing you new things. This version is the tour; it isn't a decision.

### The notes are mirrored — found 2026-09-08, NOT yet fixed

Every corner on the stage bends the opposite way to the note that calls it. `turn: -34`
is labelled `LEFT 5 LONG` and the road goes **right**.

The header of `js/stage.js` asserts "negative is left", and nothing ever checked it
against the camera. `js/main.js` documents the actual convention where it pans the
gravel noise: *"`lateral` is positive toward the driver's LEFT (the camera is rotated by
PI + yaw, so world +X ends up on the left)"* — and the road's lateral vector is built
from the same `(cos head, -sin head)`. So increasing `head` swings the road to the
driver's left, which makes a positive turn a LEFT-hander, not a right one.

Confirmed three ways: by projecting a point 30m into each corner through a camera set up
exactly as `main.js` sets up its own; by that documented convention; and by standing in
`HAIRPIN RIGHT 1 — LAST ONE` with the view locked to the road's heading in `props.html`
and watching the road leave to the left.

It is invisible if you learn the stage by feel — you steer where the road is — which is
why it survived. It is fatal to the design: the co-driver is the core mechanic, the
tutorial teaches the wheel through the notes, and THE DESCENT is only drivable if you
trust a voice that is currently lying every time it speaks.

**The fix is one character:** `head -= dTurn` in `Stage._build()`. That mirrors the whole
stage so it matches all 105 notes, which are the hand-authored design and should not
move. Everything else — props, sections, landmarks, the atmos crossfade — is derived
from `head` and follows for free. Nothing about the car changes; it is the same road in
a mirror. The one thing that must flip with it is the landmark `side` default, which
picks the outside of a corner: it becomes `seg.turn > 0 ? 1 : -1`.

Not applied yet, because it changes the direction of every corner on a stage that has
been driven, and that is Adam's call.

### Landmarks

Everything beside the road is scattered by a hash of the sample index — which is what
makes eight kilometres of gravel affordable, but it also means nothing is anywhere in
*particular*, and a road you can't see over is learned by objects. Nobody brakes at 340
metres; they brake at the burnt-out car.

So there is a second kind of prop: a **landmark**, placed by hand, written on the same
line of `js/stage.js` as the note that mentions it — because half of them exist for
exactly that reason. The co-driver had been calling an arch and a bridge that were not
there. Kinds so far: `arch`, `bridge`, `banner` (gold cloth over the road — the
championship hung its banners over a village that has never seen an engine, and it is
also the only thing in the game that passes over your head), `chevron` (marker boards
stepping away from you on the outside of a corner: the second channel alongside the
voice, drawing a radius you cannot see round), `wreck`, `crowd`, `tree`.

Landmarks are authored in **road space** — across, along, and up from the tarmac — so
they don't care which way the road is pointing, and the ones that run along it resample
as they go rather than being extruded off one sample's heading.

**Open, unanswered:** nothing beside the road is *solid*. You can drive through a pine at
90mph, so the pines only look narrow, and the crash spectrum above has nothing to hit but
the ground. Making props solid changes every corner on the stage at once, and it needs
soft props (bales, snowbank, brush) alongside the hard ones so a mistake isn't always
fatal — put the soft things where the mistake is likely and the hard things where the
road is telling you not to go.


### Filters

`js/atmos.js` is one table where **each entry is a place, not a setting** — it carries a
look *and* a sound, and the stage crossfades between them over the last 150 m before a
boundary, at the same metre every run. So the fog closes in as the gorge arrives and the
room grows around you at the same moment.

- **Look** (`js/post.js`, one full-screen pass): depth-based **distance blur**, so the far
  side of the valley goes soft while the stones by your wheel stay sharp; **heat shimmer**
  over the plateau, masked by distance because it's the column of air between you and the
  thing that wobbles; then exposure, tint, saturation, contrast, vignette and grain.
  The windscreen is deliberately *not* in the pass — dust sitting a foot from your eye
  should not be blurred by two hundred metres of haze.
- **Sound** (`js/audio.js`): everything outside the car goes through a **room** — a short
  pre-delay into three tuned feedback lines, panned apart — whose size, decay, darkness
  and wet level all come from the same table. And it's **stereo**: the gravel bed is two
  copies of one recording pulled left and right so they never correlate, stones scatter
  across the field, the slide moves to the side the back end went, and dropping a wheel
  off makes the noise come from *that side of the car*, which is the cue that tells you
  which way to correct when you can't see it.
- One lowpass on the world bus is the bodywork you're sitting in. It shuts down as the
  wheels leave the ground, so takeoff goes *muffled and distant* rather than merely quiet.

Keys **1–8** pin a filter and **0** hands it back to the stage, so a look can be judged on
its own instead of only in the stretch of road where it happens to occur. **P** turns the
whole pass off, and `?post=0` does the same on a phone.

## What's actually built

Only the feel prototype: the five-minute stage above, the wheel model, the handbrake and
downshift, the air-time stack, and the per-place filters. No traps, no calendar, no
multiplayer, no upgrades, no menus. The open question it exists to answer is the **resistance curve** —
how much lock one thumb sweep buys you — which can only be found by holding it.

Sound is a deliberate placeholder; per the standing rule the real noises get sourced from
CC0 stock. The silence-on-takeoff trick just can't be judged in total silence.
