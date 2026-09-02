/**
 * The dialog's keyboard plumbing — the parts no single screen owns.
 *
 * Two things live here. Moving focus with the arrow keys inside a composite
 * control, for the two screens that hold more controls than anyone should Tab
 * through: a category's list of words and the hub's inventory of categories.
 * Both give
 * their body a single tab stop and let the arrows move inside it, which is the
 * ordinary bargain for one — Tab crosses it, arrows walk it.
 *
 * And the pieces the dialog's one global listener shares with the buttons that
 * advertise it: the key a button names, and the question of whether a bare
 * letter is ours to take at all. Those sit here rather than beside the listener
 * in Dialog or beside the hint in Chrome, because those two ends would
 * otherwise have to import each other; this module imports nothing.
 */

/**
 * The key that opens the note on whatever the deck is showing.
 *
 * One constant rather than the letter written out at each of the four places
 * that bind or draw it, for the reason `PrimaryButton` already gives about its
 * own shortcut: a key and the hint naming it are two halves of one thing, and
 * when they drift you get a hint for a key nothing binds, or a key nothing
 * announces. Both look correct.
 */
export const NOTE_KEY = {
  /** What `e.key` is, and the letter drawn on the button. */
  key: "n",
  /** ARIA names a letter key in upper case, and upper case does not mean
      Shift — a key that wanted Shift would be spelled `Shift+N`. */
  aria: "N",
};

/**
 * Whether something on the page is already collecting this keystroke.
 *
 * The dialog binds its shortcuts on the window in the capture phase, so a bare
 * letter is taken from whatever has focus anywhere on the page rather than from
 * the dialog alone. Obsidian's modal traps focus, so in the vault this is
 * insurance; in the gallery it is load-bearing, because the harness draws its
 * frame-size `<select>` outside the frame and inside the same window — and a
 * `<select>` answers a bare letter with type-ahead.
 *
 * Every `<input>` counts, including a checkbox that collects no letters. What
 * this answers is whether the keystroke is already spoken for, not what the
 * field would do with it, and sorting by `input.type` would be code with no
 * case behind it.
 */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Bring an element into view by moving the dialog body's own scrollbar and
 * nothing else. `scrollIntoView`, and the scrolling the browser does for you
 * when an off-screen element takes focus, both walk up the ancestors and drag
 * whatever is behind the dialog along with them — so focus is taken with
 * `preventScroll` and the body is scrolled here instead.
 *
 * Measured rather than read off `offsetTop`, which would only be the distance
 * to the body for an element the body happens to be the offset parent of. Only
 * the minimum needed to clear an edge, with the body's own padding left
 * showing, so that arrowing along a long list creeps rather than jumping.
 */
export function scrollIntoDialogBody(element: HTMLElement) {
  const body = element.closest(".dialog-body");
  if (!(body instanceof HTMLElement)) return;
  const pad = parseFloat(getComputedStyle(body).paddingTop) || 0;
  const item = element.getBoundingClientRect();
  const view = body.getBoundingClientRect();
  const above = item.top - (view.top + pad);
  const below = item.bottom - (view.bottom - pad);
  if (above < 0) body.scrollTop += above;
  else if (below > 0) body.scrollTop += below;
}

type Laid = { index: number; rect: DOMRect };

/**
 * The rows the items are actually drawn in, in reading order.
 *
 * DOM order is already reading order on both screens — rows stack, pills wrap —
 * so a row breaks wherever an item starts below the one that began the current
 * row. Half an item's height of tolerance: it has to survive the sub-pixel
 * difference between two things on one line, and still break on the next line,
 * whose gap is a fraction of a line height at its smallest.
 */
function rowsOf(items: readonly (HTMLElement | null)[]): Laid[][] {
  const rows: Laid[][] = [];
  items.forEach((element, index) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const row = rows[rows.length - 1];
    if (row && rect.top < row[0].rect.top + rect.height / 2)
      row.push({ index, rect });
    else rows.push([{ index, rect }]);
  });
  return rows;
}

/**
 * Where an arrow key moves within a field of controls: an index to move to, or
 * null for a key the field does not claim, which the caller should leave to the
 * browser. An end of the field returns the index it started from, so the key is
 * still swallowed rather than scrolling the body out from under the focus ring.
 *
 * Left and right are reading order and need no measuring, since the DOM already
 * holds it: from the end of one wrapped row they carry on at the start of the
 * next, which is the whole reason a cloud of pills is laid out this way.
 */
export function step(
  items: readonly (HTMLElement | null)[],
  from: number,
  key: string,
): number | null {
  const last = items.length - 1;
  if (last < 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (key === "ArrowRight") return Math.min(from + 1, last);
  if (key === "ArrowLeft") return Math.max(from - 1, 0);
  if (key !== "ArrowUp" && key !== "ArrowDown") return null;

  const rows = rowsOf(items);
  const row = rows.findIndex((r) => r.some((item) => item.index === from));
  if (row === -1) return null;
  const here = rows[row].find((item) => item.index === from);
  const target = rows[row + (key === "ArrowDown" ? 1 : -1)];
  if (!here || !target) return from;

  /* Which item in the next row sits under this one. Containment first: a card
     spans the whole width, so every pill in the row below lies within it and
     the leftmost wins, rather than whichever pill happens to straddle the
     card's midpoint — a card names no column, so landing at the start of the
     row is the only answer that is not arbitrary. Between two pills it picks
     out the one directly below, which is what the nearest centre would say
     anyway. The pixel of slack is for the sub-pixel case of two things drawn
     to the same edge. */
  const inside = target.filter(
    (item) =>
      item.rect.left >= here.rect.left - 1 &&
      item.rect.right <= here.rect.right + 1,
  );
  if (inside.length > 0) return inside[0].index;

  const centre = (rect: DOMRect) => rect.left + rect.width / 2;
  const wanted = centre(here.rect);
  let best = target[0];
  for (const item of target)
    if (Math.abs(centre(item.rect) - wanted) < Math.abs(centre(best.rect) - wanted))
      best = item;
  return best.index;
}
