/* Provisional, and meant to be removed.

   Reading size is the right anchor for the vocabulary, but the multiple on top
   of it is a judgement that cannot be made from a desktop: the question is what
   a cloud of feeling words should feel like in the hand, on the device this
   gets used on. So the knob is here rather than in a settings tab, at the foot
   of the inventory it changes, where it can be moved and the result read in the
   same glance.

   It deliberately does not persist. A stored preference would need a settings
   layer the plugin does not have, and this is scaffolding: once a step wins it
   becomes the default in `--nvc-word-scale` and this file is one deletion. The
   value lives in `Dialog`'s own state rather than in the reducer, and it never
   reaches `buildMarkdown`, so nothing downstream knows it exists.

   `Aa` at the size it selects, rather than a label naming it. The only question
   this control can answer is how the words feel, and a row of numbers cannot
   answer it. Each button is a sample. The name is carried on `aria-label` for
   the readers a sample is worth nothing to. */

const STEPS = [
  { scale: 0.9, name: "Smaller" },
  { scale: 1, name: "Default" },
  { scale: 1.15, name: "Larger" },
  { scale: 1.3, name: "Largest" },
] as const;

export function TextSize({
  scale,
  onScale,
}: {
  scale: number;
  onScale: (scale: number) => void;
}) {
  return (
    <div className="text-size">
      <div className="section" id="text-size-label">
        Text size
      </div>
      {/* A group rather than a radio set. These are buttons that take effect on
          the press, and the field above owns the arrow keys — see the note on
          the one tab stop in Hub.tsx. Four extra tab stops after that field is
          the honest cost of putting the control on the screen it changes. */}
      <div
        className="text-size-steps"
        role="group"
        aria-labelledby="text-size-label"
      >
        {STEPS.map((s) => (
          <button
            key={s.name}
            className="text-size-step"
            aria-label={s.name}
            aria-pressed={s.scale === scale}
            onClick={() => onScale(s.scale)}
            /* The sample has to be the real size, and the real size is the
               reading size times this step — the same arithmetic
               `--nvc-word` does. It cannot be `em` off the dialog, because the
               dialog is already scaled by whichever step is chosen and every
               sample would move together. */
            style={{ fontSize: `calc(var(--font-text-size) * ${s.scale})` }}
          >
            Aa
          </button>
        ))}
      </div>
    </div>
  );
}
