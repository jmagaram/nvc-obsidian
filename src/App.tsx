import { useState } from 'react'
import { categories } from './data/feelings'
import { Dialog } from './Dialog'

const SIZES = [
  { label: 'iPhone SE — 320 × 568', width: 320, height: 568 },
  { label: 'iPhone 14 — 390 × 700', width: 390, height: 700 },
  { label: 'iPhone Pro Max — 430 × 760', width: 430, height: 760 },
  { label: 'Obsidian desktop — 600 × 700', width: 600, height: 700 },
]

function App() {
  const [size, setSize] = useState(1)
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
        <button className="harness-reset" onClick={reset}>
          Reset
        </button>
      </div>

      <div
        className="frame"
        style={{ width: SIZES[size].width, height: SIZES[size].height }}
      >
        <Dialog
          key={run}
          categories={categories}
          onInsert={setOutput}
          onClose={reset}
        />
      </div>

      {output === null ? null : (
        <pre className="output">{output || '(nothing selected)'}</pre>
      )}
    </div>
  )
}

export default App
