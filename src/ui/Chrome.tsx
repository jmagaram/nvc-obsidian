import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Icon } from './host'
import type { IconName } from './host'

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

/**
 * A button carrying an icon beside its label — Obsidian's shape for a secondary
 * action, and now the dialog's only one. The element stays bare so the host
 * draws the chip; `.action` supplies the two things Obsidian's `button` rule
 * leaves out, a gap and a scale for the glyph.
 *
 * A component rather than three elements repeated at each call site, because
 * what must not drift is the invariant rather than the shape: icon first, label
 * second, `.action` always present. Drop the class at one call site and that
 * button quietly renders an 18px glyph flush against 13px text — a defect that
 * looks like a rendering bug rather than a missing word.
 */
export function ActionButton({
  icon,
  label,
  onClick,
  className,
  ...rest
}: {
  icon: IconName
  label: string
  onClick: () => void
  className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'onClick'>) {
  return (
    <button
      className={className ? `action ${className}` : 'action'}
      onClick={onClick}
      {...rest}
    >
      <Icon name={icon} />
      {label}
    </button>
  )
}
