// tracks.js — THE ROADS, hand-written.
//
// The unit of authoring is a SECTION, not a stage. A section is forty to ninety seconds
// of ONE kind of road with a name, and a track is an ordered list of them.
//
// They compose for nothing, and that is a property of how the road is stored rather than
// a feature anyone built: the road is a TURN SEQUENCE, not a set of positions. There is
// no map and no closed loop, so the builder just keeps integrating from wherever the
// last section left it and any two pieces join perfectly, always. Which means eight
// sections is not one stage — it's however many stages you care to write down.
//
// It is also what a real rally is. The same roads, in different orders, on different
// days.
//
// Nothing here is generated. Every corner below was placed by hand.
//
//   len   metres
//   turn  degrees swept across the segment. POSITIVE IS LEFT — see the note in stage.js
//         about the week the co-driver spent calling every corner the wrong way round.
//   rise  metres climbed (or dropped) across it
//   w     road half-width in metres
//   sec   which PLACE you're in — the look and the sound come from js/atmos.js
//   note  what the co-driver calls, ~55m before you arrive
//   mark  hand-placed landmarks — see js/stage.js
//
// tools/trackcheck.mjs verifies every corner call against the geometry. Run it after
// writing road; a note that says LEFT over a right-hander is not a typo you will catch
// by driving, because you drive where the road is, not where the voice says.


// ---- THE DROP ZONE ---------------------------------------------------------
export const THE_DROP_ZONE = [
  // Wide, fast, forgiving. Long corners you cannot take by flicking the wheel at
  // the apex — it's too heavy — so this is where you learn to start early.
  { len: 140, turn:    0, rise:   0, w: 6.0, sec: 'dawn', note: 'STAGE START — FLAT OUT' },
  { len: 120, turn:  -34, rise:   0, w: 5.5, sec: 'dawn', note: 'RIGHT 5 LONG — START TURNING EARLY',
    mark: [{ k: 'crowd', t: 0.55, side: 1, n: 11 }] },
  { len: 110, turn:   30, rise:  -2, w: 5.5, sec: 'dawn', note: 'LEFT 5 LONG' },
  { len:  90, turn:    0, rise:  -3, w: 5.5, sec: 'dawn', note: 'STRAIGHT 90' },
  { len: 130, turn:  -52, rise:   0, w: 5.0, sec: 'dawn', note: 'RIGHT 4 LONG' },
  { len: 100, turn:  -18, rise:   2, w: 5.5, sec: 'dawn', note: '...OPENS, FLAT' },
  { len:  85, turn:   64, rise:   0, w: 5.0, sec: 'dawn', note: 'LEFT 3',
    mark: [{ k: 'chevron', t: 0.15, n: 3 }] },
  { len:  70, turn:   30, rise:  -1, w: 4.6, sec: 'dawn', note: '...TIGHTENS — DONT OVERTURN' },
  { len: 120, turn:    0, rise:   0, w: 5.0, sec: 'dawn', note: 'STRAIGHT 120 INTO THE TREES' },
];

