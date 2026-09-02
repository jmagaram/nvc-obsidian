import { useRef } from 'react'
import type { DeckMarks, Screen } from '../model/screen'
import { useFocusOnArrival } from './arrival'
import { ActionButton, Chrome, Header, PrimaryButton, Shortcut } from './Chrome'
import { Icon } from './host'
import { NOTE_KEY } from './keyboard'
import { Slide } from './Slide'

type FocusScreen = Extract<Screen, { kind: 'focusCard' | 'focusEnd' }>

/**
 * One segment per card in the deck, in deck order: how far along the deck you
 * are, and which of its words you have kept.
 *
 * A single filled bar could only say the first of those. The segments say both
 * without spending a second control on it, and a category here runs four to
 * nine words, so each segment is wide enough to read at a glance.
 *
 * Decoration, deliberately: the caption directly above already says "3 of 9",
 * and a `progressbar` role here would only have a screen reader say it twice.
 * What a segment adds over that caption is colour, which is not a thing to
 * announce — the card itself says "Selected" when it is.
 */
function Progress({
  chosen,
  current,
}: {
  chosen: DeckMarks
  /** 1-based card on screen. `null` on the closing card, which stands past the
      last of them and so carries no cursor. */
  current: number | null
}) {
  return (
    <div className="progress" aria-hidden="true">
      {chosen.map((kept, index) => (
        <span
          key={index}
          className={[
            'progress-step',
            kept ? 'is-chosen' : '',
            index + 1 === current ? 'is-current' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  )
}

/**
 * The note on a card: the note itself once there is one, the offer of one
 * before that, and the space either takes whether or not it is shown.
 *
 * A card with nothing to note must be exactly as tall as one that has a note,
 * or `.card-face` centres the word in a box whose height depends on the
 * selection and the word jumps as you toggle, type or page. The extract clamps
 * at two lines and `.card-note` reserves those two lines in every state, so the
 * tallest state fixes the height once and no other state can move the word.
 *
 * A chip alone said only that a note existed, which on the one screen showing a
 * single feeling is the one place its note has room to be read. The note is
 * still written on a screen of its own — see src/ui/Note.tsx. A field in this
 * position sits at the bottom of the modal, which on a phone is behind the
 * on-screen keyboard.
 */
function CardNote({
  note,
  word,
  onOpen,
}: {
  /** `null` reserves the space without offering the action. */
  note: string | null
  word?: string
  onOpen?: () => void
}) {
  const open = onOpen ?? (() => undefined)

  /* Extract and bare pencil, the shape the category note already has in List:
     with your own sentence in the row there is nothing left for a labelled chip
     to say, and "Edit note" beside it is a label restating what it labels. */
  if (note !== null && note !== '') {
    return (
      <div className="card-note">
        {/* No hint on the extract, though it fires the same action. It clamps
            at two lines with `overflow: hidden`, so a letter appended here is
            cut off on any note long enough to fill them — a hint that comes and
            goes with how much you wrote is worse than none. The pencil beside
            it carries the key for the row. */}
        <button className="plain note-extract" onClick={open}>
          {note}
        </button>
        <button
          className="clickable-icon"
          aria-label={`Edit note about ${word}`}
          aria-keyshortcuts={NOTE_KEY.aria}
          onClick={open}
        >
          <Icon name="square-pen" />
          {/* The one place the pairing is written out by hand rather than
              handed to ActionButton, because this stays a bare icon: a labelled
              chip here would restate the sentence sitting beside it. After the
              glyph, not before — the glyph is the control and the letter is a
              footnote to it. */}
          <Shortcut hint={NOTE_KEY.key} />
        </button>
      </div>
    )
  }

  /* No hint where there is no action. `note === null` is the unselected card,
     whose row is drawn only to hold the height and offers nothing — Dialog
     leaves the key dead there for the same reason. Every other state offers
     it, the end card's category note included: that note lives in this row now
     rather than in a button of its own on the card face, so the key is named
     once per screen without the condition having to say so. */
  return (
    <div className={note === null ? 'card-note is-empty' : 'card-note'}>
      <ActionButton
        icon="message-square-plus"
        label="Add a note"
        aria-label={word === undefined ? undefined : `Add a note about ${word}`}
        shortcut={note === null ? undefined : NOTE_KEY}
        onClick={open}
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

  /* The answer the card is waiting for, which is the middle of the footer:
     Yes or Not this, and Done on the closing card. Nothing on the card face
     could take this instead — the note button is the only control up there, it
     is missing on an unselected card, and paging remounts whatever is inside
     the nested Slide, which is the very thing the `n` key exists to work
     around. The footer holds still through paging, so one arrival is enough
     for the whole deck: Space answers the card in front of you, ← → turn it,
     and Tab from here reaches the two arrows that do the same.

     The one screen where a keyboard was not quite stranded before — the global
     keys in src/Dialog.tsx answer the deck wherever focus is — and the one
     where landing anywhere else would be strange, since ⌘⏎ already presses
     this button. */
  const answer = useRef<HTMLButtonElement>(null)
  useFocusOnArrival(() => answer.current)

  /* Bare buttons rather than `clickable-icon`: these are primary footer
     navigation sitting either side of a `mod-cta`, and `.primary { flex: 1 }`
     assumes solid siblings that do not grow. They carry a label because the
     glyph is an icon rather than a character.

     Arrows rather than chevrons, though a carousel would use chevrons: this
     screen already draws a chevron-left in its header for Back, and one glyph
     pointing the same way at two destinations — out of the deck, and one card
     back through it — is the ambiguity worth spending a second pair of icons
     on. It also puts the footer's glyph and the key that presses it in the same
     shape; see the paging block in src/Dialog.tsx. */
  const prev = (
    <button
      className="step"
      onClick={onPrev}
      disabled={position === 1 && !end}
      aria-label="Previous"
    >
      <Icon name="arrow-left" />
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
            <PrimaryButton
              ref={answer}
              label={`Done${end.count > 0 ? ` · ${end.count} selected` : ''}`}
              onClick={onBack}
            />
          </>
        ) : (
          <>
            {prev}
            {/* The label names the press, not the state — the card behind it is
                already the state, and says so across its whole surface. A button
                reading "Selected" was the third telling of one fact, after the
                tint and a check glyph beside that very label, and it left the
                two states differing by two letters once the glyph came off.
                "Yes" and "Not this" cannot be misread for each other.

                Neither is a `mod-cta`. With a status label the accent fill meant
                "this is on"; with an action label it means "press me", and
                neither press wants urging — a filled "Yes" leans on you to take
                every card in an inventory where most words will not apply, and a
                filled "Not this" leans on you to undo.

                And no `aria-pressed`, deliberately. It is for a toggle whose name
                holds still while its state moves; here the name *is* the state,
                and "Not this, pressed" contradicts itself. What it used to
                announce is on the card instead — see `card-state` below. */}
            <PrimaryButton
              ref={answer}
              label={card?.selected ? 'Not this' : 'Yes'}
              cta={false}
              onClick={onToggle}
            />
            <button className="step" onClick={onNext} aria-label="Next">
              <Icon name="arrow-right" />
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
      <Progress chosen={screen.chosen} current={card ? card.position : null} />

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
            </div>
            {/* The category's note, in the row a card gives a word's. Offering
                it in the middle of the card put the action hard under the
                summary with no room between the two, and then had nothing to
                show once a note existed. This row already draws an extract,
                already reserves its two lines whether or not one is written,
                and is where the note action sits on every other card in the
                deck. It also leaves the summary alone in `.card-face`, which
                gives the words back the whole centred box — the space that was
                missing beneath them. */}
            <CardNote
              note={end.note}
              word={screen.category}
              onOpen={onCategoryNote}
            />
          </div>
        ) : (
          <div
            className={
              card?.selected ? 'feeling-card is-selected' : 'feeling-card'
            }
          >
            {/* Spoken, not drawn. The tint and the accent border are what a
                sighted reader sees, and a check glyph in the corner repeated
                them at a sixth of their size — smaller than the "N of M" above
                it, which is a caption. Nothing is owed to the eye here.

                But the tint says nothing to a screen reader, and the button no
                longer carries `aria-pressed` to say it either, so the fact lives
                here now. First in the card so it is read before the word. */}
            {card?.selected ? <span className="card-state">Selected</span> : null}
            <div className="card-face">
              <div className="focus-word">{card?.word}</div>
              <p className="focus-def">{card?.definition}</p>
            </div>
            <CardNote
              note={card?.selected ? card.note : null}
              word={card?.word}
              onOpen={onOpenNote}
            />
          </div>
        )}
      </Slide>
    </Chrome>
  )
}
