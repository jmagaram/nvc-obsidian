import { useRef } from 'react'
import type { DeckMarks, Screen } from '../model/screen'
import { useFocusOnArrival } from './arrival'
import { Chrome, Header, PrimaryButton, Shortcut } from './Chrome'
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
 * The only telling of position now, in either modality. A caption above this
 * used to say "3 of 9" and left the bar decoration under it, but its two
 * numbers keep different time: the total holds still for a whole deck, and sits
 * on the button above this, which needs it anyway to say how long the list it
 * opens is. The ordinal changes on every press, and a cursor walking nine
 * segments says that without spending a word on it. Hence the `progressbar`
 * role, which only duplicated the caption while there was one.
 *
 * The colour stays unannounced. It is not what the role is for, and what it
 * draws is already spoken twice: the card says "Selected" when it is, and so
 * does each word's own row on the list screen.
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
    <div
      className="progress"
      role="progressbar"
      aria-label="Progress"
      aria-valuemin={1}
      aria-valuemax={chosen.length}
      aria-valuenow={current ?? chosen.length}
      aria-valuetext={`${current ?? chosen.length} of ${chosen.length}`}
    >
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
          {/* A bare icon, not a labelled chip: a label here would restate the
              sentence sitting beside it. After the glyph, not before — the
              glyph is the control and the letter is a footnote to it. */}
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
      {/* No glyph, for the reason the switch above the card has none: there is
          no stack here to draw a column down, the row centres what it holds so
          there is no left edge to line one up on, and `message-square-plus`
          drew the eye to the offer of a note on a card whose subject is a word.

          Written out rather than handed to a component now that it is the only
          one of its shape. Both halves of the key still have to move together —
          the drawn hint and the announced one — which is what the component was
          keeping honest; here they are three lines apart on the same element. */}
      <button
        aria-label={word === undefined ? undefined : `Add a note about ${word}`}
        aria-keyshortcuts={note === null ? undefined : NOTE_KEY.aria}
        onClick={open}
      >
        Add a note
        {note === null ? null : <Shortcut hint={NOTE_KEY.key} />}
      </button>
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
      {/* The deck's size on the button rather than in a caption beside it. It
          is the number that says how long the list you are about to open is,
          which is worth knowing before you open it, and it holds still while
          you page — where a caption's other number, the ordinal, moved every
          press and is drawn better by the rule below than written out.

          Centred, because everything else on this screen is: the title above
          it, the card and the word inside it, the three buttons below. Off
          that line it was the one thing the eye had to account for. The list
          screen puts the reciprocal switch in this same band and aligns it
          left, with the rows it belongs to — the same door in the same place,
          each side of it keeping its own screen's axis. */}
      <div className="focus-actions">
        {/* No glyph, by the test written over `.list-actions` in src/ui/List.tsx:
            an icon beside a label earns its place by making a column down the
            left edge of a stack, or by naming what the label cannot. There is
            no stack here, centring took away the edge a glyph could line up on,
            and `list` says nothing that "Show all 9" has not already said. It
            leaves the two switches matching in kind as well as in place. */}
        <button onClick={onShowList}>{`Show all ${screen.total}`}</button>
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
              <p className="focus-end-caption">That&rsquo;s all.</p>
              {/* `card-words` rather than a joined string, so a word carrying a
                  note gets the same faint asterisk it gets on the hub card.
                  This and the hub are the two places the selection is read back
                  as a run of words, and they should not disagree about shape.

                  They do disagree about size, and should. The hub draws a dozen
                  categories at a glance and its runs are the gloss under a name;
                  this run is the answer to the deck you just paged through, and
                  every word in it was on screen at 2em a moment ago. Read back
                  at 13px it looked like a caption about the deck rather than
                  what the deck was for. */}
              {end.words.length === 0 ? (
                <p className="focus-end-caption">Nothing selected.</p>
              ) : (
                <p className="card-words focus-end-words">
                  {end.words.map((w, i) => (
                    <span key={w.word}>
                      {i > 0 ? ', ' : ''}
                      {w.word}
                      {w.hasNote ? <Icon name="asterisk" /> : null}
                    </span>
                  ))}
                </p>
              )}
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
                them at a sixth of their size — smaller even than the cursor on
                the rule above it, which is decoration. Nothing is owed to the
                eye here.

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
