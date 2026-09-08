# VOICELINES — the co-driver recording script

Per `DESIGN.md`: the co-driver is **recorded, not TTS**, and the notes are a **fixed
vocabulary sequenced live**. So you are not recording 105 pace notes for this stage —
you're recording ~110 atoms that the game chains into any note, on any stage, forever.

**Read every rule in "How to say it" before you press record.** The delivery matters more
than the word list; a good list read badly is unusable, and there's no fixing it in post.

---

## How to say it

**You are not acting. You are reading a shopping list, fast, in a car that is trying to
kill you.** Flat, clipped, bored, quick. The moment it sounds performed it sounds fake.
Real co-drivers sound like they're annoyed to be there.

Eight rules, in order of how much they matter:

1. **Never let your pitch drop at the end of a line.** A falling tone means "sentence
   over" and the next clip will sound bolted on. End every atom flat or slightly *up*,
   like there's a comma after it. The only exceptions are the reaction lines at the
   bottom, which are allowed to be whole sentences.
2. **Say it at driving pace, not reading pace.** Most of these should be under a second.
   If "left four" takes you a second and a half you're narrating, not calling.
3. **Same distance, same volume, every single line.** Clips get chained back to back, so
   if one is louder than the next the note steps up and down and the illusion dies. Pick
   a distance from the phone and do not drift.
4. **Leave two full seconds of silence between lines.** That's how I cut them apart. Do
   not fill the gap with breath, "uhh", or paper noise.
5. **Three takes of everything.** Same energy, not three different readings. This is the
   single highest-value thing in the whole session — it's why the fortieth "right four"
   doesn't sound like a tape loop.
6. **Soft room.** A closet with clothes in it, or sit on your bed with a duvet over you
   and the phone. Not the bathroom, not the kitchen, not outside.
7. **Phone a hand's width away and off to one side**, not straight on. "Hairpin" and
   "plateau" will thump the mic otherwise.
8. **Breath is allowed, and good, in the urgent takes.** A co-driver on a mountain is out
   of breath. Don't clean that up.

### The three intensities

Every clip has an intensity, and the game picks which one to fire based on how tight the
corner is and how fast you're going. You do **not** record all three of everything.

| tier | how | which lines |
|---|---|---|
| **CALM** | flat, quick, bored. The default voice. | **everything**, ×3 takes |
| **URGENT** | ~20% faster, a bit louder, pitch up, harder consonants. Still not shouting. | the tight stuff — marked **U** below, ×2 takes |
| **CRACKED** | actually shout, let the voice break. Genuinely lose composure. | the marked **C** lines only, ×1 take |

CRACKED is rare on purpose. If you crack on every hairpin it's comedy; if you crack twice
a stage it's terrifying. Trust the marks.

### One character, finished

`DESIGN.md` says different accents become different characters. **Don't.** Not today.
Record one voice completely — a half-finished second character is worse than none,
because the game will fall back mid-stage and you'll hear the seam. Do this whole list as
yourself, get it in the game, then decide whether the second one is worth an afternoon.

### Naming

Record in **one continuous file per section** below and say the section name out loud at
the top of it ("group: corners"). I'll slice and name them. If you'd rather do it
yourself, the slugs are in the left column and the pattern is:

```
vo/adam/left-4-1.mp3      calm, take 1
vo/adam/left-4-u1.mp3     urgent, take 1
vo/adam/hairpin-left-c.mp3   cracked
```

---

## GROUP 1 — corners (the workhorse)

Say the direction and the number **fused into one word-shape** — "leftfour", not
"left ... four". This is why they're one clip each and not "left" + "4"; the join is the
whole sound of rally.

The scale is **1 = tightest, 6 = flat out**, so 1s and 2s carry weight and 5s and 6s are
almost throwaway. Let that show: call a 6 like it's barely worth mentioning.

| slug | say | how |
|---|---|---|
| `left-1` | "left one" | heavy, deliberate — **U** |
| `left-2` | "left two" | heavy — **U** |
| `left-3` | "left three" | firm — **U** |
| `left-4` | "left four" | neutral |
| `left-5` | "left five" | light, quick |
| `left-6` | "left six" | throwaway, almost bored |
| `right-1` | "right one" | heavy, deliberate — **U** |
| `right-2` | "right two" | heavy — **U** |
| `right-3` | "right three" | firm — **U** |
| `right-4` | "right four" | neutral |
| `right-5` | "right five" | light, quick |
| `right-6` | "right six" | throwaway |
| `hairpin-left` | "hairpin left" | its own thing — slower, weightier than a 1. **U**, **C** |
| `hairpin-right` | "hairpin right" | same. **U**, **C** |

