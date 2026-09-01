import { createContext, useCallback, useContext } from 'react'
import type { ReactNode } from 'react'

/** Obsidian's `setIcon`, or nothing when there is no host to ask. */
export type SetIcon = (el: HTMLElement, name: string) => void

const IconContext = createContext<SetIcon | null>(null)

export function HostProvider({
  icon,
  children,
}: {
  icon?: SetIcon
  children: ReactNode
}) {
  return <IconContext value={icon ?? null}>{children}</IconContext>
}

/**
 * Lucide paths, used only when no host supplies icons — that is, in the browser
 * gallery. Inside Obsidian these are never drawn; `setIcon` puts whatever the
 * app itself ships into the element, so the icon cannot drift from the rest of
 * the UI.
 */
const FALLBACK: Record<string, string[]> = {
  x: ['M18 6 6 18', 'm6 6 12 12'],
  'chevron-left': ['m15 18-6-6 6-6'],
}

export function Icon({ name }: { name: keyof typeof FALLBACK & string }) {
  const setIcon = useContext(IconContext)

  const mount = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !setIcon) return
      el.innerHTML = ''
      setIcon(el, name)
    },
    [setIcon, name],
  )

  if (setIcon) return <span ref={mount} />

  return (
    <svg
      className="svg-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {FALLBACK[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