// It is also banked HARDER than the automatic camber gives it — roughly double, up to
// 13 degrees on the tight ones. Adam: "bank the pines turns more." The auto value is
// tuned for open roads; a narrow forest road that's been cut and filled by hand leans
// on you much more than that.
//
// THE PINES is WIDER than it was — every segment gained 1.5m of half-width. It was
// 3.8-4.4, which with 30m trees two metres off the edge was a slot, not a road, and
// there was nowhere to be wrong. Adam: "make the track wider in the pines."
//
// ---- THE PINES -------------------------------------------------------------
export const THE_PINES = [
  // The road halves in width and the trees come to the edge of it. First hairpin:
  // there is no radius here, so the handbrake is the only way round.
  { len:  90, turn:  -44, rise:   3, w: 5.7, cam: -5.9, sec: 'pines', note: 'RIGHT 4 INTO TREES',
    bank: [9, 9] },
  { len:  60, turn:   52, rise:   2, w: 5.5, cam: 10.4, sec: 'pines', note: 'LEFT 3 NARROW',
    bank: [11, 7] },
  { len:  55, turn:  -58, rise:   0, w: 5.3, cam: -12.7, sec: 'pines', note: 'RIGHT 3 TIGHT',
    bank: [8, 12] },
  { len:  70, turn:    0, rise:  -2, w: 5.5, sec: 'pines', note: 'SHORT 70',
    bank: [10, 10] },
  { len:  58, turn: -140, rise:   0, w: 5.5, cam: -13.0, sec: 'pines', note: 'HAIRPIN RIGHT 1 — HOLD THE HANDBRAKE',
    bank: [13, 8],
    mark: [{ k: 'chevron', t: 0.20, n: 2 }, { k: 'crowd', t: 0.5, n: 7 }] },
  { len:  80, turn:    0, rise:   4, w: 5.7, sec: 'pines', note: 'STRAIGHT, CLIMBING',
    bank: [9, 9] },
  { len:  75, turn:   96, rise:   2, w: 5.5, cam: 13.0, sec: 'pines', note: 'LEFT 2 — HANDBRAKE AGAIN',
    bank: [7, 13] },
  { len:  95, turn:  -36, rise:   0, w: 5.7, cam: -4.5, sec: 'pines', note: 'RIGHT 4',
    bank: [12, 9] },
  { len:  70, turn:   60, rise:  -2, w: 5.5, cam: 10.3, sec: 'pines', note: 'LEFT 3 OVER ROOTS',
    bank: [9, 11] },
  { len:  62, turn:  -72, rise:   0, w: 5.3, cam: -13.0, sec: 'pines', note: 'RIGHT 2 — TREE ON THE INSIDE',
    bank: [10, 8],
    mark: [{ k: 'tree', t: 0.45, side: -1, out: 0.9, h: 19, r: 2.2 }] },
  { len:  58, turn:    0, rise:   3, w: 5.5, sec: 'pines', note: 'SHORT 58, CRESTING',
    bank: [8, 10] },
  { len:  65, turn:   26, rise:  -4, w: 5.7, cam: 4.8, sec: 'pines', note: 'LEFT 4 DOWNHILL',
    bank: [11, 11] },
  { len:  55, turn:  -34, rise:  -3, w: 5.3, cam: -7.4, sec: 'pines', note: 'RIGHT 3 — DONT DROP A WHEEL',
    bank: [9, 12] },
  { len: 110, turn:   40, rise:  -2, w: 5.9, cam: 4.4, sec: 'pines', note: 'LEFT 4 LONG, OUT OF THE TREES',
    bank: [10, 9] },
];

// ---- THE OLD ROAD ----------------------------------------------------------
export const THE_OLD_ROAD = [
  // Fast fourth-gear corners. Grabbing the handbrake here throws all your speed away
  // for rotation you didn't need — so this is where the downshift earns its keep.
  { len: 150, turn:    0, rise:   0, w: 5.2, sec: 'ruins', note: 'FLAT OUT 150',
    mark: [{ k: 'banner', t: 0.55 }] },
  { len: 130, turn:  -46, rise:   0, w: 5.0, sec: 'ruins', note: 'RIGHT 5 FLAT — FLICK DOWN TO ROTATE' },
  { len: 120, turn:   50, rise:   0, w: 5.0, sec: 'ruins', note: 'LEFT 5 FLAT' },
  { len:  95, turn:  -62, rise:  -2, w: 4.8, sec: 'ruins', note: 'RIGHT 4' },
  { len: 105, turn:   58, rise:   0, w: 4.8, sec: 'ruins', note: 'LEFT 4 LONG' },
  { len:  60, turn:    0, rise:   6, w: 5.0, sec: 'ruins', note: 'CREST 60',
    mark: [{ k: 'chevron', t: 0.35, side: 0, n: 2 }] },
  { len:  50, turn:    0, rise:  -9, w: 5.0, sec: 'ruins', note: 'CAUTION — JUMP, LAND STRAIGHT' },
  { len:  90, turn:    0, rise:  -4, w: 5.0, sec: 'ruins', note: 'LANDING',
    mark: [{ k: 'wreck', t: 0.6, side: 1, out: 2.0 }] },
  { len: 110, turn:  -70, rise:   0, w: 4.6, sec: 'ruins', note: 'RIGHT 3 LONG' },
  { len:  85, turn:   44, rise:   0, w: 4.6, sec: 'ruins', note: 'LEFT 4' },
  { len:  70, turn:  -50, rise:  -2, w: 4.4, sec: 'ruins', note: 'RIGHT 3' },
  { len: 130, turn:    0, rise:  -3, w: 4.8, sec: 'ruins', note: 'STRAIGHT 130' },
];

