import type { Categories, State } from './types'

export type CardWord = { word: string; hasNote: boolean }

export type HubCard = {
  category: string
  /* The same half the category's pill sat in before it was picked. A card is a
     picked category, so it has to keep saying which half it belongs to — the
     cards are one stack with no gap and no heading between the two kinds, so
     unlike the clouds there is nothing else on the screen that says it. */
  kind: 'met' | 'unmet'
  hasNote: boolean
  /**
   * The category's own note. Carried as well as `hasNote` because a card with
   * no picked words has nothing else to show, and a card whose only reason to
   * exist is a note should show the note.
   */
  note: string
  words: readonly CardWord[]
}

export type PillGroup = {
  kind: 'met' | 'unmet'
  names: readonly string[]
}

/**
 * Whether each word in the deck is selected, in deck order — one entry per
 * card, the one on screen included. The progress bar draws a segment apiece.
 *
 * This is the live selection, not a record of what was answered. The walk here
 * runs both ways: you can page back, jump in from the list, and take a word
 * off again with "Not this". So a segment lights and goes out with the word it
 * stands for, whichever card you happen to be standing on.
 */
export type DeckMarks = readonly boolean[]

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
      chosen: DeckMarks
      word: string
      definition: string
      selected: boolean
      note: string
    }
  | {
      kind: 'focusEnd'
      category: string
      total: number
      chosen: DeckMarks
      // The same shape the hub card lists, so the end card can mark a word that
      // carries a note the same way — this is the other place the selection is
      // read back as a run of words.
      words: readonly CardWord[]
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

    /* A card for anything that holds something, which is not the same as
       anything with a word. A category note outlives the picks it was written
       beside — one tap must not be able to lose a paragraph — so a category
       carrying only a note gets a card too, and leaves the cloud below: one you
       have written about should not sit there as though untouched. What is
       written is what is inserted, and this is the screen that says so.

       `total` still counts words and nothing else, so the number on the button
       goes on meaning what it has always meant. Whether there is anything worth
       inserting is a different question, and `Dialog` asks it of the entries. */
    for (const category of categories) {
      const picked = state.selections[category.name]
      if (!picked) continue
      const note = picked.note
      if (picked.selected.length === 0 && note === '') continue
      withCards.add(category.name)
      total += picked.selected.length
      cards.push({
        category: category.name,
        kind: category.kind,
        hasNote: note !== '',
        note,
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
  /* Read off the deck rather than accumulated as you walk, so the closing card
     and every card behind you draw the same rule. See `DeckMarks`. */
  const chosen = deck.map((word) => selected.includes(word))

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
          chosen,
          words: selected.map((word) => ({
            word,
            hasNote: (notes[word] ?? '') !== '',
          })),
          note,
          count: selected.length,
        }
      }
      return {
        kind: 'focusCard',
        category: category.name,
        position: view.at.index + 1,
        total: deck.length,
        chosen,
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
