import type { Categories, CategoryState, State } from "./types";

/** A few words of someone's own about one picked word. */
export type WordNote = { word: string; text: string };

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
  category: string;
  /**
   * Which side of the feelings list's own split this category sits on, or
   * absent where there is no split to sit on.
   *
   * Derived and never stored: it is a property of the *category*, so the block
   * in the note says nothing about it and `toBody` writes nothing for it. It is
   * filled in by whichever door the entry came through — `entriesFrom` from the
   * inventory the picker was running on, `resolve` from the one the block was
   * read against — and stays absent for the needs list, and for a block that
   * parsed but did not resolve, where there is nothing to derive it from.
   */
  kind?: Polarity;
  /** The category's own note — one line. '' means none. */
  note: string;
  words: readonly string[];
  /** A note per word, in the order `words` lists them. */
  notes: readonly WordNote[];
};

/**
 * What a block's polarity divider is drawn between.
 *
 * The feelings list's own split between "feelings when needs are satisfied" and
 * "feelings when needs are not satisfied", carried on an entry so that the
 * renderer and the markdown converter can both find it. Needs have no such
 * split, and neither does a block that parsed but did not resolve — see
 * `Entry.kind`.
 */
export type Polarity = "met" | "unmet";

/**
 * The five ways the same picks can be laid out.
 *
 * Here rather than beside the component that draws them, because
 * `toPlainMarkdown` needs it and the model may not import a component. The
 * dependency runs model → ui and never back.
 *
 * `aligned`, `stacked` and `auto` are three names for one arrangement seen
 * three ways — a label column and a words column — and they convert to
 * identical markdown, because markdown has no label column to express. `auto`
 * is the only one of the three that measures anything; the other two exist for
 * pinning a block whose automatic answer somebody dislikes.
 */
export type Layout = "aligned" | "stacked" | "auto" | "column" | "inline";

/**
 * The same five, as a list.
 *
 * Beside the union rather than beside the fence languages generated from it, so
 * a layout added to the type and never given a language to be written as is a
 * mistake that cannot be made. The block menu keeps a list of its own, because
 * it adds a title and an icon to each and puts them in the order it shows them.
 */
export const LAYOUTS: readonly Layout[] = [
  "aligned",
  "stacked",
  "auto",
  "column",
  "inline",
];

/**
 * The layout a block gets when nobody has said otherwise.
 *
 * Named once, here, because three things reach for it: the fence the picker
 * writes, the language a bare `nvc-feelings` stands for, and the gallery's
 * first render.
 */
export const DEFAULT_LAYOUT: Layout = "auto";

/**
 * The entries split into their polarity groups, in the order each group first
 * appears in the block.
 *
 * One group for a list that does not divide, and one for a block that parsed
 * but did not resolve — both arrive with `kind` absent, and absent is a group
 * like any other, so neither needs a branch anywhere downstream. Two groups is
 * the only other answer a resolved feelings block can give, which is what makes
 * "a single hairline rule" true without this function having to promise it.
 *
 * Order is taken from the block rather than fixed here. What the block holds is
 * already canonical — `resolve` sorts it into the inventory's order — so
 * choosing an order again in the renderer would be a second opinion about the
 * same question.
 */
export function groupsIn(entries: readonly Entry[]): Entry[][] {
  const order: (Polarity | undefined)[] = [];
  const groups = new Map<Polarity | undefined, Entry[]>();

  for (const entry of entries) {
    let group = groups.get(entry.kind);
    if (!group) {
      group = [];
      groups.set(entry.kind, group);
      order.push(entry.kind);
    }
    group.push(entry);
  }

  return order.map((kind) => groups.get(kind)!);
}

/**
 * Whether a word note in this category has to say which word it is about.
 *
 * It usually does: a category shows its words in one run and its notes under
 * them, and nothing but the name says which of `grief, lonely` the line
 * belongs to. A category holding a single word has no such question — the name
 * repeats the one word already sitting on the line above, and `resentful`
 * under `resentful` reads as the block having said something twice rather than
 * as a label.
 *
 * The category's own note is what keeps this from being simply
 * `words.length > 1`. That note is italic and unlabelled, and *unlabelled* is
 * the whole of how it is told from a word's — so where both are present, a
 * word note with its name taken off is a second category note, which is a
 * thing a block cannot even hold. One word and a note of its own is the case
 * where the repetition is doing work, and it keeps the name.
 *
 * In the model rather than beside the renderer because the markdown converter
 * asks it too, and the block and the text it converts to have to agree.
 */
export function namesItsWord(entry: Entry): boolean {
  return entry.words.length > 1 || entry.note !== "";
}

export function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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
  const entries: Entry[] = [];

  for (const category of categories) {
    const picked = state.selections[category.name];
    if (!picked) continue;

    const words = category.words
      .map((entry) => entry.word)
      .filter((word) => picked.selected.includes(word));
    const note = oneLine(picked.note);
    if (words.length === 0 && note === "") continue;

    const notes: WordNote[] = [];
    for (const word of words) {
      const text = oneLine(picked.notes[word] ?? "");
      // A blank note is the delete, everywhere. Storing it guesses nothing.
      if (text !== "") notes.push({ word, text });
    }

    entries.push({
      category: category.name,
      kind: category.kind,
      note,
      words,
      notes,
    });
  }

  return entries;
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
  decks: State["decks"],
): State["selections"] {
  const selections: Record<string, CategoryState> = {};

  for (const entry of entries) {
    const deck = decks[entry.category];
    if (!deck) continue;

    const wanted = new Set(entry.words);
    const notes: Record<string, string> = {};
    for (const note of entry.notes) notes[note.word] = note.text;

    selections[entry.category] = {
      note: entry.note,
      selected: deck.filter((word) => wanted.has(word)),
      notes,
    };
  }

  return selections;
}
