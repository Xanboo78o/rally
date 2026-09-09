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

## The track maker, and the land coming first

Adam, 2026-09-08: *"we will make a track maker website, it uses a noise map for
heightmap, then random gens a material with tags, then i decorate it and add roads."*

This inverts the engine. Up to here **the road made the ground**: `Stage._build()`
integrates a list of turns into a centreline and `groundProfile()` extrudes a hillside
sideways off it. There is no terrain — which is why the skirt folds through itself in
tight corners and has to be narrowed by `_spans()`, and why `rise` has to be written by
hand for every segment.

Now the land exists first and a road is drawn **on** it, which is how a rally road
happens in the first place: nobody designs a stage in the air, they find a road across a
mountain. What follows from that, all of it for free:

- `rise` stops being authored. Height comes from the land, so **crests and jumps are
  found, not written** — you route over a ridge and there's your jump.
- `_spans()` and the fold-through hack die, because the ground isn't extruded any more.
- **Camber** arrives on its own, out of the cut and fill, and off-camber is the scariest
  thing in rally.
- **Pace notes get measured off the road instead of written**, which kills the mirrored-
  notes bug above as a *class*, and makes a stage run backwards produce correct notes on
  its own. The coaching lines (`START TURNING EARLY`) stay hand-written on top.

**A world is a seed.** About forty bytes, which is what you want when one goes out to a
group chat every morning. `maker.html?seed=N` is the whole address of a place.

### The roll

Rolling does not generate a track. It generates a **place to go and look at** — the
layout rule doesn't move. What it rolls is a MATERIAL, and a material is only **four
colours and five words**: rock, dust, growth, sky. Everything else is derived, so
changing one colour moves the whole place together instead of leaving eleven hexes to
reconcile by hand.

The tags are not labels, they drive things. `young` buys octaves and bends the ridgelines
harder; `ancient` rounds them off; `slick` / `loose` / `hard` set the grip the car
actually gets; `hot` turns on the heat shimmer; `dark` drops the exposure and closes the
fog in. One roll therefore produces a coherent place — a full `atmos.js` entry plus a
surface — and every field is a suggestion to be overwritten.

Sixteen materials so far (BASALT, SCORIA, LATERITE, CHALK, GRANITE, SHALE, LOESS,
SERPENTINE, GYPSUM, HALITE, TILL, IRONSTONE, TUFF, ANORTHOSITE, OBSIDIAN, PERMAFROST)
over seven **forms** — `rolling`, `ridged`, `mesa`, `terraced`, `dunes`, `cratered`,
`flats` — and each form is a different problem for a road to solve.

The ground is **painted, not textured**: colour comes per vertex from what the land is
*doing* there — steep goes bare to the rock, low and flat carries growth, high bleaches
to dust. So a new material re-*reads* the land rather than only recolouring it.

### What's built

`js/terrain.js` (seeded gradient noise, domain warp, the seven forms, bake to a grid),
`js/materials.js` (the roll), `js/land.js` (the mesh and the hillshaded map), and
`maker.html` — fly over a world, then get in and drive it with no road at all, which is
also how you'd choose where a road goes. The material's grip is already wired into the
car, so obsidian really is slippery. A world bakes in about a quarter of a second.

Learned immediately, and it's about the game rather than the tool: **there is no
throttle**. Put the car down facing downhill and it is gone before you let go of the
mouse — off the edge of a mesa and falling within four seconds. It gets dropped along
the contour instead.

### Not built: the roads

The open question, and the next thing. Two ways to draw one, and they want different
tools: on the **map**, top-down with the contours in front of you, which is how you get
a nine-kilometre stage in two minutes; or by **driving** the line you want, which
guarantees the road goes somewhere a car can actually go and is what a recce is. The
synthesis worth trying is both — rough it in on the map, then drive it to commit, and
the driving pass is what sets the width, the cut and the camber. A road that appears
because you wore it in.

Also open: whether a world is **one plot with several stages on it** — a month is a
planet, four stages on the same mountain, and you recognise a ridge from Tuesday — or
one plot per stage. The first is what a real rally is.

## Tracks, written in code

Adam, 2026-09-09: *"okay maybe instead we'll make them in code ToT"* — so the maker goes
on the shelf (it still works: `maker.html`, and `js/terrain.js` / `js/materials.js` /
`js/land.js` are intact) and the roads get written by hand.

