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
  // also scroll the page behind the dialog.
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
        <button className="primary" onClick={onBack}>
          Done{count > 0 ? ` · ${count} selected` : ''}
        </button>
      }
    >
      <div className="row" style={{ paddingTop: 0 }}>
        <button className="row-toggle" onClick={onOneAtATime}>
          <span className="row-word">⊡ One at a time</span>
        </button>
        <span className="row-note-link" style={{ top: 0 }}>
          ›
        </span>
      </div>

      <div style={{ padding: '12px 0' }}>
        {note === '' ? (
          <button className="link" onClick={onCategoryNote}>
            + Add a note about {category}
          </button>
        ) : (
          <>
            <div className="hub-head">
              <span className="section" style={{ margin: 0 }}>
                Note
              </span>
              <button className="link" onClick={onCategoryNote}>
                ✎ edit
              </button>
            </div>
            <button className="note-extract" onClick={onCategoryNote}>
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
          <button
            className="row-toggle"
            onClick={() => onToggle(row.word)}
            aria-pressed={row.selected}
          >
            <span className="row-word">
              {row.selected ? '☑' : '☐'} {row.word}
            </span>
            <span className="row-def">{row.definition}</span>
          </button>
          {row.selected ? (
            <button
              className="row-note-link"
              onClick={() => onOpenFeeling(index)}
            >
              {row.note === '' ? '+ note' : '✎ edit'}
            </button>
          ) : null}
          {row.note === '' ? null : (
            <button
              className="note-extract"
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
