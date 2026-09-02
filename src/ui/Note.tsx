import { useRef } from 'react'
import { useFocusOnArrival } from './arrival'
import { Chrome, Header, PrimaryButton } from './Chrome'

/**
 * A screen that is nothing but one note.
 *
 * Both notes get a screen of their own rather than a field on the screen that
 * owns them, and the reason is the phone: the on-screen keyboard covers the
 * bottom of the modal, so the only place a field is reliably visible is directly
 * under the header. What sits below it — this screen's own Done included — stays
 * reachable because the modal shrinks with the keyboard. See obsidian/styles.css.
 *
 * `singleLine` is about the markdown, not the screen. Both notes are stored as a
 * bullet in the block — a word's under its word, a category's under an empty
 * one — and a bullet holds one line: a line break in either would need a
 * continuation rule in every reader of the format. So Enter finishes instead of
 * wrapping, which also answers the question a phone otherwise leaves open, which
 * is how you say you are done typing. `oneLine` collapses whatever still
 * arrives, for text that was pasted rather than typed.
 *
 * Both callers pass it, so it is never read as false today. It stays a prop
 * because it is the field's own statement of what it is for, and because the
 * first note that is allowed more than a line will need it back.
 */
export function Note({
  title,
  label,
  text,
  singleLine = false,
  onDone,
  onClose,
  onChange,
}: {
  title: string
  label: string
  text: string
  singleLine?: boolean
  onDone: () => void
  onClose: () => void
  onChange: (text: string) => void
}) {
  const field = useRef<HTMLTextAreaElement>(null)

  /* The field, because a screen that is nothing but one note is a screen you
     came to type on. It is also the arrival this screen is most particular
     about: the caret opens the on-screen keyboard, which is a second scroll
     with the same cause as the one `useFocusOnArrival` guards against, and the
     one that carried the header off the top. The field is capped so it
     has somewhere to fit — that half of the fix is in dialog.css, with
     obsidian/styles.css shrinking the modal to make the room and holding its
     top edge clear of the island. */
  useFocusOnArrival(() => field.current)

  return (
    <Chrome
      bodyClass="note-body"
      header={<Header title={title} onBack={onDone} onClose={onClose} />}
      footer={<PrimaryButton label="Done" onClick={onDone} />}
    >
      <div className="section" style={{ marginTop: 0 }}>
        {label}
      </div>
      {/* No placeholder. The header names what the note is about, the label
          above says it is a note, and the field is focused on arrival with the
          caret already in it — a third string could only repeat one of those,
          and it is gone the moment you type. */}
      {/* The height the field asks for at rest. It grows from here into
          whatever the keyboard leaves, up to a cap that keeps the whole field
          inside the space above the keyboard — see dialog.css, where the reason
          that matters is written out. */}
      <textarea
        ref={field}
        rows={5}
        enterKeyHint={singleLine ? 'done' : undefined}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (singleLine && e.key === 'Enter') {
            e.preventDefault()
            onDone()
          }
        }}
      />
    </Chrome>
  )
}
