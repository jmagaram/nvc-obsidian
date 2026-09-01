import { useEffect, useRef } from 'react'
import { Chrome, Header } from './Chrome'

export function CategoryNote({
  category,
  text,
  onDone,
  onClose,
  onChange,
}: {
  category: string
  text: string
  onDone: () => void
  onClose: () => void
  onChange: (text: string) => void
}) {
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => field.current?.focus(), [])

  return (
    <Chrome
      header={<Header title={category} onBack={onDone} onClose={onClose} />}
      footer={
        <button className="primary mod-cta" onClick={onDone}>
          Done
        </button>
      }
    >
      <div className="section" style={{ marginTop: 0 }}>
        Note about {category}
      </div>
      <textarea
        ref={field}
        style={{ height: 'min(60vh, 240px)' }}
        placeholder={`What's going on with ${category}?`}
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
    </Chrome>
  )
}
