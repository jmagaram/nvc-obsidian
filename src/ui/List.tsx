import { useLayoutEffect, useRef } from 'react'
import type { ListRow } from '../model/screen'
import { Chrome, Header } from './Chrome'

export function List({
  category,
  note,
  rows,
  count,
  reveal,
  onBack,
  onClose,
  onOneAtATime,
  onCategoryNote,
  onToggle,
  onOpenFeeling,
}: {
  category: string
  note: string
  rows: readonly ListRow[]
  count: number
  reveal: number | null
  onBack: () => void
  onClose: () => void
  onOneAtATime: () => void
  onCategoryNote: () => void
  onToggle: (word: string) => void
  onOpenFeeling: (index: number) => void
}) {
  const revealed = useRef<HTMLDivElement>(null)

  // Centre the word you were last on, rather than scrollIntoView, which would
  // also scroll whatever is behind the dialog.
  useLayoutEffect(() => {
    const row = revealed.current
    const body = row?.closest('.dialog-body')
    if (!row || !(body instanceof HTMLElement)) return
    body.scrollTop =
      row.offsetTop - body.clientHeight / 2 + row.offsetHeight / 2
  }, [category, reveal])

  return (
    <Chrome
      header={<Header title={category} onBack={onBack} onClose={onClose} />}
      footer={
        <button className="primary mod-cta" onClick={onBack}>
          Done{count > 0 ? ` · ${count} selected` : ''}
        </button>
      }
    >
      <button className="plain link" onClick={onOneAtATime}>
        ⊡ One at a time ›
      </button>

      <div style={{ padding: 'var(--size-4-3) 0' }}>
        {note === '' ? (
          <button className="plain link" onClick={onCategoryNote}>
            + Add a note about {category}
          </button>
        ) : (
          <>
            <div className="hub-head">
              <span className="section" style={{ margin: 0 }}>
                Note
              </span>
              <button className="plain link" onClick={onCategoryNote}>
                ✎ edit
              </button>
            </div>
            <button className="plain note-extract" onClick={onCategoryNote}>
              {note}
            </button>
          </>
        )}
      </div>

      {rows.map((row, index) => (
        <div
          className={row.selected ? 'row row-selected' : 'row'}
          key={row.word}
          ref={index === reveal ? revealed : undefined}
        >
          <label className="row-label">
            <input
              type="checkbox"
              checked={row.selected}
              onChange={() => onToggle(row.word)}
            />
            <span className="row-text">
              <span className="row-word">{row.word}</span>
              <span className="row-def">{row.definition}</span>
            </span>
          </label>
          {row.selected ? (
            <button
              className="plain row-note-link"
              onClick={() => onOpenFeeling(index)}
            >
              {row.note === '' ? '+ note' : '✎ edit'}
            </button>
          ) : null}
          {row.note === '' ? null : (
            <button
              className="plain note-extract"
              onClick={() => onOpenFeeling(index)}
            >
              {row.note}
            </button>
          )}
        </div>
      ))}
    </Chrome>
  )
}
