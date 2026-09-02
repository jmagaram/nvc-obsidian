import type { Categories, CategoryState, State } from './types'

/** A few words of someone's own about one picked word. */
export type WordNote = { word: string; text: string }

/**
 * One category's worth of picks, as a block in a note holds them.
 *
 * The same type on both sides of the parse. `parseBody` fills these with
 * whatever was typed and `resolve` hands back the same shape respelled in the
 * inventory's own words and order, which is what lets a block that reads but
 * does not resolve still be drawn.
 *
 * `note` and `notes` are always present and empty rather than absent. There is
 * nothing a missing note could mean that an empty one does not, and every
 * reader of this shape would otherwise have to say so again.
 */
export type Entry = {
  category: string
  /** The category's own note — one line. '' means none. */
  note: string
  words: readonly string[]
  /** A note per word, in the order `words` lists them. */
  notes: readonly WordNote[]
}

/**
 * The five ways the same picks can be laid out.
 *
 * Here rather than beside the component that draws them, because
 * `toPlainMarkdown` needs it and the model may not import a component. The
 * dependency runs model → ui and never back.
 */
export type Layout = 'gloss' | 'column' | 'sentence' | 'inline' | 'table'

/**
 * The same five, as a list.
 *
 * Beside the union rather than beside the fence languages generated from it, so
 * a layout added to the type and never given a language to be written as is a
 * mistake that cannot be made. The block menu keeps a list of its own, because
 * it adds a title and an icon to each and puts them in the order it shows them.
 */
export const LAYOUTS: readonly Layout[] = [
  'gloss',
  'column',
  'sentence',
  'inline',
  'table',
]

/**
 * A note as it is stored: one line, always.
 *
 * The box someone writes in is a `textarea` and text pasted into it may arrive
 * with newlines, so the collapse happens on the way out rather than being left
 * to the keyboard. One line is what lets a note be a bullet — nothing else in
 * the grammar has to hold a line break, and a note that did would need a
 * continuation rule in every reader of the format.
 */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * What the dialog holds, as a note holds it.
 *
 * Two orders are fixed here and both matter. Words come out in the inventory's
 * own order rather than `selected`'s, which is deck order — shuffled once per
 * dialog, so writing it raw would give a different line every session and make
 * a save that changed nothing rewrite the text it opened. Categories come out
 * in inventory order for the same reason and one more: `selections` is a record
 * whose key order is an accident of which category was opened first, and
 * nothing in this model has ever leaned on it. The hub lists its cards in
 * inventory order too, so the note reads in the order of the screen it was
 * written from.
 *
 * Notes are filtered over `words` rather than over their own keys, which is
 * what keeps a note that is only hidden from reaching the file: a note outlives
 * the deselection of the word it is about (see `CategoryState`), and writing
 * one down would be writing down a thought about a word someone had said did
 * not apply.
 *
 * A category with no words and no note is dropped. A bullet saying nothing is
 * worse than no bullet.
 */
export function entriesFrom(state: State, categories: Categories): Entry[] {
  const entries: Entry[] = []

  for (const category of categories) {
    const picked = state.selections[category.name]
    if (!picked) continue

    const words = category.words
      .map((entry) => entry.word)
      .filter((word) => picked.selected.includes(word))
    const note = oneLine(picked.note)
    if (words.length === 0 && note === '') continue

    const notes: WordNote[] = []
    for (const word of words) {
      const text = oneLine(picked.notes[word] ?? '')
      // A blank note is the delete, everywhere. Storing it guesses nothing.
      if (text !== '') notes.push({ word, text })
    }

    entries.push({ category: category.name, note, words, notes })
  }

  return entries
}

/**
 * A block's picks laid back into the decks they will be shown in.
 *
 * `selected` goes back into *deck* order, which is the invariant every screen
 * downstream reads by — see `Deck` in types.ts and `toggle` in reducer.ts. The
 * file's order is the inventory's, the dialog's is the shuffle's, and this is
 * the one place the two are reconciled.
 *
 * A category with no deck is skipped rather than trusted, which keeps this
 * total. `resolve` has already guaranteed there is one; this is what makes the
 * guarantee unnecessary to remember.
 */
export function selectionsFrom(
  entries: readonly Entry[],
  decks: State['decks'],
): State['selections'] {
  const selections: Record<string, CategoryState> = {}

  for (const entry of entries) {
    const deck = decks[entry.category]
    if (!deck) continue

    const wanted = new Set(entry.words)
    const notes: Record<string, string> = {}
    for (const note of entry.notes) notes[note.word] = note.text

    selections[entry.category] = {
      note: entry.note,
      selected: deck.filter((word) => wanted.has(word)),
      notes,
    }
  }

  return selections
}
