import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

/**
 * Whether the screen rendered below this is the one arriving.
 *
 * False inside the copy of a screen that is sliding out. `Slide` renders the
 * screen it is replacing a second time, as a snapshot in a layer of its own, so
 * for the length of a slide two copies of that screen are mounted — and the
 * outgoing one is a fresh mount, which is an arrival as far as an effect can
 * tell. Left to take focus it takes it a quarter-second after the incoming
 * screen did, holds it until its layer is dropped, and then hands it to
 * `<body>`: focus lands where it should and vanishes, or does not, depending on
 * which copy's animation ends last. Both halves of that were seen before this
 * flag existed.
 *
 * Set by `Slide` around the outgoing copy — which of the two a screen is, is a
 * fact only `Slide` has, so it is passed down rather than sniffed out of the
 * DOM.
 */
export const Arriving = createContext(true);

/**
 * Take focus onto the control a screen opens on, once the screen has stopped
 * moving.
 *
 * Every screen needs this and none can skip it. The screen this one replaced
 * took its focused element away with it, so on arrival focus sits on `<body>`:
 * Tab starts from the top of the host's document rather than from anywhere in
 * the dialog, and the arrow fields on the hub and the list — which move focus
 * from wherever it already is inside them — answer nothing at all until
 * something inside them has it. A mouse never notices; a keyboard is stranded
 * on every screen change. PickerModal does this for the modal as a
 * whole, and gives the same reason.
 *
 * Which control is each screen's own business, but the shape of the answer is
 * the same everywhere: the thing the screen is about, so the first press does
 * the obvious thing — the word you were last on, the answer the card is waiting
 * for, the field you came to type in.
 *
 * `get` is read on arrival and never again. That is not a limitation to work
 * around: a screen that changes what it is about is a different screen, keyed
 * as one inside `Slide`, so it arrives here again as a fresh mount.
 *
 * Both halves of the timing are load-bearing, and both are about the phone.
 * This runs with the layer holding the control still parked at
 * translateX(100%), off to the right, and WebKit answers a focus by scrolling
 * the focused thing into view: the screen appeared to slide left, then right,
 * as the view chased the control and the animation dragged it back. So focus is
 * taken with `preventScroll`, which stops the chase, and after the slide, which
 * leaves nothing worth chasing. The frame comes first because the entering
 * layer is given its animation class in a layout effect one level up, and this
 * can run before that lands. Desktop is untouched either way — the slide is
 * over long before a hand reaches the keyboard — and with reduced motion there
 * is no animation to wait for.
 *
 * The note screen is where this was first needed and where the rest of that
 * story is: see src/ui/Note.tsx, obsidian/styles.css for the modal shrinking to
 * make room for the on-screen keyboard, and PickerModal for the net
 * under both.
 */
export function useFocusOnArrival(get: () => HTMLElement | null) {
  /* Held in a ref rather than closed over, so the effect below depends on
     nothing and says so. Every caller writes its getter inline and hands over a
     new function each render; in the deps array that would re-run the arrival
     on every keystroke typed into a note. */
  const target = useRef(get);
  useLayoutEffect(() => {
    target.current = get;
  });

  const arriving = useContext(Arriving);

  useEffect(() => {
    if (!arriving) return;
    let live = true;
    const take = () => {
      if (live) target.current()?.focus({ preventScroll: true });
    };
    const frame = requestAnimationFrame(() => {
      const layer = target.current()?.closest(".layer");
      const sliding = layer?.getAnimations?.() ?? [];
      if (sliding.length === 0) return take();
      // A cancelled animation rejects, which is the layer being handed back its
      // resting class as the slide ends. Either way the screen has stopped.
      Promise.all(sliding.map((a) => a.finished)).then(take, take);
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
    /* Constant for the life of a mounted screen — a copy is either the one
       arriving or the one leaving, and never becomes the other — so this is the
       mount and nothing but the mount. */
  }, [arriving]);
}
