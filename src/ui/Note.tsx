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

  /* Focus on arrival — but not while the screen is still moving, and never by
     letting the browser move the screen to suit the field.

     This effect runs with the layer holding the field still parked at
     translateX(100%), off to the right, and WebKit answers a focus by scrolling
     the field into view. So on a phone the view chased the field off-screen and
     the animation dragged it back: the note appeared to slide left, then right.
     The keyboard opening was a second scroll with the same cause, and the one
     that carried the header off the top; the field is capped at five lines now
     so that it has somewhere to fit, which is the half of that fix that lives
     in dialog.css. See obsidian/styles.css for the modal shrinking to make the
     room, and FeelingPickerModal for the net under both.

     `preventScroll` is the half that stops the chase; waiting for the animation
     is the half that leaves nothing worth chasing. The frame comes first
     because the entering layer is given its animation class in a layout effect
     one level up, and this effect can run before that lands. Desktop is
     untouched either way — the slide is over long before a hand reaches the
     keyboard — and with reduced motion there is no animation to wait for. */
  useEffect(() => {
    const el = field.current
    if (!el) return
    let live = true
    const take = () => {
      if (live) el.focus({ preventScroll: true })
    }
    const frame = requestAnimationFrame(() => {
      const sliding = el.closest('.layer')?.getAnimations?.() ?? []
      if (sliding.length === 0) return take()
      // A cancelled animation rejects, which is the layer being handed back its
      // resting class as the slide ends. Either way the screen has stopped.
      Promise.all(sliding.map((a) => a.finished)).then(take, take)
    })
    return () => {
      live = false
      cancelAnimationFrame(frame)
    }
  }, [])

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
      {/* Five lines rather than a field that fills the screen. It is more than
          these notes run to, and it is what keeps the whole field inside the
          space above the on-screen keyboard — see dialog.css, where the reason
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
