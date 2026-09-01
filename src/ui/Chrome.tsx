import type { ReactNode } from 'react'

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
  return (
    <>
      {onBack ? (
        <button className="plain back" onClick={onBack} aria-label="Back">
          ‹
        </button>
      ) : null}
      <span className="title">{title}</span>
      <span className="spacer" />
      <button className="plain close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </>
  )
}
