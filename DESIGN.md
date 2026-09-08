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
- **No tilt steering.** Ever.

**Air time should feel much bigger than it is.** In order of how much they matter:
silence (cut the engine and gravel on takeoff, leave wind — this one is most of it),
slight time dilation, FOV pulling back then snapping in on landing, the camera dipping
on impact and recovering late, and mid-air rotation so you have something to *do* up
there. Landing straight keeps your speed; landing sideways doesn't.

**Co-driver.** Recorded, not TTS — TTS can't do the flat, fast, clipped rally cadence,
or the voice cracking when you're about to die. Pace notes are a fixed vocabulary
(~60–100 short clips, sequenced live), so one co-driver is an afternoon with a phone mic.
Different accents become different *characters* with different call timing: early and
vague, late and precise, calm, panicky. Friends can record their own.

---

## What's actually built

Only the feel prototype: one hand-authored stage with a jump, the wheel model, the
handbrake and downshift, and the air-time stack. No traps, no calendar, no multiplayer,
no upgrades, no menus. The open question it exists to answer is the **resistance curve** —
how much lock one thumb sweep buys you — which can only be found by holding it.

Sound is a deliberate placeholder; per the standing rule the real noises get sourced from
CC0 stock. The silence-on-takeoff trick just can't be judged in total silence.
