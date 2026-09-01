import { useState } from 'react'
import { categories } from './data/feelings'
import { Dialog } from './Dialog'

/* Roughly an iPhone's keyboard. The gallery does not load the plugin's
   stylesheet, and `--keyboard-height` is Obsidian's to set, so what is worth
   reproducing here is the geometry the rule in obsidian/styles.css produces: a
   shorter dialog with dead space beneath it. */
const KEYBOARD = 260

const SIZES = [
  { label: 'iPhone SE — 320 × 568', width: 320, height: 568 },
  { label: 'iPhone 14 — 390 × 700', width: 390, height: 700 },
  { label: 'iPhone Pro Max — 430 × 760', width: 430, height: 760 },
  { label: 'Obsidian desktop — 600 × 700', width: 600, height: 700 },
]

function App() {
  const [size, setSize] = useState(1)
  const [keyboard, setKeyboard] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [run, setRun] = useState(0)

  const reset = () => {
    setOutput(null)
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
            onInsert={setOutput}
            onClose={reset}
          />
        </div>
        {keyboard ? (
          <div className="fake-keyboard" style={{ height: KEYBOARD }}>
            keyboard
          </div>
        ) : null}
      </div>

      {output === null ? null : (
        <pre className="output">{output || '(nothing selected)'}</pre>
      )}
    </div>
  )
}

export default App
