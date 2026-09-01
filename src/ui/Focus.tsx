import type { Screen } from '../model/screen'
import { ActionButton, Chrome, Header } from './Chrome'
import { Icon } from './host'
import { Slide } from './Slide'

type FocusScreen = Extract<Screen, { kind: 'focusCard' | 'focusEnd' }>

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="progress">
      <div style={{ width: `${(done / total) * 100}%` }} />
    </div>
  )
}

/**
 * The deck, card and closing card alike.
 *
 * One component for both because the chrome around them is the same, and only
 * what is inside the card changes as you page. Sliding the whole screen moved a
 * header and footer that were identical either side of the transition, which
 * read as the screen jittering sideways for no reason. So the push belongs to
 * screen changes — handled by the outer Slide in Dialog, which now keeps one key
 * for the whole deck — and paging moves the card and nothing else.
 */
export function Focus({
  screen,
  onBack,
  onClose,
  onShowList,
  onPrev,
  onNext,
  onToggle,
  onNoteChange,
  onCategoryNote,
}: {
  screen: FocusScreen
  onBack: () => void
  onClose: () => void
  onShowList: () => void
  onPrev: () => void
  onNext: () => void
  onToggle: () => void
  onNoteChange: (text: string) => void
  onCategoryNote: () => void
}) {
  const end = screen.kind === 'focusEnd' ? screen : null
  const card = screen.kind === 'focusCard' ? screen : null
  const position = end ? end.total : (card?.position ?? 0)

  /* Bare buttons rather than `clickable-icon`: these are primary footer
     navigation sitting either side of a `mod-cta`, and `.primary { flex: 1 }`
     assumes solid siblings that do not grow. They carry a label now that the
     chevron is an icon rather than a character. */
  const prev = (
    <button
      className="step"
      onClick={onPrev}
      disabled={position === 1 && !end}
      aria-label="Previous"
    >
      <Icon name="chevron-left" />
    </button>
  )

  return (
    <Chrome
      bodyClass="focus-body"
      header={
        <Header title={screen.category} onBack={onBack} onClose={onClose} />
      }
      footer={
        end ? (
          <>
            {prev}
            <button className="primary mod-cta" onClick={onBack}>
              Done{end.count > 0 ? ` · ${end.count} selected` : ''}
            </button>
          </>
        ) : (
          <>
            {prev}
            {card?.selected ? (
              <ActionButton
                icon="check"
                label="Selected"
                className="primary mod-cta"
                onClick={onToggle}
                aria-pressed
              />
            ) : (
              <button
                className="primary"
                onClick={onToggle}
                aria-pressed={false}
              >
                Select
              </button>
            )}
            <button className="step" onClick={onNext} aria-label="Next">
              <Icon name="chevron-right" />
            </button>
          </>
        )
      }
    >
      <div className="hub-head">
        <span className="muted" style={{ fontSize: 'var(--font-ui-small)' }}>
          {position} of {screen.total}
        </span>
        <ActionButton icon="list" label="Show all" onClick={onShowList} />
      </div>
      <Progress done={position} total={screen.total} />

      {/* Nested, and deliberately owning no scroll container: this moves inside
          the body that Chrome supplies rather than replacing it. */}
      <Slide
        screenKey={end ? 'end' : `card:${position}`}
        rank={end ? screen.total + 1 : position}
        trackScroll={false}
      >
        {end ? (
          <div className="feeling-card">
            <div className="card-face focus-end">
              <p style={{ fontSize: 'var(--font-ui-large)', margin: '0 0 8px' }}>
                That&rsquo;s all of {end.category}.
              </p>
              <p className="muted" style={{ margin: 0 }}>
                {end.words.length > 0
                  ? end.words.join(', ')
                  : 'Nothing selected here.'}
              </p>
              <div>
                {/* Icon and words, unlike the same action in List: there is no
                    section header here to hang a bare icon off, and the card
                    has room for the sentence. */}
                <ActionButton
                  icon={
                    end.note === '' ? 'message-square-plus' : 'square-pen'
                  }
                  label={
                    end.note === ''
                      ? `Add a note about ${end.category}`
                      : `Edit note about ${end.category}`
                  }
                  onClick={onCategoryNote}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className={
              card?.selected ? 'feeling-card is-selected' : 'feeling-card'
            }
          >
            {card?.selected ? (
              <span className="card-check">
                <Icon name="check" />
              </span>
            ) : null}
            <div className="card-face">
              <div className="focus-word">{card?.word}</div>
              <p className="focus-def">{card?.definition}</p>
            </div>
            {card?.selected ? (
              <div className="card-note">
                <textarea
                  rows={3}
                  placeholder="note (optional)"
                  value={card.note}
                  onChange={(e) => onNoteChange(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        )}
      </Slide>
    </Chrome>
  )
}
