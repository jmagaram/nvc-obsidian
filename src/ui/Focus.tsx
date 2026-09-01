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
 * The note affordance, and the space it takes whether or not it is shown.
 *
 * A card with nothing to note must be exactly as tall as one that has a note,
 * or `.card-face` centres the word in a box whose height depends on the
 * selection and the word jumps as you toggle or page. So the row stays in the
 * flow and is only hidden, which reserves the height from the control the host
 * actually drew rather than from a literal.
 *
 * One chip in every state, rather than the note's own text once there is one. A
 * card is not a list: an extract runs to one line or two depending on what you
 * wrote, so reserving the taller of a chip and an extract only moves the
 * problem — the word would hold still as you select and then move as you type.
 * The icon carries the difference instead, the way it does on a row in List.
 *
 * The note is written on a screen of its own rather than here — see
 * src/ui/Note.tsx. A field in this position sits at the bottom of the modal,
 * which on a phone is behind the on-screen keyboard.
 */
function CardNote({
  note,
  onOpen,
}: {
  /** `null` reserves the space without offering the action. */
  note: string | null
  onOpen?: () => void
}) {
  const written = note !== null && note !== ''

  return (
    <div className={note === null ? 'card-note is-empty' : 'card-note'}>
      <ActionButton
        icon={written ? 'square-pen' : 'message-square-plus'}
        label={written ? 'Edit note' : 'Add a note'}
        onClick={onOpen ?? (() => undefined)}
      />
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
  onOpenNote,
  onCategoryNote,
}: {
  screen: FocusScreen
  onBack: () => void
  onClose: () => void
  onShowList: () => void
  onPrev: () => void
  onNext: () => void
  onToggle: () => void
  onOpenNote: () => void
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
              {/* Not "That's all of Annoyed": the header says which category
                  this is, and naming it here again is the sentence that grows
                  without bound once the needs inventory arrives. */}
              <p style={{ fontSize: 'var(--font-ui-large)', margin: '0 0 8px' }}>
                That&rsquo;s all.
              </p>
              {/* `card-words` rather than a joined string, so a word carrying a
                  note gets the same faint asterisk it gets on the hub card.
                  This and the hub are the two places the selection is read back
                  as a run of words, and they should not disagree. */}
              <p className="card-words" style={{ margin: 0 }}>
                {end.words.length === 0
                  ? 'Nothing selected.'
                  : end.words.map((w, i) => (
                      <span key={w.word}>
                        {i > 0 ? ', ' : ''}
                        {w.word}
                        {w.hasNote ? <Icon name="asterisk" /> : null}
                      </span>
                    ))}
              </p>
              <div>
                {/* Icon and words, unlike the same action in List: there is no
                    section header here to hang a bare icon off. The words no
                    longer name the category, because "That's all" and the
                    header above have both already placed it, and on this screen
                    no word is in focus, so a note can only mean the category's. */}
                <ActionButton
                  icon={
                    end.note === '' ? 'message-square-plus' : 'square-pen'
                  }
                  label={end.note === '' ? 'Add note' : 'Edit note'}
                  onClick={onCategoryNote}
                />
              </div>
            </div>
            {/* Reserved but never filled, so the summary centres at the same
                height the words did and arriving here shifts nothing. */}
            <CardNote note={null} />
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
            <CardNote
              note={card?.selected ? card.note : null}
              onOpen={onOpenNote}
            />
          </div>
        )}
      </Slide>
    </Chrome>
  )
}