// ---- THE VILLAGE -----------------------------------------------------------
export const THE_VILLAGE = [
  // Square corners between walls. Nothing here is fast; all of it is about putting
  // the car exactly where you meant to put it.
  // 4.8, not 4.0: THE BIND runs the pines straight into here, and once the pines got
  // wider that join funnelled 1.9m in one segment. Starting wide also makes the note
  // true — it narrows to 3.2 over the next two.
  { len:  80, turn:    0, rise:  -2, w: 4.8, sec: 'village', note: 'INTO THE VILLAGE — NARROWS' },
  { len:  45, turn:  -84, rise:   0, w: 3.4, sec: 'village', note: 'RIGHT 2 SQUARE' },
  { len:  60, turn:    0, rise:   0, w: 3.4, sec: 'village', note: 'SHORT 60 BETWEEN WALLS' },
  { len:  42, turn:   88, rise:   0, w: 3.2, sec: 'village', note: 'LEFT 2 SQUARE' },
  { len:  70, turn:    0, rise:   2, w: 3.4, sec: 'village', note: 'STRAIGHT 70' },
  { len:  46, turn:  -92, rise:   0, w: 3.2, sec: 'village', note: 'RIGHT 2 SQUARE' },
  { len:  38, turn:   84, rise:   0, w: 3.0, sec: 'village', note: 'LEFT 2 — VERY TIGHT' },
  { len:  64, turn:    0, rise:   2, w: 3.4, sec: 'village', note: 'SHORT 64 THROUGH THE SQUARE',
    mark: [{ k: 'crowd', t: 0.5, side: -1, n: 9, out: 0.2 }] },
  { len:  48, turn:   96, rise:   0, w: 3.2, sec: 'village', note: 'LEFT 2 SQUARE' },
  { len:  56, turn:  -36, rise:  -1, w: 3.4, sec: 'village', note: 'RIGHT 3, UNDER THE ARCH',
    mark: [{ k: 'arch', t: 0.40 }] },
  { len:  55, turn:    0, rise:   0, w: 3.4, sec: 'village', note: 'STRAIGHT 55, WALLS BOTH SIDES' },
  { len:  40, turn:   80, rise:   0, w: 3.2, sec: 'village', note: 'LEFT 2 TIGHT' },
  { len:  50, turn:  -30, rise:   0, w: 3.4, sec: 'village', note: 'RIGHT 4' },
  { len:  44, turn: -100, rise:  -2, w: 3.2, sec: 'village', note: 'RIGHT 2 SQUARE, THEN OUT' },
  { len: 100, turn:   20, rise:  -3, w: 4.0, sec: 'village', note: 'LEFT 5, OUT OF THE VILLAGE' },
];

