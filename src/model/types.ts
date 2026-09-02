import type { Category } from '../data/inventory'

/**
 * A category's words in the order the user will meet them. Shuffled once when
 * the dialog opens and fixed for its lifetime, so the list and the one-at-a-time
 * deck always agree and returning to a category never reshuffles it.
 */
export type Deck = readonly string[]

/** Where you are in a deck. The end card is a place, not an out-of-range index. */
export type Position = { kind: 'card'; index: number } | { kind: 'end' }

export type View =
  | { kind: 'hub' }
  | { kind: 'list'; category: string; reveal: number | null }
  | { kind: 'focus'; category: string; at: Position }
  | { kind: 'categoryNote'; category: string; from: 'list' | 'focusEnd' }
  /* No position: `word` is enough to get back, because a deck never reshuffles.
     See `closeWordNote` in the reducer. */
  | {
      kind: 'wordNote'
      category: string
      word: string
      from: 'list' | 'focus'
    }

export type CategoryState = {
  /** Note about the category as a whole. '' means none. */
  note: string
  /** Selected words, held in deck order so a card never reshuffles. */
  selected: readonly string[]
  /** word -> note. Outlives deselection; empty notes are deleted, never stored. */
  notes: Readonly<Record<string, string>>
}

/**
 * Invariants the reducer maintains:
 *   - every `category` named by `view` has an entry in `decks`
 *   - `Position.index` is always within its deck
 *   - `selected` and the keys of `notes` are subsets of their deck
 *   - a list's `reveal`, when set, is a valid index into its deck
 */
export type State = {
  readonly view: View
  readonly decks: Readonly<Record<string, Deck>>
  readonly selections: Readonly<Record<string, CategoryState>>
}

export type Action =
  | { type: 'openCategory'; category: string }
  | { type: 'showList'; category: string }
  | { type: 'showFocus'; category: string; at: Position }
  | { type: 'goHub' }
  | { type: 'nextCard' }
  | { type: 'prevCard' }
  | { type: 'toggleWord'; category: string; word: string }
  | { type: 'setWordNote'; category: string; word: string; text: string }
  | { type: 'openCategoryNote'; category: string; from: 'list' | 'focusEnd' }
  | { type: 'setCategoryNote'; category: string; text: string }
  | { type: 'closeCategoryNote' }
  | {
      type: 'openWordNote'
      category: string
      word: string
      from: 'list' | 'focus'
    }
  | { type: 'closeWordNote' }
  | { type: 'clearAll' }

export type Categories = readonly Category[]
