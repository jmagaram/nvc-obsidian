import type { ComponentPropsWithRef, ReactNode } from "react";
import { Icon } from "./host";

export function Chrome({
  header,
  footer,
  bodyClass,
  children,
}: {
  header: ReactNode;
  footer?: ReactNode;
  /** `.dialog-body` is shared by every screen; opt in to a different layout. */
  bodyClass?: string;
  children: ReactNode;
}) {
  return (
    <div className="dialog">
      <div className="dialog-header">{header}</div>
      <div className={bodyClass ? `dialog-body ${bodyClass}` : "dialog-body"}>
        {children}
      </div>
      {footer ? <div className="dialog-footer">{footer}</div> : null}
    </div>
  );
}

export function Header({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  /* Obsidian's own classes on our own elements. The styling — including the
     phone variants — comes from the app, but the elements stay inside the layer
     that Slide moves, which anything in Obsidian's titleEl could not do.
     `.modal-title` carries auto side margins, so it centres itself between the
     two buttons and no spacer is needed. */
  return (
    <>
      {onBack ? (
        <button className="clickable-icon" onClick={onBack} aria-label="Back">
          <Icon name="chevron-left" />
        </button>
      ) : null}
      <div className="modal-title">{title}</div>
      <button className="clickable-icon" onClick={onClose} aria-label="Close">
        <Icon name="x" />
      </button>
    </>
  );
}

/**
 * The letters or glyphs naming the key that presses a control.
 *
 * Hidden from the accessibility tree, because `aria-keyshortcuts` on the button
 * is how a screen reader is meant to hear this. Left visible it joins the
 * button's name instead, and the button becomes "Done ⌘⏎".
 *
 * Drawn only where there is a keyboard to press it with; see `.shortcut` in
 * dialog.css.
 */
export function Shortcut({ hint }: { hint: string }) {
  return (
    <span className="shortcut" aria-hidden="true">
      {hint}
    </span>
  );
}

/**
 * The keys that press a primary button, and the two ways they have to be
 * written.
 *
 * Both modifiers work everywhere — see the keyboard block in src/Dialog.tsx —
 * because a hand that learned one host should not be told it is holding the
 * wrong key. What differs is what we say: a Mac names the modifier with a
 * glyph and everything else spells it out, and a hint in the other convention
 * reads as a hint for somebody else's machine.
 */
const MAC = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const SHORTCUT = {
  hint: MAC ? "\u2318\u23ce" : "Ctrl \u23ce",
  /** The spelling ARIA wants, which is neither of the two above. */
  aria: MAC ? "Meta+Enter" : "Control+Enter",
};

/**
 * The one action that finishes a screen: Done, Insert, or the answer a focus
 * card is waiting for.
 *
 * Ctrl/⌘+Enter presses it, and the button itself is what says so — a shortcut
 * with nothing on screen to name it is a shortcut only the person who wrote it
 * ever uses. The hint is drawn only where there is a keyboard to press it
 * with; see `.shortcut` in dialog.css.
 *
 * A component rather than the class repeated at five call sites, because the
 * key and its hint have to stay together. Dialog binds the key per screen and
 * this draws the hint, so a footer written by hand instead gives you either a
 * shortcut with nothing announcing it or a hint for a key that does nothing —
 * and both fail silently.
 *
 * `cta` is off where the fill would be read as pressure rather than as weight.
 * On a focus card the label names what the press does rather than what the
 * state is, so Obsidian's filled accent stops meaning "this is on" and starts
 * meaning "press me" — and neither answer on that card wants urging.
 *
 * A `ref` reaches the element here, which it does nowhere else in this file:
 * the deck opens with this button focused — see `useFocusOnArrival` in
 * src/ui/Focus.tsx — and it is the only control on that screen that survives
 * paging, so it is the only one worth handing to a caller.
 */
export function PrimaryButton({
  label,
  cta = true,
  onClick,
  ...rest
}: {
  label: string;
  cta?: boolean;
  onClick: () => void;
} & Omit<ComponentPropsWithRef<"button">, "className" | "onClick">) {
  const classes = ["primary"];
  if (cta) classes.push("mod-cta");

  return (
    <button
      className={classes.join(" ")}
      onClick={onClick}
      aria-keyshortcuts={SHORTCUT.aria}
      {...rest}
    >
      {label}
      <Shortcut hint={SHORTCUT.hint} />
    </button>
  );
}