// ---- THE GORGE -------------------------------------------------------------
export const THE_GORGE = [
  // Linked corners with rock either side. There is no run-off and no time to reset
  // between them, so a corner you enter wrong stays wrong for the next four.
  { len:  70, turn:  -38, rise:  -4, w: 3.6, sec: 'gorge', note: 'RIGHT 4 INTO THE GORGE — NARROWS' },
  { len:  55, turn:   46, rise:  -3, w: 3.4, sec: 'gorge', note: 'LEFT 3' },
  { len:  50, turn:  -50, rise:  -2, w: 3.4, sec: 'gorge', note: 'RIGHT 3' },
  { len:  48, turn:   54, rise:   0, w: 3.4, sec: 'gorge', note: 'LEFT 3' },
  { len:  46, turn:  -56, rise:   0, w: 3.4, sec: 'gorge', note: 'RIGHT 3 — KEEP THE RHYTHM' },
  { len:  52, turn:  -44, rise:   0, w: 3.4, sec: 'gorge', note: '...TIGHTENS' },
  { len:  58, turn:   62, rise:  -2, w: 3.4, sec: 'gorge', note: 'LEFT 2 OVER WATER' },
  { len:  54, turn:   48, rise:  -2, w: 3.4, sec: 'gorge', note: 'LEFT 3' },
  { len:  50, turn:  -52, rise:  -2, w: 3.2, sec: 'gorge', note: 'RIGHT 3 — NARROWEST POINT' },
  { len:  62, turn:   36, rise:   0, w: 3.4, sec: 'gorge', note: 'LEFT 4' },
  { len:  70, turn:  -30, rise:   2, w: 3.6, sec: 'gorge', note: 'RIGHT 4 LONG, ROCK ON THE LEFT' },
  { len:  60, turn:   40, rise:   2, w: 3.6, sec: 'gorge', note: 'LEFT 4' },
  { len:  90, turn:    0, rise:   0, w: 3.8, sec: 'gorge', note: 'BRIDGE — 90, DONT TOUCH THE EDGE',
    mark: [{ k: 'bridge', t: 0.5, len: 84 }] },
  { len:  65, turn:  -88, rise:   3, w: 3.6, sec: 'gorge', note: 'RIGHT 2 OFF THE BRIDGE' },
  { len:  80, turn:   34, rise:   4, w: 4.0, sec: 'gorge', note: 'LEFT 4 CLIMBING' },
  { len:  55, turn:  -66, rise:   3, w: 3.8, sec: 'gorge', note: 'RIGHT 2' },
  { len:  75, turn:   30, rise:   5, w: 4.0, sec: 'gorge', note: 'LEFT 4, OUT OF THE DARK' },
];

// ---- THE CLIMB -------------------------------------------------------------
export const THE_CLIMB = [
  // Four hairpins stacked up a mountainside, with a long fast corner between each
  // pair so you never get into a rhythm. Everything you've learned, uphill.
  { len: 110, turn:    0, rise:  10, w: 4.4, sec: 'climb', note: 'STRAIGHT, CLIMBING HARD' },
  { len:  60, turn: -150, rise:   6, w: 4.2, sec: 'climb', note: 'HAIRPIN RIGHT 1',
    mark: [{ k: 'crowd', t: 0.5, n: 13, out: 1.0 }] },
  { len:  95, turn:   16, rise:   9, w: 4.4, sec: 'climb', note: 'LEFT 6 UPHILL' },
  { len:  58, turn:  145, rise:   6, w: 4.2, sec: 'climb', note: 'HAIRPIN LEFT 1',
    mark: [{ k: 'chevron', t: 0.25, n: 3 }] },
  { len: 100, turn:  -20, rise:   9, w: 4.4, sec: 'climb', note: 'RIGHT 5 STILL CLIMBING' },
  { len:  62, turn: -142, rise:   5, w: 4.2, sec: 'climb', note: 'HAIRPIN RIGHT 1 — NOTHING ON THE OUTSIDE',
    mark: [{ k: 'chevron', t: 0.25, n: 3 }, { k: 'crowd', t: 0.55, side: -1, n: 9 }] },
  { len: 120, turn:   26, rise:   8, w: 4.6, sec: 'climb', note: 'LEFT 5 LONG' },
  { len: 105, turn:  -18, rise:   8, w: 4.4, sec: 'climb', note: 'RIGHT 5, ROAD FALLS AWAY' },
  { len:  58, turn:  148, rise:   5, w: 4.0, sec: 'climb', note: 'HAIRPIN LEFT 1' },
  { len:  88, turn:  -14, rise:   7, w: 4.4, sec: 'climb', note: 'RIGHT 6' },
  { len:  56, turn:  152, rise:   4, w: 4.0, sec: 'climb', note: 'HAIRPIN LEFT 1 — LAST ONE',
    mark: [{ k: 'crowd', t: 0.5, n: 15, out: 0.6 }] },
  { len: 140, turn:  -24, rise:   7, w: 4.8, sec: 'climb', note: 'RIGHT 5 TO THE TOP' },
  { len:  90, turn:    0, rise:   3, w: 5.0, sec: 'climb', note: 'STRAIGHT 90, OVER THE TOP' },
];