**The unit of authoring is a SECTION, not a stage.** A section is forty to ninety seconds
of one kind of road with a name; a track is an ordered list of them. They compose for
nothing, and that isn't a feature anyone built — it falls out of the road being stored as
a **turn sequence rather than as positions**. There is no map and no closed loop, so the
builder keeps integrating from wherever the last section left it and any two pieces join
perfectly, always. Eight sections is not one stage, it's however many stages you write
down. It is also exactly what a real rally is: the same roads, in different orders, on
different days.

Everything lives in `js/tracks.js`. The original 8.9 km is now its eight sections, byte
for byte, plus three new ones:

- **THE NARROWS** (`gorge`) — the opposite character to THE GORGE in the same place. The
  gorge is linked corners with no rest; this is 200-metre flat-out straights with rock a
  metre off each wheel, broken by corners that are *square*. A place can have more than
  one road through it.
- **THE TERRACES** (`ruins`) — a shelf, a hairpin down to the next shelf, repeat. The
  rhythm is deliberately regular so the *descent* can break it: every hairpin arrives from
  further downhill than the last, so you meet each one faster while the corner itself
  stays identical.
- **THE CAUSEWAY** (`plateau`) — dead flat, and the corners are barely corners: a 6 that
  goes on for two hundred metres. Which is where the heavy wheel bites hardest, because
  even a corner you can take flat has to be *started* eighty metres out, and you cannot
  see eighty metres of anything from the seat.

Four tracks: **THE FULL STAGE** (the eight originals — still the tutorial, and the only
one that teaches), **SHAKEDOWN**, **THE BIND**, **THE LONG RUN**. `?track=<key>` picks
one. Sections are reused across tracks on purpose.

### The checkers

`tools/trackcheck.mjs` is the gate. It verifies **every corner call against the
geometry** — the failure that cost a week — plus every note against the 129 recorded
clips (a word he never said comes out as silence at 90mph), hairpin calls against actual
degrees, landmark kinds, and width steps at section joins.

`tools/simcheck.mjs` now judges a track against **what that track is for**, declared as
`wants` on the track itself. THE BIND has no jump and a narrow speed band deliberately;
reporting that as a failure is noise, and noise in a checker is how a real failure gets
scrolled past.

Both earned their keep immediately. simcheck called the first SHAKEDOWN flat — *one* mph
of speed variation across the whole thing, which is not a track, it's a corridor — so it
got THE VILLAGE on the end and now spreads 29. And it caught THE NARROWS averaging 56 mph
when the entire idea of the section is that you arrive at a 90 at ninety: the straights
were 120-150 m, which isn't enough road to build speed from a corner exit. At 190-280 m
it does what its own comment claims.

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

### The notes were mirrored — found 2026-09-08, fixed 2026-09-09

Every corner on the stage bent the opposite way to the note that called it. `turn: -34`
was labelled `LEFT 5 LONG` and the road went **right**. All 105 of them.

The header of `js/stage.js` asserted "negative is left" and nothing ever checked it
against the camera. `js/main.js` documents the real convention where it pans the gravel
noise — *"`lateral` is positive toward the driver's LEFT (the camera is rotated by PI +
yaw, so world +X ends up on the left)"* — and the road's lateral vector is built from
that same `(cos head, -sin head)`. So increasing `head` swings the road to the driver's
left, which makes a **positive** turn a left-hander. `js/car.js` says the same thing
independently where it negates the steering.

Confirmed three ways: by projecting a point 30m into each corner through a camera set up
exactly as `main.js` sets up its own; by that documented convention; and by standing in
`HAIRPIN RIGHT 1 — LAST ONE` with the view locked to the road's heading in `props.html`
and watching the road leave to the left.

It was invisible because you drive where the road is, not where the voice says — which
is why it survived. It was fatal to the design: the co-driver is the core mechanic, the
tutorial teaches the wheel through the notes, and THE DESCENT is only drivable if you
trust a voice that was lying every time it spoke.

**The fix, and a changed mind.** The first recommendation here was to flip the geometry —
`head -= dTurn`, one character — on the grounds that the notes are the hand-authored
design and shouldn't move. That was wrong, and it would have mirrored a stage that had
already been driven and learned. The corner *sequence* is the design; whether the
co-driver says "left" or "right" is a fact about the road, not a creative choice. So the
words moved instead: every `LEFT` and `RIGHT` inside a note string was swapped, which is
exactly right, because the notes had been written for the mirror image of the real road —
mirroring them makes them true, and keeps every internal relationship in a note ("corner
one way, rock on the other side") intact.

**The road did not move at all.** Same 8.9 km, same corners, same everything he has
learned. 73 corner calls now verified against the projected geometry, 0 wrong, and that
check is worth keeping around for every track written from here.

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
