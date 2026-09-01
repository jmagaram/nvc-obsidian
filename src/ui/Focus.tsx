import type { Screen } from '../model/screen'
import { Chrome, Header } from './Chrome'
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

  return (
    <Chrome
      bodyClass="focus-body"
      header={
        <Header title={screen.category} onBack={onBack} onClose={onClose} />
      }
      footer={
        end ? (
          <>
            <button className="step" onClick={onPrev}>
              ‹
            </button>
            <button className="primary mod-cta" onClick={onBack}>
              Done{end.count > 0 ? ` · ${end.count} selected` : ''}
            </button>
          </>
        ) : (
          <>
            <button className="step" onClick={onPrev} disabled={position === 1}>
              ‹
            </button>
            <button
              className={card?.selected ? 'primary mod-cta' : 'primary'}
              onClick={onToggle}
              aria-pressed={card?.selected ?? false}
            >
              {card?.selected ? '✓ Selected' : 'Select'}
            </button>
            <button className="step" onClick={onNext}>
              ›
            </button>
          </>
        )
      }
    >
      <div className="hub-head">
        <span className="muted" style={{ fontSize: 'var(--font-ui-small)' }}>
          {position} of {screen.total}
        </span>
        <button className="plain link" onClick={onShowList}>
          ☰ Show all
        </button>
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
                <button className="plain link" onClick={onCategoryNote}>
                  {end.note === ''
                    ? `+ Add a note about ${end.category}`
                    : `✎ Edit note about ${end.category}`}
                </button>
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
              <span className="card-check" aria-hidden="true">
                ✓
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
