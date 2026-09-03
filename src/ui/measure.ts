import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Whether anything inside this element has wrapped onto a second line.
 *
 * The word runs are `display: inline`, and an inline box gets one client rect
 * per line box it occupies — so "did this wrap" is `getClientRects().length > 1`
 * and needs no line height, no font metrics and no arithmetic. It is also the
 * only form of the question that stays right when the reader changes the font,
 * the readable line length, or the width of the pane.
 */
function wrapped(box: HTMLElement): boolean {
  for (const list of box.querySelectorAll(".words")) {
    if (list.getClientRects().length > 1) return true;
  }
  return false;
}

/** How long to wait out a resize before measuring again. */
const SETTLE = 80;

/**
 * The three states of a layout that measures itself.
 *
 * `measure` is not a third layout. It is the aligned one being looked at, and
 * the only reason it has a name is that the answer is not known yet — see the
 * two-pass note below.
 */
type Fit = "measure" | "aligned" | "stacked";

/**
 * Draw aligned, and say so when aligned will not fit.
 *
 * **Two passes, and the flip happens before paint.** The measurement is of the
 * aligned arrangement, so the aligned arrangement has to exist to be measured:
 * the caller draws it, this reads it in a layout effect, and the switch to
 * stacked lands in the same frame. `useEffect` here would show one painted
 * frame of a wrapped aligned block, which is the exact state this is for
 * avoiding.
 *
 * **It cannot oscillate.** What is measured is the box the caller wraps around
 * the block, and that box is full width in both arrangements — so switching to
 * stacked does not change the width that produced the answer, and the observer
 * below ignores anything that leaves the width where it was.
 *
 * `signature` is what makes a content change re-measure, and the answer is
 * stored *with* the signature it was measured from rather than being reset by
 * an effect when that changes. An answer about words that are no longer there
 * is not a stale answer to be corrected on the next tick — it is not an answer
 * at all, and saying so during the render is both shorter and one render
 * earlier than an effect could.
 *
 * It has to be a value and not the entries themselves. The entries are a fresh
 * array on most renders, and an answer keyed on the array would be discarded
 * and re-measured forever.
 */
export function useStackWhenWrapped(signature: string) {
  const box = useRef<HTMLDivElement>(null);
  const [answer, setAnswer] = useState<{ fit: Fit; of: string }>({
    fit: "measure",
    of: signature,
  });
  /* The width the standing answer was measured at. A ref rather than state
     because nothing draws it — writing it must not cause a render, or the
     observer below would be the loop it is there to prevent. */
  const width = useRef(-1);

  const fit = answer.of === signature ? answer.fit : "measure";

  useLayoutEffect(() => {
    const el = box.current;
    if (fit !== "measure" || !el) return;
    width.current = el.clientWidth;
    setAnswer({ fit: wrapped(el) ? "stacked" : "aligned", of: signature });
  }, [fit, signature]);

  useEffect(() => {
    const el = box.current;
    // Absent in a headless run and in an old webview. Without it the block is
    // measured once and keeps that answer, which is the old behaviour rather
    // than a broken one.
    if (!el || typeof ResizeObserver === "undefined") return;

    let timer = 0;
    const observer = new ResizeObserver(() => {
      // The switch between the two arrangements is itself a resize of the rows
      // inside this box, and answering that would be answering our own answer.
      if (el.clientWidth === width.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => setAnswer((standing) => ({ ...standing, fit: "measure" })),
        SETTLE,
      );
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return { box, stacked: fit === "stacked" };
}