// ---- THE PLATEAU -----------------------------------------------------------
export const THE_PLATEAU = [
  // The reward for the climb: flat, wide, and the throttle stays where it is. The
  // big jump is at the end of the longest straight on the stage.
  { len: 200, turn:    0, rise:  -2, w: 5.6, sec: 'plateau', note: 'FLAT OUT 200 — THE PLATEAU' },
  { len: 160, turn:  -22, rise:   0, w: 5.6, sec: 'plateau', note: 'RIGHT 6, DONT LIFT' },
  { len: 170, turn:   26, rise:   0, w: 5.6, sec: 'plateau', note: 'LEFT 6' },
  { len: 140, turn:    0, rise:   0, w: 5.6, sec: 'plateau', note: 'STRAIGHT 140' },
  { len: 120, turn:  -40, rise:  -2, w: 5.2, sec: 'plateau', note: 'RIGHT 5 LONG' },
  { len: 150, turn:    0, rise:   0, w: 5.6, sec: 'plateau', note: 'STRAIGHT 150 — BIG ONE COMING' },
  { len:  55, turn:    0, rise:  12, w: 5.6, sec: 'plateau', note: 'CREST',
    mark: [{ k: 'chevron', t: 0.25, side: 0, n: 3 }] },
  { len:  45, turn:    0, rise: -21, w: 6.0, sec: 'plateau', note: 'CAUTION — BIG JUMP, LAND STRAIGHT' },
  { len: 110, turn:    0, rise:  -8, w: 5.6, sec: 'plateau', note: 'LANDING, DONT CUT',
    mark: [{ k: 'crowd', t: 0.35, side: 1, n: 12, out: 2.5 }, { k: 'wreck', t: 0.75, side: -1, out: 2.6 }] },
  { len: 130, turn:   34, rise:  -3, w: 5.2, sec: 'plateau', note: 'LEFT 5 LONG' },
  { len: 110, turn:  -38, rise:  -2, w: 5.0, sec: 'plateau', note: 'RIGHT 5' },
];

// THE DESCENT's bank alternates on purpose. Adam: "the whole thing with it being on a
// big hill and 1 mistake costs run is annoying, make it opposite in areas." It used to
// fall away on BOTH sides for two solid kilometres, so every one of its blind crests was
// the same threat and there was nowhere to make a mistake cheaply. Now the cut swaps
// sides down the hill, and twice on the way it is banked both sides — places where going
// off costs you two tenths and nothing else.
//
// ---- THE DESCENT -----------------------------------------------------------
export const THE_DESCENT = [
  // Downhill, so the car arrives at everything faster than you expect, and half of
  // it is over a crest you can't see past. This is the section that's only possible
  // if you actually listen to the notes.
  { len:  95, turn:    0, rise:  -9, w: 5.0, sec: 'descent', note: 'DOWNHILL, BLIND 95',
    bank: [10, -3],
    mark: [{ k: 'chevron', t: 0.55, side: 0, n: 2 }] },
  { len:  80, turn:   50, rise:  -7, w: 4.8, sec: 'descent', note: 'LEFT 4 OVER CREST',
    bank: [10, -3] },
  { len:  70, turn:  -46, rise:  -6, w: 4.6, sec: 'descent', note: 'RIGHT 3',
    bank: [10, -3] },
  { len: 110, turn:   28, rise:  -8, w: 4.8, sec: 'descent', note: 'LEFT 5 DOWNHILL',
    bank: [-3, 10] },
  { len:  60, turn:  -86, rise:  -4, w: 4.4, sec: 'descent', note: 'RIGHT 2 — SLOW IT DOWN',
    bank: [-3, 10] },
  { len: 130, turn:   22, rise:  -6, w: 5.0, sec: 'descent', note: 'LEFT 6 LONG',
    bank: [8, 8] },
  { len:  75, turn:  -54, rise:  -3, w: 4.6, sec: 'descent', note: 'RIGHT 3',
    bank: [10, -3] },
  { len:  90, turn:   44, rise:  -4, w: 4.8, sec: 'descent', note: 'LEFT 4',
    bank: [10, -3] },
  { len:  65, turn:    0, rise:   5, w: 5.0, sec: 'descent', note: 'CREST 65 — CAUTION',
    bank: [-3, 10],
    mark: [{ k: 'chevron', t: 0.30, side: 0, n: 2 }] },
  { len:  70, turn:    0, rise:  -7, w: 5.0, sec: 'descent', note: 'JUMP, THEN RIGHT',
    bank: [-3, 10] },
  { len:  85, turn:  -58, rise:  -2, w: 4.6, sec: 'descent', note: 'RIGHT 3 ON LANDING',
    bank: [-3, 10] },
  { len: 120, turn:   36, rise:  -3, w: 5.0, sec: 'descent', note: 'LEFT 5 LONG',
    bank: [9, 9] },
  { len: 100, turn:  -30, rise:   0, w: 5.2, sec: 'descent', note: 'RIGHT 5 — LAST CORNER',
    bank: [8, -3],
    mark: [{ k: 'banner', t: 0.75 }] },
  { len: 180, turn:    0, rise:   0, w: 5.6, sec: 'descent', note: 'FLAT TO FINISH',
    bank: [7, 7],
    mark: [{ k: 'crowd', t: 0.55, side: 0, n: 16, out: 0.4 }] },
];

