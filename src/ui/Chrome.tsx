import type { ReactNode } from 'react'
import { Icon } from './host'

export function Chrome({
  header,
  footer,
  bodyClass,
  children,
}: {
  header: ReactNode
  footer?: ReactNode
  /** `.dialog-body` is shared by every screen; opt in to a different layout. */
  bodyClass?: string
  children: ReactNode
}) {
  return (
    <div className="dialog">
      <div className="dialog-header">{header}</div>
      <div className={bodyClass ? `dialog-body ${bodyClass}` : 'dialog-body'}>
        {children}
      </div>
      {footer ? <div className="dialog-footer">{footer}</div> : null}
    </div>
  )
}

export function Header({
  title,
  onBack,
  onClose,
}: {
  title: string
  onBack?: () => void
  onClose: () => void
}) {
  /* Obsidian's own classes on our own elements. The styling — including the
     phone variants — comes from the app, but the elements stay inside the layer
     that Slide moves, which anything in Obsidian's titleEl could not do.
     `.modal-title` carries auto side margins, so it centres itself between the
     two buttons and no spacer is needed. */
  return (
    <>
      {onBack ? (
        <button className="clickable-icon" onClick={onBack} aria-label="Back">
          <Icon name="chevron-left" />
        </button>
      ) : null}
      <div className="modal-title">{title}</div>
      <button className="clickable-icon" onClick={onClose} aria-label="Close">
        <Icon name="x" />
      </button>
    </>
  )
}
