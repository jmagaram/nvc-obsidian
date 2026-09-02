import { useState } from 'react'
import { categories } from './data/feelings'
import { Dialog } from './Dialog'
import { toBlock, toPlainMarkdown } from './model/block'
import type { Entry, Layout } from './model/entries'
import { Entries } from './ui/Entries'
import { Icon } from './ui/host'

/* The five layouts, in the order the plugin's own menu lists them. The gallery
   is where they are worked on: it draws the block and the markdown it converts
   to side by side, which is the whole of that surface with no Obsidian in it. */
const LAYOUTS: readonly Layout[] = [
  'gloss',
  'column',
  'sentence',
  'inline',
  'table',
]

/* Roughly an iPhone's keyboard. The gallery does not load the plugin's
   stylesheet, and `--keyboard-height` is Obsidian's to set, so what is worth
   reproducing here is the geometry the rule in obsidian/styles.css produces: a
   shorter dialog with dead space beneath it. */
const KEYBOARD = 260

const SIZES = [
  { label: 'iPhone SE — 320 × 568', width: 320, height: 568 },
  { label: 'iPhone 14 — 390 × 700', width: 390, height: 700 },
  { label: 'iPhone Pro Max — 430 × 760', width: 430, height: 760 },
  { label: 'Obsidian desktop — 680 × 700', width: 680, height: 700 },
]

function App() {
  const [size, setSize] = useState(1)
  const [keyboard, setKeyboard] = useState(false)
  const [picked, setPicked] = useState<readonly Entry[] | null>(null)
  const [layout, setLayout] = useState<Layout>('gloss')
  const [run, setRun] = useState(0)

  const reset = () => {
    setPicked(null)
    setRun((n) => n + 1)
  }

  return (
    <div className="harness">
      <div className="harness-bar">
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
          className={keyboard ? 'frame frame-cropped' : 'frame'}
          style={{
            height: keyboard
              ? Math.max(SIZES[size].height - KEYBOARD, 0)
              : SIZES[size].height,
          }}
        >
          <Dialog
            key={run}
            categories={categories}
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

      {picked === null ? null : (
        <>
          {/* What lands in the note. */}
          <pre className="output">
            {toBlock(picked) || '(nothing selected)'}
          </pre>

          {picked.length === 0 ? null : (
            <>
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
                <div className="nvc-block">
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
  )
}

export default App
