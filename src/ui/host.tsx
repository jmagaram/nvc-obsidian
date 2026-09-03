import { createContext, useCallback, useContext } from "react";
import type { ReactNode } from "react";
import { MacContext } from "./platform";

/** Obsidian's `setIcon`, or nothing when there is no host to ask. */
export type SetIcon = (el: HTMLElement, name: string) => void;

const IconContext = createContext<SetIcon | null>(null);

export function HostProvider({
  icon,
  isMac = false,
  children,
}: {
  icon?: SetIcon;
  /** See `MacContext` in ./platform. */
  isMac?: boolean;
  children: ReactNode;
}) {
  return (
    <IconContext value={icon ?? null}>
      <MacContext value={isMac}>{children}</MacContext>
    </IconContext>
  );
}

/**
 * Lucide paths, used only when no host supplies icons — that is, in the browser
 * gallery. Inside Obsidian these are never drawn; `setIcon` puts whatever the
 * app itself ships into the element, so the icon cannot drift from the rest of
 * the UI.
 *
 * Every name here is one Obsidian resolves to the same lucide glyph. Two rules
 * decided the set, and both cost an afternoon to learn:
 *
 * `setIcon` runs a legacy alias table before it reaches lucide, so a handful of
 * names silently draw something else — `pencil` becomes `edit-3`, `trash`
 * becomes `trash-2`. `square-pen` below is the un-aliased spelling of the one we
 * want.
 *
 * And a name Obsidian cannot resolve appends nothing at all: no error, no
 * placeholder, just an empty span. The gallery is the stricter host — a name
 * missing from this map fails the build, because `IconName` is keyed off it —
 * but only the vault can prove a name exists there. See the console check in
 * the plan's verification notes.
 *
 * Paths only. Some lucide glyphs are built from `<rect>` or `<circle>`, which
 * this shape cannot express; `gallery-vertical` and `square-stack` were passed
 * over for that reason alone.
 */
const FALLBACK = {
  x: ["M18 6 6 18", "m6 6 12 12"],
  check: ["M20 6 9 17l-5-5"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  /* The chevrons' opposite number, and the distinction is the point: a chevron
     moves between levels — the header's Back, the hub card's drill-in — and an
     arrow moves along one. The deck is the only place in the dialog that moves
     along one, and on that screen the header's chevron and the footer's used to
     be the same glyph pointing the same way at two different destinations. */
  "arrow-left": ["m12 19-7-7 7-7", "M19 12H5"],
  "arrow-right": ["M5 12h14", "m12 5 7 7-7 7"],
  asterisk: ["M12 6v12", "M17.196 9 6.804 15", "m6.804 9 10.392 6"],
  /* The way into a block's menu. Lucide draws the three dots as `<circle
     r="1">`, which the shape below cannot hold — but a path that goes nowhere,
     given the round cap and 2px stroke every icon here already has, is the same
     disc, and is how lucide itself draws the dots in `list` below. */
  "more-horizontal": ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  list: [
    "M3 5h.01",
    "M3 12h.01",
    "M3 19h.01",
    "M8 5h13",
    "M8 12h13",
    "M8 19h13",
  ],
  layers: [
    "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
    "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
    "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
  ],
  "message-square-plus": [
    "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
    "M12 8v6",
    "M9 11h6",
  ],
  "message-square-text": [
    "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
    "M7 11h10",
    "M7 15h6",
    "M7 7h8",
  ],
  // The empty block's invitation. Two strokes and a round cap, which is the
  // whole of lucide's `plus` — one of the few here that needs no note about
  // what it could not express.
  plus: ["M5 12h14", "M12 5v14"],
  "square-pen": [
    "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
    "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",
  ],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof FALLBACK;

export function Icon({ name, label }: { name: IconName; label?: string }) {
  const setIcon = useContext(IconContext);

  const mount = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !setIcon) return;
      el.innerHTML = "";
      setIcon(el, name);
    },
    [setIcon, name],
  );

  /* An icon beside a label repeats it; an icon alone is the label. */
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true };

  /* The same wrapper on both paths. Obsidian writes its own `<svg>` into this
     span and the gallery draws one into an identical span, so a flex row lays
     out one box either way and the gallery cannot disagree with the vault about
     spacing. `lucide-<name>` is the class Obsidian stamps on too, so a theme
     rule keyed on it behaves the same in the browser. */
  if (setIcon) return <span className="icon" {...a11y} ref={mount} />;

  return (
    <span className="icon" {...a11y}>
      <svg
        className={`svg-icon lucide-${name}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {FALLBACK[name].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
