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
  ...rest
}: {
  icon: IconName
  label: string
  onClick: () => void
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'onClick'>) {
  return (
    <button className="action" onClick={onClick} {...rest}>
      <Icon name={icon} />
      {label}
    </button>
  )
}

/**
 * The keys that press a primary button, and the two ways they have to be
 * written.
 *
 * Both modifiers work everywhere — see the keyboard block in src/Dialog.tsx —
 * because a hand that learned one host should not be told it is holding the
 * wrong key. What differs is what we say: a Mac names the modifier with a
 * glyph and everything else spells it out, and a hint in the other convention
 * reads as a hint for somebody else's machine.
 */
const MAC = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
const SHORTCUT = {
  hint: MAC ? '\u2318\u23ce' : 'Ctrl \u23ce',
  /** The spelling ARIA wants, which is neither of the two above. */
  aria: MAC ? 'Meta+Enter' : 'Control+Enter',
}

/**
 * The one action that finishes a screen: Done, Insert, Select.
 *
 * Ctrl/⌘+Enter presses it, and the button itself is what says so — a shortcut
 * with nothing on screen to name it is a shortcut only the person who wrote it
 * ever uses. The hint is drawn only where there is a keyboard to press it
 * with; see `.shortcut` in dialog.css.
 *
 * A component rather than the class repeated at five call sites, because the
 * key and its hint have to stay together. Dialog binds the key per screen and
 * this draws the hint, so a footer written by hand instead gives you either a
 * shortcut with nothing announcing it or a hint for a key that does nothing —
 * and both fail silently.
 *
 * `cta` is off for a primary that is not yet the thing to do: the unselected
 * card, where Obsidian's filled accent would say the choice had been made.
 */
export function PrimaryButton({
  label,
  icon,
  cta = true,
  onClick,
  ...rest
}: {
  label: string
  /** Drawn before the label, the way `ActionButton` draws one. */
  icon?: IconName
  cta?: boolean
  onClick: () => void
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'onClick'>) {
  const classes = ['primary']
  if (cta) classes.push('mod-cta')
  // `.action` carries the gap and the glyph scale, and it is the icon that
  // needs both.
  if (icon) classes.push('action')

  return (
    <button
      className={classes.join(' ')}
      onClick={onClick}
      aria-keyshortcuts={SHORTCUT.aria}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {label}
      {/* Hidden from the accessibility tree, because `aria-keyshortcuts` above
          is how a screen reader is meant to hear this. Left visible it joins
          the button's name instead, and the button becomes "Done \u2318\u23ce". */}
      <span className="shortcut" aria-hidden="true">
        {SHORTCUT.hint}
      </span>
    </button>
  )
}
