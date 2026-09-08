# Ground audio

Downloaded by Adam on 2026-09-08 and used for the surfaces. Original filenames kept
here so the provenance is traceable — check the licence terms on the source before this
goes anywhere public.

| in game | original file |
|---|---|
| `dirt-bed.mp3` | freesound_community-hand-digging-dirt-leaves-crunch-32630 |
| `grit-1.mp3` | freesound_community-gravel-stone-dirt-debris-falling-small-1-3-36216 |
| `grit-2.mp3` | freesound_community-falling-in-dirt-87202 |
| `grit-3.mp3` | joentnt-walk-on-dirt-1-291981 |
| `rock-1.mp3` | freesound_community-falling-rock-105396 |
| `rock-2.mp3` | lordsonny-small-rock-break-194553 |
| `rock-3.mp3` | dragon-studio-heavy-rock-rolling-515254 |
| `smash-1.mp3` | freesound_community-rock-destroy-6409 |
| `stick-1.mp3` | freesound_community-stick-snap-1-83897 |
| `stick-2.mp3` | freesound_community-stick-snap-2-83899 |
| `stick-3.mp3` | nematoki-wooden-stick-crack-493322 |
| `wood-1.mp3` | dragon-studio-breaking-wood-356120 |

## How they're used

None of them is a continuous "driving on gravel" loop, so the ground is granular:

- **bed** — `dirt-bed` looped underneath, its gain, pitch and filter retuned per surface,
  so changing surface is a crossfade rather than a cut between clips.
- **grains** — short random windows cut out of the one-shots at random pitch, fired at a
  rate that scales with speed. A handful of files gives endless variation this way, and
  it can't machine-gun however long you drive.
- **off-road** swaps the bank to sticks and wood, because that's what you're driving
  through out there.
- **rolling** stacks `smash-1`, `rock-2`, `rock-3`, `wood-1` and `stick-3` on each impact.

Still missing: an engine. The synth engine in `js/audio.js` is a generated firing
sequence and it's the weakest thing in the mix.
