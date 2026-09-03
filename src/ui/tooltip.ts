import { useLayoutEffect, useRef } from "react";

/**
 * Take down the host's hover tooltip when the screen changes.
 *
 * Obsidian turns any `aria-label` into a tooltip, which is half of why several
 * buttons in here carry one: a bare pencil, or a note extract with no label
 * beside it, names itself no other way. What the host does not do is tie the
 * tooltip to the element it describes. It builds a `div.tooltip`, appends it to
 * `<body>`, and parks it at coordinates read from the button's rectangle at the
 * moment of the hover. Two delegated listeners on `<body>` take it down again —
 * `pointerout` and `pointerup` — and nothing else does.
 *
 * A screen change made from the keyboard escapes both. There is no `pointerup`
 * because nothing was clicked, and the `pointerout` never reaches `<body>` to
 * be delegated: React has already detached the button, so whatever the browser
 * dispatches at it travels a subtree that is no longer in the document. The
 * tooltip is left standing over the middle of the next screen, naming a word
 * that is not on it.
 *
 * Ctrl/⌘+Enter from the list is the plainest way in — every screen binds it,
 * and on the list it goes to the hub rather than out of the modal, which is
 * what makes it visible: Obsidian's own `Modal.close` clears the tooltip, and
 * so does `Modal.open`, but a screen change inside an open modal is not
 * something the host has any hook on. Nothing about this is particular to that
 * key. Any keyboard exit from a hovered `aria-label` does it.
 *
 * So the dialog has to clear it, at the one moment it can be sure it is owed
 * nothing: a screen change. This is a modal, so nothing else in the app can be
 * under the pointer, and any tooltip standing at that instant is ours and about
 * to be orphaned.
 *
 * Detaching the node is the whole of it, though the host goes on holding a
 * reference to what it built. The next hover is a different anchor, which sends
 * it down the branch that replaces the tooltip outright; and were the anchor
 * somehow the same one, it re-appends the node it kept. Either way it heals,
 * and neither branch can be reached with a stale rectangle on screen.
 *
 * The returned ref is for the dialog's own element, and is here only to name a
 * document: the tooltip is a child of the body the dialog is in, which in a
 * popout window is not the one `document` refers to.
 */
export function useDismissHostTooltip(screenKey: string) {
  const dialog = useRef<HTMLDivElement>(null);

  /* Before the paint, so the stale tooltip is never drawn over the screen that
     replaced it. The button it described is already gone by the time this runs
     — catching up with that is all there is to do. */
  useLayoutEffect(() => {
    /* Direct children only: this is where the host puts it, and a `.tooltip`
       further down the tree belongs to something drawing its own. */
    dialog.current?.ownerDocument.body
      .querySelectorAll(":scope > .tooltip")
      .forEach((el) => el.remove());
  }, [screenKey]);

  return dialog;
}