## GROUP 2 — distance

Called *after* a corner, as the gap to the next one. Flat, fast, no drama — these are the
glue and they should almost disappear.

| slug | say | how |
|---|---|---|
| `d-30` | "thirty" | |
| `d-40` | "forty" | |
| `d-50` | "fifty" | |
| `d-60` | "sixty" | |
| `d-70` | "seventy" | |
| `d-80` | "eighty" | |
| `d-90` | "ninety" | |
| `d-100` | "one hundred" | |
| `d-120` | "one twenty" | |
| `d-150` | "one fifty" | |
| `d-200` | "two hundred" | a touch of relief in it — that's a long way |

## GROUP 3 — connectors

Tiny, unstressed, glued to whatever follows. Almost swallowed.

| slug | say | how |
|---|---|---|
| `and` | "and" | |
| `into` | "into" | |
| `then` | "then" | |
| `then-immediately` | "then immediately" | quicker than feels right — **U** |

## GROUP 4 — shape modifiers

These hang off the end of a corner call. Every one of them must end **flat or rising**,
because something can always follow.

| slug | say | how |
|---|---|---|
| `long` | "long" | drawn out — the word does the job |
| `short` | "short" | clipped |
| `tightens` | "tightens" | a warning, lean on it — **U** |
| `opens` | "opens" | relaxed, the good news |
| `tight` | "tight" | **U** |
| `very-tight` | "very tight" | **U** |
| `square` | "square" | blunt, flat |
| `narrow` | "narrow" | **U** |
| `narrows` | "narrows" | **U** |
| `flat` | "flat" | confident — this means *don't lift* |
| `blind` | "blind" | **U** |
| `downhill` | "downhill" | |
| `uphill` | "uphill" | |
| `climbing` | "climbing" | |
| `over-crest` | "over crest" | **U** |
| `dont-cut` | "don't cut" | **U** |
| `keep-left` | "keep left" | **U** |
| `keep-right` | "keep right" | **U** |
| `care` | "care" | one syllable of real concern — **U** |

## GROUP 5 — hazards

The ones that keep you alive. All of these get an urgent take; a few get a cracked one.

| slug | say | how |
|---|---|---|
| `caution` | "caution" | **the most important clip in the game** — traps are unfair without it. **U**, **C** |
| `jump` | "jump" | **U** |
| `big-jump` | "big jump" | **U**, **C** |
| `crest` | "crest" | |
| `landing` | "landing" | |
| `land-straight` | "land straight" | **U** |
| `bridge` | "bridge" | |
| `dont-touch-the-edge` | "don't touch the edge" | **U** |
| `rocks-inside` | "rocks on the inside" | **U** |
| `tree-inside` | "tree on the inside" | **U** |
| `walls-both-sides` | "walls both sides" | **U** |
| `wall-on-the-left` | "wall on the left" | **U** |
| `wall-on-the-right` | "wall on the right" | **U** |
| `over-roots` | "over roots" | |
| `over-water` | "over water" | |
| `road-falls-away` | "road falls away" | **U** |
| `nothing-outside` | "nothing on the outside" | flat and grim, not shouted — that's what makes it land. **U** |
| `dont-drop-a-wheel` | "don't drop a wheel" | **U** |
| `under-the-arch` | "under the arch" | |
| `narrowest-point` | "narrowest point" | **U** |
| `bumpy` | "bumpy" | |
| `dust` | "dust" | **U** |
| `spikes` | "spikes" | **U**, **C** — this is the trap call |
| `someones-been-here` | "someone's been here" | quiet, uneasy. The best line in the list. |

## GROUP 6 — instructions

This stage is the tutorial and it teaches in the only voice the game has, so these are
notes, not tooltips. Say them exactly as flat as the corners — the second one sounds like
a hint, it stops being the co-driver.

