import type { Categories, State } from './types'

export type CardWord = { word: string; hasNote: boolean }

export type HubCard = {
  category: string
  hasNote: boolean
  words: readonly CardWord[]
}

export type PillGroup = {
  kind: 'met' | 'unmet'
  names: readonly string[]
}

export type ListRow = {
  word: string
  definition: string
  selected: boolean
  note: string
}

/**
 * What a component renders. Every variant carries exactly its own fields, so no
 * component ever tests for a value that cannot be there. Note that the end card
 * is a `Screen` variant but not a `View` variant: in state it is just a
 * `Position`, and the split happens here so the focus card is guaranteed a word.
 */
export type Screen =
  | {
      kind: 'hub'
      cards: readonly HubCard[]
      groups: readonly PillGroup[]
      total: number
    }
  | {
      kind: 'list'
      category: string
      note: string
      rows: readonly ListRow[]
      count: number
      reveal: number | null
    }
  | {
      kind: 'focusCard'
      category: string
      position: number
      total: number
      word: string
      definition: string
      selected: boolean
      note: string
    }
  | {
      kind: 'focusEnd'
      category: string
      total: number
      words: readonly string[]
      note: string
      count: number
    }
  | {
      kind: 'categoryNote'
      category: string
      text: string
      from: 'list' | 'focusEnd'
    }
  | {
      kind: 'feelingNote'
      category: string
      word: string
      text: string
    }

export function toScreen(state: State, categories: Categories): Screen {
  const view = state.view

  if (view.kind === 'hub') {
    const cards: HubCard[] = []
    const withCards = new Set<string>()
    let total = 0

    for (const category of categories) {
      const picked = state.selections[category.name]
      if (!picked || picked.selected.length === 0) continue
      withCards.add(category.name)
      total += picked.selected.length
      cards.push({
        category: category.name,
        hasNote: picked.note !== '',
        words: picked.selected.map((word) => ({
          word,
          hasNote: (picked.notes[word] ?? '') !== '',
        })),
      })
    }

    // Unmet first: it is both the longer list and the one reached for most, so
    // it is the half worth putting above the fold.
    const groups: PillGroup[] = (['unmet', 'met'] as const).map((kind) => ({
      kind,
      names: categories
        .filter((c) => c.kind === kind && !withCards.has(c.name))
        .map((c) => c.name),
    }))

    return { kind: 'hub', cards, groups, total }
  }

  const category = categories.find((c) => c.name === view.category)
  const deck = state.decks[view.category]
  // Unreachable while the reducer holds its invariants; keeps the fn total.
  if (!category || !deck) return { kind: 'hub', cards: [], groups: [], total: 0 }

  const picked = state.selections[view.category]
  const note = picked?.note ?? ''
  const selected = picked?.selected ?? []
  const notes = picked?.notes ?? {}
  const define = (word: string) =>
    category.feelings.find((f) => f.word === word)?.definition ?? ''

  switch (view.kind) {
    case 'list':
      return {
        kind: 'list',
        category: category.name,
        note,
        count: selected.length,
        reveal: view.reveal,
        rows: deck.map((word) => ({
          word,
          definition: define(word),
          selected: selected.includes(word),
          note: notes[word] ?? '',
        })),
      }

    case 'focus':
      if (view.at.kind === 'end') {
        return {
          kind: 'focusEnd',
          category: category.name,
          total: deck.length,
          words: selected,
          note,
          count: selected.length,
        }
      }
      return {
        kind: 'focusCard',
        category: category.name,
        position: view.at.index + 1,
        total: deck.length,
        word: deck[view.at.index],
        definition: define(deck[view.at.index]),
        selected: selected.includes(deck[view.at.index]),
        note: notes[deck[view.at.index]] ?? '',
      }

    case 'categoryNote':
      return {
        kind: 'categoryNote',
        category: category.name,
        text: note,
        from: view.from,
      }

    case 'feelingNote':
      return {
        kind: 'feelingNote',
        category: category.name,
        word: view.word,
        text: notes[view.word] ?? '',
      }
  }
}
