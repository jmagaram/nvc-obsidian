import type { CSSProperties } from 'react'
import type { FocusScreen } from '../model/screen'
import { Shortcut } from './Chrome'
import { Icon } from './host'
import { NOTE_KEY } from './keyboard'

/**
 * The longest stretch of the entry with no break opportunity in it — the part
 * that actually has to fit on one line.
 *
 * Not the length of the entry. The line breaker turns at a space, at a hyphen
 * and after a slash, so `to understand and be understood` asks for the ten
 * characters of `understand` rather than thirty-one, and `respect/self-respect`
 * asks for seven. Sizing on the whole string would shrink the phrases hardest,
 * when they are the entries that need it least.
 *
 * Computed from whatever string the card is handed, so nothing here knows the
 * inventory: a word added or removed later sizes itself.
 */
const longestRun = (word: string) =>
  Math.max(1, ...word.split(/[\s/-]+/).map((part) => part.length))

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
 * single word is the one place its note has room to be read. The note is
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
 * What one layer of the deck draws: the card in front of you, or the closing
 * card that stands past the last of them.
 *
 * Lifted out of `Focus` unchanged when the deck learned to be dragged. The
 * screen used to hold exactly one of these and could write it inline; a drag
 * has to draw the card you are pulling toward before you have arrived at it, so
 * there are now two on screen at once and the card had to become something that
 * can be asked for twice.
 *
 * Pure in its screen, and knows nothing about which of the two it is. That is
 * what makes the hand-off at the end of a drag invisible: the layer being
 * dragged toward and the layer that becomes the current card render the same
 * component over the same value, so there is nothing for React to change.
 */
export function Card({
  screen,
  onToggle,
  onOpenNote,
  onCategoryNote,
}: {
  screen: FocusScreen
  onToggle: () => void
  onOpenNote: () => void
  onCategoryNote: () => void
}) {
  const end = screen.kind === 'focusEnd' ? screen : null
  const card = screen.kind === 'focusCard' ? screen : null

  return end ? (
    <div className="word-card">
      <div className="card-face focus-end">
        {/* No caption over the run. "That's all." was the fourth
            telling of one fact: the footer reads "Done · 3 selected",
            the progress cursor stands past the last segment, and the run
            itself is a summary rather than a card. With nothing selected
            it was two muted lines stacked, only the second of which
            carried news. So the run speaks alone, and the empty case
            keeps the one line that says something.

            `card-words` rather than a joined string, so a word carrying a
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
    /* The card answers itself. Tapping the thing you are deciding
       about is the shortest path between the question and the answer,
       and on a phone it is the one target big enough to hit without
       looking — the footer button is a thumb-stretch away at the bottom
       of a modal. The button stays, and stays the announced control:
       this adds a way to press it, not a second control that means the
       same thing. So no `role`, no `tabindex`, nothing in the
       accessibility tree — a card that announced itself as a button
       would be the third telling of one action, after the footer button
       and the ⌘⏎ that presses it, and `role="button"` on a box holding
       the note buttons is not a thing a box may be.

       Only the answering card. The closing card is a summary with
       nothing to toggle, which is why this sits here rather than on the
       `.word-card` both branches draw. */
    <div
      className={[
        'word-card',
        'is-tappable',
        card?.selected ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => {
        /* The note's band is the note's, and the whole band rather
           than the controls in it: a press that misses "Add a note" by
           a few pixels would otherwise deselect the card, which takes
           away the note offer the press was reaching for. Two lines of
           mostly empty row around a centred button is the one place on
           this card where a miss is likely and expensive, so the row
           answers nothing rather than answering wrongly.

           `closest` rather than a test on the target itself, because a
           press usually lands on something inside — the glyph in the
           pencil, the text in the extract. The glyph is an `svg`, so
           `Element` is the type that covers what can arrive here and
           `HTMLElement` would not. */
        if ((e.target as Element).closest('button, .card-note')) return
        /* Releasing a drag that selected the definition is not an
           answer to the card. Only that case: a plain tap taken after
           selecting something elsewhere is unaffected, since the
           mousedown under it collapses that selection before this
           runs. */
        if (!(window.getSelection()?.isCollapsed ?? true)) return
        onToggle()
      }}
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
        {/* `--run` is read by the rule in dialog.css, which caps the word
            at the size that run of characters still fits the card. */}
        <div
          className="focus-word"
          style={
            { '--run': longestRun(card?.word ?? '') } as CSSProperties
          }
        >
          {card?.word}
        </div>
        <p className="focus-def">{card?.definition}</p>
      </div>
      <CardNote
        note={card?.selected ? card.note : null}
        word={card?.word}
        onOpen={onOpenNote}
      />
    </div>
  )
}
