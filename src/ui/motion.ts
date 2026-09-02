/**
 * The arithmetic behind dragging the deck: where the two cards sit at a given
 * point in a page change, and what a finger lifting off means.
 *
 * Separate from the component for the reason `keyboard.ts` and `arrival.ts` are
 * separate from theirs — this part has no DOM in it, so it can be read, and
 * checked, without one. `frame(1, ±1)` is the assertion that keeps this file
 * and the keyframes in src/dialog.css from drifting apart, and it is only
 * writable because the answer is a value rather than a side effect.
 */

/**
 * How far a page change has got, from 0 at rest to 1 arrived.
 *
 * The deck's transition is a push: the incoming card comes the whole width of
 * the stage, the outgoing one gives up only 28% of it and half its opacity, and
 * for 260ms a clock says where in that they both are. A drag says the same
 * thing with a finger instead. So `p` is the transition's own timeline, and
 * everything below is that one curve read at a point rather than a second
 * design that happens to end in the same place.
 */
export type Progress = number;

/** Which way the deck is moving: 1 to the next card, -1 to the previous. */
export type Direction = 1 | -1;

/** Where one layer sits, ready to be written straight onto a style. */
export type Placement = { x: string; o: string };

/** Both layers of a page change. `to` is null at a wall, where there is none. */
export type Frame = { from: Placement; to: Placement | null };

/**
 * Enough decimal places that a phone's worth of pixels each get their own
 * value, and few enough that the number can be read in a dumped DOM.
 */
const round = (n: number) => Math.round(n * 1000) / 1000;

const place = (percent: number, opacity: number): Placement => ({
  x: `translateX(${round(percent)}%)`,
  o: `${round(opacity)}`,
});

/**
 * Where both cards sit `p` of the way through a page change.
 *
 * The four numbers are not chosen here. They are read off the keyframes in
 * src/dialog.css — `nvc-enter-fwd` comes from 100%, `nvc-leave-fwd` goes to
 * -28% at half opacity, and the two `back` keyframes are those swapped. At
 * `p = 1` this returns exactly those endpoints, which is the one thing worth
 * asserting about this file: it is what stops a drag and a keypress from
 * landing the same card in two different places.
 *
 * A layer is `position: absolute; inset: 0` inside a stage that is
 * `position: relative`, so a layer's width *is* the stage's width and
 * `translateX(100%)` is exactly one stage across. That is why a finger can
 * track this one-to-one without measuring anything but the stage.
 *
 * The two layers never part company on the way. Going forward, `from` covers
 * [-28p, 100-28p] and `to` covers [100-100p, 200-100p], which meet because
 * 100-100p is never greater than 100-28p; going back, the gap would be
 * [72+28p, 100p], which is empty for every p at or below 1. Worth stating,
 * because the day someone tunes -28% is the day a strip of the dialog behind
 * shows through the join.
 */
export function frame(p: Progress, dir: Direction): Frame {
  if (dir === 1)
    return {
      from: place(-28 * p, 1 - 0.5 * p),
      to: place(100 * (1 - p), 1),
    };
  return {
    from: place(100 * p, 1),
    to: place(-28 * (1 - p), 0.5 + 0.5 * p),
  };
}

/** How far the card gives when pulled at, and the most it ever gives. */
const WALL_RATE = 0.25;
const WALL_MAX = 0.12;

/**
 * The first card pulled backward, or the closing card pulled on. There is
 * nothing that way, so there is no second layer and the gesture cannot commit.
 *
 * It still moves. A card that answers a pull by holding perfectly still says
 * "nothing happened" — which is what a broken gesture also says — where a card
 * that gives an eighth of the way and comes back says "there is nothing there".
 * Those have to look different, and the difference is the only thing this
 * function exists for.
 */
export function wallFrame(p: Progress, dir: Direction): Frame {
  const give = Math.min(WALL_RATE * p, WALL_MAX) * 100;
  return { from: place(-dir * give, 1), to: null };
}

/** How far the finger has got, as the transition's own timeline. */
export function progressOf(
  dx: number,
  width: number,
  dir: Direction,
): Progress {
  if (width <= 0) return 0;
  return Math.min(1, Math.max(0, (dir === 1 ? -dx : dx) / width));
}

/**
 * How far the finger must travel before a lift turns the card.
 *
 * In pixels, off a fraction of the stage but clamped at both ends, because the
 * same fraction means two different gestures in the two places this dialog
 * runs: the stage is about 366px wide inside a phone's modal and about 656px
 * inside the desktop one, and a fifth of the second is a 131px mouse drag to
 * turn a single card. The clamp is what keeps the gesture the same size as a
 * thumb rather than the same size as the window.
 */
export function commitPx(width: number): number {
  return Math.min(110, Math.max(64, 0.2 * width));
}

/** A flick, in px/ms: fast enough that distance stops being the question. */
const FLICK = 0.4;

/** Below this, a lift is a lift rather than a throw, and distance decides. */
const MIN_SPEED = 0.5;

/** Movement this side of it is a tap, and never arms a drag. */
export const SLOP = 8;

/** The window a flick is measured over. Long enough to survive one stray frame. */
const VELOCITY_MS = 80;

export type Sample = { t: number; x: number };

/**
 * How fast the finger was moving when it left, in px/ms.
 *
 * Measured against the earliest sample still inside the window rather than
 * against the previous event. Two pointer events can arrive in the same
 * millisecond, or at the same coordinate while a finger rolls to a stop, and
 * those give a velocity of infinity and of zero respectively — both from a
 * gesture that was neither.
 */
export function velocityFrom(samples: readonly Sample[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples.find((s) => last.t - s.t <= VELOCITY_MS) ?? samples[0];
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.x - first.x) / dt;
}

/**
 * Whether lifting here turns the card.
 *
 * Distance or a flick, either alone — a short fast throw is an answer, and so
 * is a slow haul most of the way across. But each is checked against the
 * other's direction, and that is the clause worth keeping: someone who drags
 * two thirds of the way, changes their mind and flicks back before lifting has
 * passed the distance test and means the opposite of it. The flick is the more
 * recent statement, so it wins.
 */
export function shouldCommit(
  dir: Direction,
  travelled: number,
  velocity: number,
  width: number,
): boolean {
  const far = travelled >= commitPx(width);
  const flickFwd = velocity <= -FLICK;
  const flickBack = velocity >= FLICK;
  return dir === 1
    ? flickFwd || (far && !flickBack)
    : flickBack || (far && !flickFwd);
}

/** What a button or an arrow key takes, and what src/dialog.css still says. */
export const PAGE_MS = 260;
export const PAGE_EASING = "ease";

/** A released drag decelerates; a refused one just returns. */
export const COMMIT_EASING = "cubic-bezier(0.2, 0.9, 0.3, 1)";
export const SNAP_EASING = "ease-out";

/**
 * How long the card takes to finish once the finger is off it.
 *
 * Off the distance still to cover and the speed it was last moving, so a card
 * released an inch from home does not take as long as one released halfway —
 * which is what a fixed duration does, and it is the thing that makes a
 * released drag feel like it stopped being yours. Floored, so a finger that
 * halted before lifting still gets a settle rather than a jump, and capped, so
 * a slow one does not drift.
 */
export function settleMs(remainingPx: number, velocity: number): number {
  const speed = Math.max(Math.abs(velocity), MIN_SPEED);
  return Math.min(320, Math.max(120, remainingPx / speed));
}