// ---- THE NARROWS ------------------------------------------------------
// A dry bed between rock, and the opposite character to THE GORGE in the same place:
// the gorge is linked corners with no rest, this is long flat-out straights with the
// walls a metre off each wheel, broken by corners that are SQUARE. You arrive at a 90
// at ninety, so there is no radius to carry and the handbrake is the only tool. A place
// can have more than one road through it.
//
// The straights were 120-150m at first and simcheck said the section averaged 56 mph,
// which is not "you arrive at a 90 at ninety" — from a corner exit there simply wasn't
// enough road to get the speed up before the next one. They are 190-280m now. The idea
// only works if the straight is long enough to make the corner frightening.
export const THE_NARROWS = [
  { len: 220, turn:    0, rise:  -1, w: 4.0, sec: 'gorge', note: 'INTO THE GORGE — FLAT OUT 200' },
  { len:  55, turn:  -86, rise:   0, w: 3.4, sec: 'gorge', note: 'RIGHT 2 SQUARE — HOLD THE HANDBRAKE',
    mark: [{ k: 'chevron', t: 0.1, n: 2 }] },
  { len: 260, turn:    0, rise:   0, w: 3.6, sec: 'gorge', note: 'FLAT OUT 200, WALLS BOTH SIDES' },
  { len:  48, turn:   92, rise:   0, w: 3.2, sec: 'gorge', note: 'LEFT 2 SQUARE',
    mark: [{ k: 'chevron', t: 0.1, n: 2 }] },
  { len: 190, turn:    0, rise:   1, w: 3.6, sec: 'gorge', note: 'STRAIGHT 200' },
  { len:  70, turn:  -40, rise:   0, w: 3.6, sec: 'gorge', note: 'RIGHT 4 — DONT TOUCH THE EDGE' },
  { len: 150, turn:    0, rise:  -1, w: 3.8, sec: 'gorge', note: 'STRAIGHT 150' },
  { len:  44, turn:  104, rise:   0, w: 3.0, sec: 'gorge', note: 'LEFT 2 — VERY TIGHT',
    mark: [{ k: 'wreck', t: 0.7, side: 1, out: 1.6 }] },
  { len: 280, turn:    0, rise:   0, w: 3.8, sec: 'gorge', note: 'FLAT OUT 200 — NARROWEST POINT' },
  { len:  52, turn:  -96, rise:   0, w: 3.2, sec: 'gorge', note: 'RIGHT 2 SQUARE' },
  { len:  75, turn:   30, rise:   1, w: 3.6, sec: 'gorge', note: 'LEFT 4' },
  { len:  46, turn: -110, rise:   0, w: 3.2, sec: 'gorge', note: 'RIGHT 2 — SLOW IT DOWN',
    mark: [{ k: 'chevron', t: 0.1, n: 3 }] },
  { len: 130, turn:    0, rise:   2, w: 4.0, sec: 'gorge', note: 'STRAIGHT 130, OUT OF THE DARK' },
];

