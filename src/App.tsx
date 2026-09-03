import { useState } from "react";
import { INVENTORIES } from "./data/inventory";
import { Dialog } from "./Dialog";
import { toBlock, toPlainMarkdown } from "./model/block";
import { DEFAULT_LAYOUT, LAYOUTS } from "./model/entries";
import type { Entry, Layout } from "./model/entries";
import { Entries } from "./ui/Entries";
import { Icon } from "./ui/host";

/* Roughly an iPhone's keyboard. The gallery does not load the plugin's
   stylesheet, and `--keyboard-height` is Obsidian's to set, so what is worth
   reproducing here is the geometry the rule in obsidian/styles.css produces: a
   shorter dialog with dead space beneath it. */
const KEYBOARD = 260;

/* What Obsidian would have answered, asked of the harness rather than of the
   browser. The sniff itself is in index.html and the comment there says why. */
const IS_MAC = document.documentElement.dataset.mac === "true";

const SIZES = [
  { label: "iPhone SE — 320 × 568", width: 320, height: 568 },
  { label: "iPhone 14 — 390 × 700", width: 390, height: 700 },
  { label: "iPhone Pro Max — 430 × 760", width: 430, height: 760 },
  { label: "Obsidian desktop — 680 × 700", width: 680, height: 700 },
  { label: "Screenshots - 390 x 600", width: 390, height: 600 },
];

function App() {
  const [size, setSize] = useState(1);
  const [list, setList] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const [picked, setPicked] = useState<readonly Entry[] | null>(null);
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [run, setRun] = useState(0);

  const inventory = INVENTORIES[list];

  const reset = () => {
    setPicked(null);
    setRun((n) => n + 1);
  };

  /* Switching lists is a reset and not a filter: the dialog holds one shuffled
     deck per category and picks made against the other list, so carrying either
     across would be carrying a state that no longer means anything. */
  const chooseList = (index: number) => {
    setList(index);
    reset();
  };

  return (
    <div className="harness">
      <div className="harness-bar">
        <label htmlFor="list">List</label>
        <select
          id="list"
          value={list}
          onChange={(e) => chooseList(Number(e.target.value))}
        >
          {INVENTORIES.map((inv, i) => (
            <option key={inv.id} value={i}>
              {inv.id}
            </option>
          ))}
        </select>
        <label htmlFor="size">Frame</label>
        <select
          id="size"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        >
          {SIZES.map((s, i) => (
            <option key={s.label} value={i}>
              {s.label}
            </option>
          ))}
        </select>
        <label htmlFor="keyboard">
          <input
            id="keyboard"
            type="checkbox"
            checked={keyboard}
            onChange={(e) => setKeyboard(e.target.checked)}
          />
          Keyboard
        </label>
        <button className="harness-reset" onClick={reset}>
          Reset
        </button>
      </div>

      <div style={{ width: SIZES[size].width }}>
        <div
          className={keyboard ? "frame frame-cropped" : "frame"}
          style={{
            height: keyboard
              ? Math.max(SIZES[size].height - KEYBOARD, 0)
              : SIZES[size].height,
          }}
        >
          <Dialog
            key={run}
            inventory={inventory}
            isMac={IS_MAC}
            onCommit={setPicked}
            onClose={reset}
          />
        </div>
        {keyboard ? (
          <div className="fake-keyboard" style={{ height: KEYBOARD }}>
            keyboard
          </div>
        ) : null}
      </div>

      {/* What an empty block looks like down in a note: a fence with no body,
          which the plugin draws as the only useful thing it can be. Here
          unconditionally, because it is the one piece of block chrome that is
          not drawn from picks and there would otherwise be no way to see it —
          and it is the piece with the most to go wrong, being a `button` inside
          `.markdown-rendered`, which the app has opinions about. If it draws
          here as a grey pill, or a size smaller than the paragraphs around it,
          the stylesheet has lost the fight described in obsidian/styles.css.

          Written out rather than imported: the plugin builds this with
          `el.createEl` and no React, for the reason given where it does, which
          is the same reason the menu button beside it is written out here too.

          The noun follows the List chooser above, exactly as it follows the
          inventory in the plugin. */}
      <div className="note markdown-rendered">
        <p>An empty block, waiting:</p>
        <div className="nvc-block">
          <button className="nvc-block-empty" type="button">
            <Icon name="plus" />
            <span>Pick {inventory.noun.many}…</span>
          </button>
          <button
            className="nvc-block-menu clickable-icon"
            type="button"
            aria-label="Block options"
          >
            <Icon name="more-horizontal" />
          </button>
        </div>
        <p>and the note carries on underneath it.</p>
      </div>

      {picked === null ? null : (
        <>
          {/* What lands in the note. */}
          <pre className="output">
            {toBlock(picked, inventory) || "(nothing selected)"}
          </pre>

          {picked.length === 0 ? null : (
            <>
              {/* The layouts, in the order the plugin's own menu lists them.
                  The gallery is where they are worked on: it draws the block
                  and the markdown it converts to side by side, which is the
                  whole of that surface with no Obsidian in it. */}
              <div className="harness-bar">
                {LAYOUTS.map((name) => (
                  <button
                    key={name}
                    onClick={() => setLayout(name)}
                    disabled={name === layout}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {/* How the plugin draws that block down in a note, and what
                  Convert to Markdown would leave behind in its place.

                  Two boxes around it, because a block hangs inside two: the
                  app's `.markdown-rendered`, which is where its type comes from
                  and where the element rules it has to outrank live, and our
                  own `.nvc-block`, which is the frame and the menu button. The
                  paragraphs either side are the point of the outer one — a
                  block's type is only right or wrong next to the note's. */}
              <div className="note markdown-rendered">
                <p>Somewhere in the middle of a note:</p>
                {/* `is-bare` is the plain line's frameless case, and the
                    condition is a copy of the one in obsidian/block.tsx rather
                    than something shared: the plugin puts the class on an
                    element it built with `createEl`, and there is nothing
                    between the two hosts to hang one rule on. It is one word,
                    and the gallery is where it would be noticed missing. */}
                <div
                  className={
                    layout === "inline" ? "nvc-block is-bare" : "nvc-block"
                  }
                >
                  <Entries entries={picked} layout={layout} />
                  <button
                    className="nvc-block-menu clickable-icon"
                    type="button"
                    aria-label="Block options"
                  >
                    <Icon name="more-horizontal" />
                  </button>
                </div>
                <p>and the note carries on underneath it.</p>
              </div>
              <pre className="output">{toPlainMarkdown(picked, layout)}</pre>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
