import { oneLine } from "./entries";
import type { Entry } from "./entries";
import type { Categories } from "./types";

/**
 * The form a name is matched in. Case and spacing in a note belong to whoever
 * typed them: `Irate` at the start of a sentence is still `irate`, and a note
 * that has been through a formatter is still the note. Nothing else is
 * forgiven — a word either is in the inventory or is not.
 */
function key(text: string): string {
  return text.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
}

/** One category as the index holds it. */
type Indexed = {
  /** The name as the source spells it, which is what a resolved entry gets. */
  name: string;
  /** Every word in it, in source order — what a resolved entry is filtered from. */
  words: readonly string[];
  /** Lookup key to the word as the source spells it. */
  byKey: Map<string, string>;
};

/** Keyed by `key(name)`, and in the inventory's own order, which `Map` keeps. */
type Index = Map<string, Indexed>;

/* Built once per inventory rather than once per block. A note holding a dozen
   blocks resolves each of them on every open, and the inventory is 25
   categories and 200-odd words that never change while the app is running. */
const indexes = new WeakMap<Categories, Index>();

function indexFor(categories: Categories): Index {
  const known = indexes.get(categories);
  if (known) return known;

  const index: Index = new Map(
    categories.map((category) => [
      key(category.name),
      {
        name: category.name,
        words: category.words.map((entry) => entry.word),
        byKey: new Map(
          category.words.map((entry) => [key(entry.word), entry.word]),
        ),
      },
    ]),
  );
  indexes.set(categories, index);
  return index;
}

/**
 * A parsed block read back as picks a modal can be opened on, or null when it
 * cannot be — which is the whole of the validation the `Edit…` item needs.
 *
 * Takes `parseBody`'s result, null and all, so a caller has one thing to check
 * rather than two: a body whose shape is wrong and a body whose words are wrong
 * both mean the same to whoever asked to edit it.
 *
 * All or nothing on purpose. A block half of which resolves is a block someone
 * has typed into, and guessing which half they meant is worse than saying it
 * cannot be read — so an unknown word, an unknown category, a word under a
 * category that does not hold it, the same category on two bullets, a note on a
 * word that was not picked, and two notes on one word all come to one answer.
 *
 * What comes back is canonical: words respelled as the source spells them and
 * in its order, notes in that order too, categories in the inventory's. Both
 * doors into this format — written from the picker, read back from the note —
 * therefore produce the same text for the same picks, which is what makes *an
 * edit that changes nothing writes back the text it opened* true with no
 * qualifier attached.
 */
export function resolve(
  entries: readonly Entry[] | null,
  categories: Categories,
): Entry[] | null {
  if (!entries || entries.length === 0) return null;

  const index = indexFor(categories);
  const seen = new Set<string>();
  const resolved: Entry[] = [];

  for (const entry of entries) {
    const category = index.get(key(entry.category));
    if (!category) return null;
    // Two bullets naming one category leave no single answer to seed the
    // screens with, and merging them would rewrite text nobody asked us to
    // touch.
    if (seen.has(category.name)) return null;
    seen.add(category.name);

    const wanted = new Set<string>();
    for (const word of entry.words) {
      const found = category.byKey.get(key(word));
      if (!found) return null;
      wanted.add(found);
    }

    const written = new Map<string, string>();
    for (const note of entry.notes) {
      const found = category.byKey.get(key(note.word));
      // The same answer an unknown word in the list gets, for the same reason.
      if (!found) return null;
      /* A note on a word that was not picked cannot have been written by the
         picker — `entriesFrom` drops those on the way out — so it is a block
         someone has edited by hand, and guessing what they meant is worse than
         saying it cannot be read. */
      if (!wanted.has(found)) return null;
      // Two notes on one word leave no single answer to seed the drawer with.
      if (written.has(found)) return null;
      const text = oneLine(note.text);
      // A blank note is the delete, everywhere. Dropping it guesses nothing.
      if (text) written.set(found, text);
    }

    /* Source order and no duplicates — the same normalising `entriesFrom` does
       on the way out. Done here so a word written twice by hand cannot turn
       into two picks. */
    const words = category.words.filter((word) => wanted.has(word));
    const note = oneLine(entry.note);

    /* A category with neither words nor a note is not something the serializer
       can write, so reading one back would let a save that changed nothing
       silently delete a line somebody had typed. This is the one rejection that
       is about the round trip rather than about the inventory. */
    if (words.length === 0 && note === "") return null;

    resolved.push({
      category: category.name,
      note,
      words,
      // In the category's own order too, so a block written back matches the
      // one that was read whatever order the notes were typed in.
      notes: category.words
        .filter((word) => written.has(word))
        .map((word) => ({ word, text: written.get(word)! })),
    });
  }

  /* And the categories themselves, for the same reason: the note is written in
     inventory order, so a block whose bullets were reordered by hand still
     saves back as the one canonical text rather than as a third arrangement. */
  const order = new Map(
    [...index.values()].map((category, at) => [category.name, at]),
  );
  return resolved.sort(
    (a, b) => order.get(a.category)! - order.get(b.category)!,
  );
}