// ---- THE TERRACES -----------------------------------------------------
// Cut into a hillside and going down it. The rhythm is deliberately regular — a long
// open sweeper along a shelf, then a hairpin dropping to the next one — because a
// rhythm you can hear is a rhythm the descent can break: every hairpin arrives from
// further downhill than the last, so you meet each one faster than you meant to while
// the corner itself stays exactly the same.
export const THE_TERRACES = [
  { len: 160, turn:    0, rise:  -2, w: 5.0, sec: 'ruins', note: 'FLAT OUT 160 ALONG THE TOP' },
  { len: 130, turn:   28, rise:  -3, w: 5.0, sec: 'ruins', note: 'LEFT 5 LONG',
    mark: [{ k: 'banner', t: 0.15 }] },
  { len:  60, turn: -148, rise:  -7, w: 4.4, sec: 'ruins', note: 'HAIRPIN RIGHT 1 — ROAD FALLS AWAY',
    mark: [{ k: 'chevron', t: 0.15, n: 3 }, { k: 'crowd', t: 0.55, n: 9 }] },
  { len: 140, turn:  -24, rise:  -4, w: 4.8, sec: 'ruins', note: 'RIGHT 5 LONG' },
  { len:  95, turn:   52, rise:  -2, w: 4.6, sec: 'ruins', note: 'LEFT 4' },
  { len:  58, turn:  150, rise:  -8, w: 4.2, sec: 'ruins', note: 'HAIRPIN LEFT 1',
    mark: [{ k: 'chevron', t: 0.15, n: 3 }] },
  { len: 150, turn:   18, rise:  -5, w: 5.0, sec: 'ruins', note: 'LEFT 6 — DONT LIFT' },
  { len:  80, turn:  -58, rise:  -3, w: 4.6, sec: 'ruins', note: 'RIGHT 3' },
  { len:  56, turn: -146, rise:  -7, w: 4.2, sec: 'ruins', note: 'HAIRPIN RIGHT 1 — LAST ONE',
    mark: [{ k: 'chevron', t: 0.15, n: 3 }, { k: 'wreck', t: 0.8, out: 3.0 }] },
  { len: 120, turn:   34, rise:  -4, w: 4.8, sec: 'ruins', note: 'LEFT 5' },
  { len:  70, turn:  -44, rise:  -2, w: 4.6, sec: 'ruins', note: 'RIGHT 4' },
  { len: 180, turn:    0, rise:  -2, w: 5.2, sec: 'ruins', note: 'FLAT OUT 180' },
];

