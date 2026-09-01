import type { HubCard, PillGroup } from '../model/screen'
import { Chrome, Header } from './Chrome'

const GROUP_LABEL: Record<PillGroup['kind'], string> = {
  met: 'When needs are met',
  unmet: 'When needs are not met',
}

export function Hub({
  cards,
  groups,
  total,
  onOpen,
  onClear,
  onInsert,
  onClose,
}: {
  cards: readonly HubCard[]
  groups: readonly PillGroup[]
  total: number
  onOpen: (category: string) => void
  onClear: () => void
  onInsert: () => void
  onClose: () => void
}) {
  return (
    <Chrome
      header={<Header title="Insert feelings" onClose={onClose} />}
      footer={
        <button className="primary" onClick={onInsert} disabled={total === 0}>
          {total === 0
            ? 'Insert'
            : `Insert ${total} feeling${total === 1 ? '' : 's'}`}
        </button>
      }
    >
      {cards.length > 0 ? (
        <>
          <div className="hub-head">
            <span className="section" style={{ margin: 0 }}>
              Selected
            </span>
            <button className="link" onClick={onClear}>
              Clear
            </button>
          </div>
          {cards.map((card) => (
            <button
              className="card"
              key={card.category}
              onClick={() => onOpen(card.category)}
            >
              <span className="card-head">
                <span>
                  {card.category}
                  {card.hasNote ? '*' : ''}
                </span>
                <span className="muted">›</span>
              </span>
              <span className="card-words">
                {card.words.map((w, i) => (
                  <span key={w.word}>
                    {i > 0 ? ', ' : ''}
                    {w.word}
                    {w.hasNote ? '*' : ''}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </>
      ) : (
        <p className="muted" style={{ margin: '0 0 8px' }}>
          Pick a category to browse.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.kind}>
          <div className="section">{GROUP_LABEL[group.kind]}</div>
          <div className="pills">
            {group.names.map((name) => (
              <button className="pill" key={name} onClick={() => onOpen(name)}>
                {name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Chrome>
  )
}
