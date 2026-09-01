import { useEffect, useRef } from 'react'
import { Chrome, Header } from './Chrome'

/**
 * A screen that is nothing but one note.
 *
 * Both notes get a screen of their own rather than a field on the screen that
 * owns them, and the reason is the phone: the on-screen keyboard covers the
 * bottom of the modal, so the only place a field is reliably visible is directly
 * under the header. What sits below it — this screen's own Done included — stays
 * reachable because the modal shrinks with the keyboard. See obsidian/styles.css.
 *
 * `singleLine` is about the markdown, not the screen: a feeling's note is written
 * inline after an em dash, so a newline would break the line it lives on. There
 * Enter finishes instead of wrapping, which also answers the question a phone
 * otherwise leaves open — how you say you are done typing. A category note is a
 * paragraph in its own right and keeps its newlines.
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
  useEffect(() => field.current?.focus(), [])

  return (
    <Chrome
      bodyClass="note-body"
      header={<Header title={title} onBack={onDone} onClose={onClose} />}
      footer={
        <button className="primary mod-cta" onClick={onDone}>
          Done
        </button>
      }
    >
      <div className="section" style={{ marginTop: 0 }}>
        {label}
      </div>
      {/* No placeholder. The header names what the note is about, the label
          above says it is a note, and the field is focused on arrival with the
          caret already in it — a third string could only repeat one of those,
          and it is gone the moment you type. */}
      <textarea
        ref={field}
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