// ---- THE CAUSEWAY -----------------------------------------------------
// Dead flat, dead fast, and the corners are barely corners — a 6 that goes on for two
// hundred metres. Which is exactly where the heavy wheel bites hardest: at this speed
// it moves so slowly that even a corner you could take flat has to be STARTED eighty
// metres before it arrives, and you cannot see eighty metres of anything from the seat.
// Then the biggest jump on any road here, at the end of the longest straight.
export const THE_CAUSEWAY = [
  { len: 220, turn:    0, rise:   0, w: 6.0, sec: 'plateau', note: 'THE PLATEAU — FLAT OUT 200',
    mark: [{ k: 'banner', t: 0.25 }] },
  { len: 200, turn:   16, rise:   0, w: 6.0, sec: 'plateau', note: 'LEFT 6 LONG — DONT LIFT' },
  { len: 180, turn:  -14, rise:   0, w: 6.0, sec: 'plateau', note: 'RIGHT 6 LONG' },
  { len: 160, turn:    0, rise:   0, w: 5.8, sec: 'plateau', note: 'STRAIGHT 150' },
  { len: 140, turn:   34, rise:   0, w: 5.6, sec: 'plateau', note: 'LEFT 5 LONG — START TURNING EARLY' },
  { len: 120, turn:    0, rise:   0, w: 5.8, sec: 'plateau', note: 'STRAIGHT 120 — BIG ONE COMING' },
  { len:  50, turn:    0, rise:  14, w: 6.0, sec: 'plateau', note: 'CREST',
    mark: [{ k: 'chevron', t: 0.2, side: 0, n: 3 }] },
  { len:  42, turn:    0, rise: -24, w: 6.0, sec: 'plateau', note: 'CAUTION — BIG JUMP, LAND STRAIGHT' },
  { len: 130, turn:    0, rise:  -6, w: 5.8, sec: 'plateau', note: 'LANDING, DONT CUT',
    mark: [{ k: 'crowd', t: 0.4, side: 1, n: 12, out: 2.5 }, { k: 'wreck', t: 0.8, side: -1, out: 2.4 }] },
  { len: 170, turn:  -30, rise:  -2, w: 5.6, sec: 'plateau', note: 'RIGHT 5 LONG' },
  { len: 150, turn:   22, rise:   0, w: 5.8, sec: 'plateau', note: 'LEFT 6 LONG' },
];

// ---------------------------------------------------------------------------
// THE TRACKS.
//
// A track is a list of sections and nothing else. THE FULL STAGE is the original eight
// in the order they were written, and it stays the tutorial — it introduces the wheel,
// the handbrake, the downshift and the notes, in that order, and it is the only one
// that does. The rest are short: one idea, two or three minutes, a road you can learn
// deeply rather than a tour that keeps showing you new things. DESIGN.md leaves that
// question open; this is both answers, out of the same material.
//
// `wants` is what the track is FOR, so tools/simcheck.mjs judges it against its own
// intent instead of against THE FULL STAGE's. A track that is deliberately tight
// everywhere should not be reported as failing to have a jump — noise in a checker is
// how a real failure gets scrolled past.
// ---------------------------------------------------------------------------

export const TRACKS = {
  full: {
    name: 'THE FULL STAGE',
    blurb: 'eight places, five minutes, and it teaches you the car on the way past',
    wants: { time: [240, 400], jump: true, spread: 25 },
    of: [THE_DROP_ZONE, THE_PINES, THE_OLD_ROAD, THE_VILLAGE, THE_GORGE, THE_CLIMB, THE_PLATEAU, THE_DESCENT],
  },
  shakedown: {
    name: 'SHAKEDOWN',
    // Was DROP ZONE + OLD ROAD, and tools/simcheck.mjs called it flat: one mile per hour
    // of speed variation across the whole thing, which is not a track, it's a corridor.
    // The village on the end is the sting — two fast sections and then somewhere you
    // have to actually put the car.
    blurb: 'wide and fast, and then somewhere you have to place the car to the metre',
    wants: { time: [70, 140], jump: true, spread: 20 },
    of: [THE_DROP_ZONE, THE_OLD_ROAD, THE_VILLAGE],
  },
  bind: {
    name: 'THE BIND',
    blurb: 'trees, then walls, then rock. nothing on it is fast and nothing forgives',
    // No jump on purpose, and a narrow speed band on purpose: the whole point is that it
    // never lets you out. Plenty of real stages are like this.
    wants: { time: [90, 180], jump: false, spread: 12 },
    of: [THE_PINES, THE_VILLAGE, THE_NARROWS],
  },
  run: {
    name: 'THE LONG RUN',
    blurb: 'flat out for a mile, then a hillside that makes you pay for every bit of it',
    wants: { time: [70, 140], jump: true, spread: 25 },
    of: [THE_CAUSEWAY, THE_TERRACES],
  },
};

export const DEFAULT_TRACK = 'full';

// A track's segments, in order. Sections are plain arrays, so this is a concat — the
// road joins itself because it is stored as turns rather than as positions.
export function trackSegments(key) {
  const t = TRACKS[key] || TRACKS[DEFAULT_TRACK];
  return t.of.flat();
}
