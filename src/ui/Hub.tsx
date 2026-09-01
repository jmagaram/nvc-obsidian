import type { HubCard, PillGroup } from '../model/screen'
import { ActionButton, Chrome, Header } from './Chrome'
import { Icon } from './host'

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
        <button
          className="primary mod-cta"
          onClick={onInsert}
          disabled={total === 0}
        >
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
            {/* `x`, not a bin: this deselects, it does not destroy anything. */}
            <ActionButton icon="x" label="Clear" onClick={onClear} />
          </div>
          {cards.map((card) => (
            <button
              className="plain card"
              key={card.category}
              onClick={() => onOpen(card.category)}
            >
              <span className="card-head">
                <span className="card-name">
                  {card.category}
                  {card.hasNote ? (
                    <Icon name="message-square-text" label="has a note" />
                  ) : null}
                </span>
                <Icon name="chevron-right" />
              </span>
              <span className="card-words">
                {card.words.map((w, i) => (
                  <span key={w.word}>
                    {i > 0 ? ', ' : ''}
                    {w.word}
                    {/* Sized in `em` and drawn faint, so a dozen of them across
                        a card read as footnote marks rather than as a dozen
                        icons competing with the words they mark.

                        Unlabelled, unlike the one on the card head. A button's
                        name is the flattening of everything inside it, so a
                        labelled marker per word would say "has a note" a dozen
                        times in one breath. Nothing is lost by leaving them
                        decorative: this card is a glance, and each word's own
                        row on the next screen already announces whether it has
                        a note. */}
                    {w.hasNote ? <Icon name="asterisk" /> : null}
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

      {/* No headings: the names carry their own valence, and each group is
          alphabetised on its own, so the alphabet restarting marks the break as
          plainly as a label would. The clouds are siblings rather than wrapped
          divs because the gap between them is drawn by `.pills + .pills`, and an
          empty group renders nothing so it cannot leave that gap behind. */}
      {groups.map((group) =>
        group.names.length === 0 ? null : (
          <div className="pills" key={group.kind}>
            {group.names.map((name) => (
              <button className="pill" key={name} onClick={() => onOpen(name)}>
                {name}
              </button>
            ))}
          </div>
        ),
      )}
    </Chrome>
  )
}
