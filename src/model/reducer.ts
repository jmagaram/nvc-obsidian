import type {
  Action,
  Categories,
  CategoryState,
  Deck,
  Position,
  State,
} from './types'

const EMPTY: CategoryState = { note: '', selected: [], notes: {} }

function shuffle(words: readonly string[], random: () => number): Deck {
  const out = [...words]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Every deck is shuffled here rather than lazily on first open, which keeps the
 * reducer pure and total. Pass a seeded `random` to make a run reproducible.
 */
export function createInitialState(
  categories: Categories,
  random: () => number = Math.random,
): State {
  const decks: Record<string, Deck> = {}
  for (const category of categories) {
    decks[category.name] = shuffle(
      category.feelings.map((f) => f.word),
      random,
    )
  }
  return { view: { kind: 'hub' }, decks, selections: {} }
}

function categoryState(state: State, category: string): CategoryState {
  return state.selections[category] ?? EMPTY
}

function withCategory(
  state: State,
  category: string,
  next: CategoryState,
): State {
  return { ...state, selections: { ...state.selections, [category]: next } }
}

/** Keeps `selected` in deck order, so adding a word never reorders a card. */
function toggle(current: CategoryState, deck: Deck, word: string): CategoryState {
  const selected = current.selected.includes(word)
    ? current.selected.filter((w) => w !== word)
    : deck.filter((w) => w === word || current.selected.includes(w))
  return { ...current, selected }
}

function setNote(
  current: CategoryState,
  word: string,
  text: string,
): CategoryState {
  const notes = { ...current.notes }
  if (text === '') delete notes[word]
  else notes[word] = text
  return { ...current, notes }
}

function step(deck: Deck, at: Position, delta: 1 | -1): Position {
  const index = at.kind === 'end' ? deck.length : at.index
  const next = index + delta
  if (next < 0) return at
  if (next >= deck.length) return { kind: 'end' }
  return { kind: 'card', index: next }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'openCategory':
      if (!(action.category in state.decks)) return state
      return {
        ...state,
        view: { kind: 'list', category: action.category, reveal: null },
      }

    // Coming back from the deck should land on the word you were looking at,
    // which is not the same as the scroll position you left the list at.
    case 'showList': {
      const deck = state.decks[action.category]
      if (!deck) return state
      const from = state.view
      const reveal =
        from.kind === 'focus' && from.category === action.category
          ? from.at.kind === 'card'
            ? from.at.index
            : deck.length - 1
          : null
      return {
        ...state,
        view: { kind: 'list', category: action.category, reveal },
      }
    }

    case 'showFocus': {
      const deck = state.decks[action.category]
      if (!deck) return state
      const at =
        action.at.kind === 'card' && action.at.index >= deck.length
          ? ({ kind: 'end' } as const)
          : action.at
      return { ...state, view: { kind: 'focus', category: action.category, at } }
    }

    case 'goHub':
      return { ...state, view: { kind: 'hub' } }

    case 'nextCard':
    case 'prevCard': {
      if (state.view.kind !== 'focus') return state
      const deck = state.decks[state.view.category]
      const at = step(deck, state.view.at, action.type === 'nextCard' ? 1 : -1)
      return { ...state, view: { ...state.view, at } }
    }

    case 'toggleFeeling': {
      const deck = state.decks[action.category]
      if (!deck?.includes(action.word)) return state
      const next = toggle(categoryState(state, action.category), deck, action.word)
      return withCategory(state, action.category, next)
    }

    case 'setFeelingNote': {
      const deck = state.decks[action.category]
      if (!deck?.includes(action.word)) return state
      const next = setNote(
        categoryState(state, action.category),
        action.word,
        action.text,
      )
      return withCategory(state, action.category, next)
    }

    case 'openCategoryNote':
      if (!(action.category in state.decks)) return state
      return {
        ...state,
        view: {
          kind: 'categoryNote',
          category: action.category,
          from: action.from,
        },
      }

    case 'setCategoryNote': {
      if (!(action.category in state.decks)) return state
      const current = categoryState(state, action.category)
      return withCategory(state, action.category, { ...current, note: action.text })
    }

    case 'closeCategoryNote': {
      if (state.view.kind !== 'categoryNote') return state
      const { category, from } = state.view
      const view: State['view'] =
        from === 'list'
          ? { kind: 'list', category, reveal: null }
          : { kind: 'focus', category, at: { kind: 'end' } }
      return { ...state, view }
    }

    case 'clearAll':
      return { ...state, selections: {} }
  }
}