| slug | say | how |
|---|---|---|
| `flat-out` | "flat out" | |
| `start-turning-early` | "start turning early" | |
| `hold-the-handbrake` | "hold the handbrake" | **U** |
| `handbrake` | "handbrake" | **U** |
| `handbrake-again` | "handbrake again" | **U** |
| `flick-down` | "flick down" | **U** |
| `flick-down-to-rotate` | "flick down to rotate" | |
| `dont-overturn` | "don't overturn" | **U** |
| `dont-lift` | "don't lift" | half a dare — **U** |
| `keep-the-rhythm` | "keep the rhythm" | |
| `slow-it-down` | "slow it down" | **U**, **C** |

## GROUP 7 — places

Called on arrival, not departure — the game only names somewhere you're arriving. These
are the one place you're allowed a little colour, because they're the world talking.

| slug | say |
|---|---|
| `p-drop-zone` | "the drop zone" |
| `p-pines` | "the pines" |
| `p-old-road` | "the old road" |
| `p-village` | "the village" |
| `p-gorge` | "the gorge" |
| `p-climb` | "the climb" |
| `p-plateau` | "the plateau" |
| `p-descent` | "the descent" |
| `out-of-the-trees` | "out of the trees" |
| `out-of-the-village` | "out of the village" |
| `out-of-the-dark` | "out of the dark" |
| `over-the-top` | "over the top" |

## GROUP 8 — the run

Start and finish. The countdown especially: record it as **one continuous take**, all four
words in a row with the real gaps in them, then again as four separate clips — the
continuous one will sound better and I'll use it if it fits.

| slug | say | how |
|---|---|---|
| `count-3` | "three" | |
| `count-2` | "two" | |
| `count-1` | "one" | |
| `count-go` | "go" | flat, not a starting pistol |
| `countdown-full` | "three … two … one … go" | one take, real gaps |
| `stage-start` | "stage start" | |
| `last-corner` | "last corner" | |
| `flat-to-finish` | "flat to finish" | the only line you're allowed to enjoy — **U** |
| `stage-end` | "stage end" | |
| `thats-a-good-one` | "that's a good one" | quiet, genuine |
| `personal-best` | "personal best" | |
| `weve-lost-time` | "we've lost time there" | resigned |

## GROUP 9 — reactions

**These are the only lines that are allowed to be performances.** Everything above is a
tool; this is the character. Full sentences, real pitch movement, take your time. One or
two takes each, and go bigger than feels sensible — you can always pick the smaller one.

Crashes are a severity spectrum in the design, so the reactions are too.

| slug | say | how |
|---|---|---|
| `hit-small` | "*hff*" / "ooh" | a wince, barely a word |
| `hit-small-2` | "that's a dent" | dry |
| `hit-medium` | "ohh no no no" | **U** |
| `puncture` | "we've got a puncture" | flat and final. It's over, and you both know it |
| `warning-light` | "warning light" | |
| `pull-over` | "pull over, pull over" | **U** |
| `tyre-hurry` | "faster, faster" | during the tyre change — **U** |
| `crash-big` | a proper shout — "**AAAH**" | **C**, go all the way |
| `crash-huge` | "no no no no *NO*" | **C** — this is the mountain one |
| `rolled` | "…we're upside down" | after a beat of silence. Deadpan |
| `you-okay` | "…you okay?" | genuinely quiet, after the noise stops |
| `miracle-landing` | "**HOW**" | **C** — for the ~1% four-wheel recovery |
| `near-miss` | "*whoa*" | breath, not word |
| `big-air-whoop` | "*woooo*" | the jump. Let it go on too long |
| `still-with-me` | "still with me?" | |
| `youre-in-a-field` | "you're in a field" | completely deadpan |
| `dont-do-that-again` | "don't do that again" | |
| `nice` | "nice" | small. Rare. Worth more than the rest of the list |

---

## The size of this

~115 clips. ×3 calm takes, plus ~45 urgent lines ×2, plus ~8 cracked ×1 ≈ **440
utterances**. At three seconds a go including the gap that's about **25 minutes of
continuous reading**, so with breaks and restarts it's an afternoon — exactly what the
design budgeted.

Do the groups in this order and stop when you're tired: **1, 4, 2, 5, 3, 6, 8, 7, 9.**
Corners and modifiers alone are a working co-driver; everything after group 5 is polish
and can be a second session. Group 9 last on purpose — by then your voice is tired and
slightly ragged, which is exactly right for the crashes.

**Don't re-record a line you fluffed.** Say it again straight after and keep rolling. The
silence-gap rule means I can find both and take the good one.
