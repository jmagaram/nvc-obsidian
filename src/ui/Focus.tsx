import { Chrome, Header } from './Chrome'

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="progress">
      <div style={{ width: `${(done / total) * 100}%` }} />
    </div>
  )
}

export function FocusCard({
  category,
  position,
  total,
  word,
  definition,
  selected,
  note,
  onBack,
  onClose,
  onShowList,
  onPrev,
  onNext,
  onToggle,
  onNoteChange,
}: {
  category: string
  position: number
  total: number
  word: string
  definition: string
  selected: boolean
  note: string
  onBack: () => void
  onClose: () => void
  onShowList: () => void
  onPrev: () => void
  onNext: () => void
  onToggle: () => void
  onNoteChange: (text: string) => void
}) {
  return (
    <Chrome
      bodyClass="focus-body"
      header={<Header title={category} onBack={onBack} onClose={onClose} />}
      footer={
        <>
          <button className="step" onClick={onPrev} disabled={position === 1}>
            ‹
          </button>
          <button className="primary" onClick={onToggle} aria-pressed={selected}>
            {selected ? '✓ Selected' : 'Select'}
          </button>
          <button className="step" onClick={onNext}>
            ›
          </button>
        </>
      }
    >
      <div className="hub-head">
        <span className="muted" style={{ fontSize: 13 }}>
          {position} of {total}
        </span>
        <button className="link" onClick={onShowList}>
          ☰ Show all
        </button>
      </div>
      <Progress done={position} total={total} />

      <div className={selected ? 'feeling-card is-selected' : 'feeling-card'}>
        {selected ? (
          <span className="card-check" aria-hidden="true">
            ✓
          </span>
        ) : null}
        <div className="card-face">
          <div className="focus-word">{word}</div>
          <p className="focus-def">{definition}</p>
        </div>
        {selected ? (
          <div className="card-note">
            <textarea
              className="textarea"
              rows={3}
              placeholder="note (optional)"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>
        ) : null}
      </div>
    </Chrome>
  )
}

export function FocusEnd({
  category,
  total,
  words,
  note,
  count,
  onBack,
  onClose,
  onShowList,
  onPrev,
  onCategoryNote,
}: {
  category: string
  total: number
  words: readonly string[]
  note: string
  count: number
  onBack: () => void
  onClose: () => void
  onShowList: () => void
  onPrev: () => void
  onCategoryNote: () => void
}) {
  return (
    <Chrome
      bodyClass="focus-body"
      header={<Header title={category} onBack={onBack} onClose={onClose} />}
      footer={
        <>
          <button className="step" onClick={onPrev}>
            ‹
          </button>
          <button className="primary" onClick={onBack}>
            Done{count > 0 ? ` · ${count} selected` : ''}
          </button>
        </>
      }
    >
      <div className="hub-head">
        <span className="muted" style={{ fontSize: 13 }}>
          {total} of {total}
        </span>
        <button className="link" onClick={onShowList}>
          ☰ Show all
        </button>
      </div>
      <Progress done={total} total={total} />

      <div className="feeling-card">
        <div className="card-face focus-end">
          <p style={{ fontSize: 18, margin: '0 0 8px' }}>
            That&rsquo;s all of {category}.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {words.length > 0 ? words.join(', ') : 'Nothing selected here.'}
          </p>
          <div>
            <button className="link" onClick={onCategoryNote}>
              {note === ''
                ? `+ Add a note about ${category}`
                : `✎ Edit note about ${category}`}
            </button>
          </div>
        </div>
      </div>
    </Chrome>
  )
}
