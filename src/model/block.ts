import { INVENTORIES } from "../data/inventory";
import type { Inventory } from "../data/inventory";
import { LAYOUTS, oneLine } from "./entries";
import type { Entry, Layout, WordNote } from "./entries";

/** The language a block gets written as when it holds this and is drawn so. */
export function languageFor(inventory: Inventory, layout: Layout): string {
  return `nvc-${inventory.id}-${layout}`;
}

/** Everything a fence language says: which list is inside, and how to draw it. */
export type BlockLanguage = { inventory: Inventory; layout: Layout };

/**
 * Every language this plugin draws, and what each one means.
 *
 * Two things ride on the language because nothing else can carry them. Obsidian
 * hands a code block processor the block's body and nothing else — the info
 * string never reaches it — so a fence has no room for an argument, and the
 * body is deliberately plain markdown with no marker in it. The language is
 * therefore the whole of a block's identity: drop it and `- Connection: trust`
 * and `- Angry: irate` are the same kind of thing.
 *
 * `nvc-feelings` rather than plain `nvc`, because the sibling project already
 * owns `nvc`, `nvc-list`, `nvc-gloss`, `nvc-column`, `nvc-sentence`,
 * `nvc-inline` and `nvc-table`, and two processors registered on one language
 * in one vault is a race with no visible result. The prefix says which family
 * the block belongs to; the word after it says which inventory, which is the
 * only part that could ever have collided — and now that there are two lists,
 * the part doing the work.
 *
 * Generated rather than listed, so a list added to `INVENTORIES` cannot arrive
 * with five of its six languages registered.
 *
 * There is no alias here for an older name and there never will be one: this
 * plugin has never written a block, so unlike the sibling there is nothing
 * already in anybody's vault to keep reading.
 */
export const LANGUAGES: ReadonlyMap<string, BlockLanguage> = (() => {
  const languages = new Map<string, BlockLanguage>();
  for (const inventory of INVENTORIES) {
    // Hand-typable, and a synonym for the default. Never written.
    languages.set(`nvc-${inventory.id}`, { inventory, layout: "gloss" });
    for (const layout of LAYOUTS) {
      languages.set(languageFor(inventory, layout), { inventory, layout });
    }
  }
  return languages;
})();

/**
 * The category's own line. It keeps its colon with no words after it, which is
 * what a category carrying only a note looks like — the colon is the thing
 * saying a list belongs here and that this one is empty.
 */
function categoryLine(entry: Entry): string {
  return entry.words.length > 0
    ? `- ${entry.category}: ${entry.words.join(", ")}`
    : `- ${entry.category}:`;
}

/**
 * What goes into the note: one bullet per category with its words inline, and
 * an indented bullet under it for the category's own note and for each word
 * that carries one.
 *
 * **The category's note is a bullet with no word.** A note is addressed by the
 * pair *(category, word)*, which the nesting already carries — a word appears
 * at most once in a category, where the word alone would not settle it, since
 * `surprised` is in both Excited and Disquiet. The category's own note is the
 * same address with the word left off, so an empty label is exactly what it
 * should be written as, and no key or id appears anywhere.
 *
 * It comes first, before the word notes, because it is about the line above it
 * rather than about any of the words below.
 */
export function toBody(entries: readonly Entry[]): string {
  return entries
    .flatMap((entry) => [
      categoryLine(entry),
      ...(entry.note === "" ? [] : [`  - : ${entry.note}`]),
      ...entry.notes.map((note) => `  - ${note.word}: ${note.text}`),
    ])
    .join("\n");
}

/**
 * The same bullets, fenced so the plugin can redraw them.
 *
 * The body is the markdown above and nothing more: with the plugin off, or the
 * note read anywhere but Obsidian, what shows is still the list someone wrote,
 * and it can be edited by hand.
 *
 * Empty in, empty out — but no longer because an empty fence is unreadable. It
 * draws as a placeholder now, so a fence somebody typed by hand is a block
 * waiting to be filled rather than a mistake. The reason is instead that this
 * is the picker's answer, and somebody who picked nothing and pressed Insert
 * asked for nothing: a placeholder is something left *for* you to fill in, not
 * something a run of the picker should leave *behind*.
 */
export function toBlock(
  entries: readonly Entry[],
  inventory: Inventory,
): string {
  const body = toBody(entries);
  return body
    ? `\`\`\`${languageFor(inventory, "gloss")}\n${body}\n\`\`\``
    : "";
}

/** How far into the line the text starts, counting a tab as four. */
function indentOf(line: string): number {
  const lead = /^[ \t]*/.exec(line)![0];
  return lead.replace(/\t/g, "    ").length;
}

/**
 * A bullet, and what sits either side of its first colon.
 *
 * `[^:]*` rather than `[^:]+` is the whole of what admits the category note:
 * with `+` a line reading `- : text` matches nothing at all. Everything that
 * keeps the empty label from being read where it is not meant is a guard in
 * `parseBody` rather than in the pattern.
 */
const BULLET = /^[ \t]*-[ \t]+([^:]*):(.*)$/;

/** A category part way through being read, with its notes still writable. */
type Draft = {
  category: string;
  words: string[];
  /** The category note's box, or null while it has none. */
  note: { text: string } | null;
  notes: WordNote[];
};

/**
 * `toBody` backwards, for a block that is about to be drawn.
 *
 * Tolerant of what a person types and strict about what is written back. A note
 * split over several indented lines is read and joined with a space, because
 * somebody hand-editing the block has no reason to know that a note is supposed
 * to be one line; the next save puts it back as one.
 *
 * Null when any line fails to make sense, rather than a partial result: a block
 * someone has typed into is shown to them verbatim instead of half-swallowed,
 * and quietly dropping a line somebody wrote would be the worst of the three
 * answers.
 */
export function parseBody(source: string): Entry[] | null {
  const lines = source.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return null;

  const drafts: Draft[] = [];
  let base: number | null = null;
  /* The note the next unindented line would continue, whether it is a word's
     or the category's — both are boxes holding a `text`, so one branch serves
     both and neither has to be named again below. */
  let open: { text: string } | null = null;
  let noteIndent = 0;

  for (const line of lines) {
    const indent = indentOf(line);
    const match = BULLET.exec(line);

    if (match && (base === null || indent <= base)) {
      /* A category, and the first one fixes what counts as the outer level.
         An empty label is the note sentinel and means that only indented under
         a category; out here a category has simply not been named, and reading
         it as a note would attach it to nothing. */
      const category = match[1].trim();
      if (category === "") return null;
      if (base === null) base = indent;
      open = null;
      drafts.push({
        category,
        words: match[2]
          .split(",")
          .map((word) => word.trim())
          .filter(Boolean),
        note: null,
        notes: [],
      });
      continue;
    }

    // Anything indented before a category has nothing to belong to.
    if (drafts.length === 0) return null;
    const draft = drafts[drafts.length - 1];

    if (match) {
      const label = match[1].trim();
      const text = match[2].trim();
      noteIndent = indent;

      if (label === "") {
        // A second note about one category leaves no single answer to seed the
        // drawer with, the same as two notes about one word.
        if (draft.note) return null;
        draft.note = { text };
        open = draft.note;
      } else {
        const note = { word: label, text };
        draft.notes.push(note);
        open = note;
      }
      continue;
    }

    // A line that is not a bullet continues the note above it, if it is
    // indented past that note and there is one to continue.
    if (open && indent > noteIndent) {
      open.text = `${open.text} ${line.trim()}`.trim();
      continue;
    }

    return null;
  }

  return drafts.map((draft) => ({
    category: draft.category,
    // A blank note is the delete, everywhere. Dropping it guesses nothing.
    note: draft.note ? oneLine(draft.note.text) : "",
    words: draft.words,
    notes: draft.notes
      .map((note) => ({ word: note.word, text: oneLine(note.text) }))
      .filter((note) => note.text !== ""),
  }));
}

/** A cell's text, with the one character that would split it in two escaped. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

/**
 * The same picks as ordinary markdown, in the layout they are being drawn in —
 * what a block turns into when someone converts it and takes the text back.
 *
 * Built from the parsed entries and never from what is on screen: the commas
 * between words are drawn by CSS, and an empty note cell and a missing one look
 * identical in the DOM.
 *
 * Bold on a category is the only emphasis that survives the trip, and italics
 * on a category note, which is what keeps it from being read as one more word.
 * The empty label it is stored under never appears: that is a storage device,
 * and a reader should not have to meet it.
 */
export function toPlainMarkdown(
  entries: readonly Entry[],
  layout: Layout,
): string {
  if (layout === "inline") {
    /* This layout drops the category and both kinds of note, which is what it
       is for — pasting into a sentence somebody is already writing. But it
       never drops the last thing in the block: a block that is only category
       notes would otherwise convert to an empty line, which reads as broken
       rather than as deliberate. */
    const words = entries.flatMap((entry) => entry.words);
    if (words.length > 0) return words.join(", ");
    return entries
      .map((entry) => entry.note)
      .filter(Boolean)
      .join("; ");
  }

  if (layout === "sentence") {
    /* Prose, and a category note is the most prose-like thing in the block, so
       it goes into the sentence rather than into the count. Parenthesised
       beside the words, and standing in their place when there are none, which
       is what keeps the colon meaning something. */
    const said = entries
      .map((entry) => {
        const parts: string[] = [];
        if (entry.words.length > 0) parts.push(entry.words.join(", "));
        if (entry.note !== "") {
          parts.push(
            entry.words.length > 0 ? `*(${entry.note})*` : `*${entry.note}*`,
          );
        }
        return `**${entry.category}**: ${parts.join(" ")}.`;
      })
      .join(" ");

    const notes = entries.reduce((sum, entry) => sum + entry.notes.length, 0);
    return notes > 0
      ? `${said} *${notes} ${notes === 1 ? "note" : "notes"}*`
      : said;
  }

  if (layout === "table") {
    /* A row per word with the category repeated, because a pipe table has
       neither a row span nor an indent — and because repeating it is what makes
       the result a grid someone can add a column to, which is most of the
       reason to convert a block at all.

       A category note is a row with an empty Word cell, first among its
       category's rows: an empty cell there says precisely that this is about
       the category and not about a word, and it needs no legend.

       One rule decides the header, rather than one per column: a column that is
       empty for every row is left out. */
    const worded = entries.some((entry) => entry.words.length > 0);
    const noted = entries.some(
      (entry) => entry.note !== "" || entry.notes.length > 0,
    );

    const columns = [
      "Category",
      ...(worded ? ["Word"] : []),
      ...(noted ? ["Note"] : []),
    ];
    const head = [
      `| ${columns.join(" | ")} |`,
      `| ${columns.map(() => "---").join(" | ")} |`,
    ];

    const row = (category: string, word: string, note: string) => {
      const cells = [cell(category), ...(worded ? [cell(word)] : [])];
      if (noted) cells.push(cell(note));
      return `| ${cells.join(" | ")} |`;
    };

    const rows = entries.flatMap((entry) => {
      const written = new Map(
        entry.notes.map((note) => [note.word, note.text]),
      );
      return [
        ...(entry.note === "" ? [] : [row(entry.category, "", entry.note)]),
        ...entry.words.map((word) =>
          row(entry.category, word, written.get(word) ?? ""),
        ),
      ];
    });

    return [...head, ...rows].join("\n");
  }

  if (layout === "column") {
    // One bullet per word whether or not it carries a note, which is the whole
    // of what this layout says. The category note keeps its italics here for a
    // reason it does not have elsewhere: every other bullet in the group is a
    // word, and without them this one would read as another.
    return entries
      .flatMap((entry) => {
        const written = new Map(
          entry.notes.map((note) => [note.word, note.text]),
        );
        return [
          `- **${entry.category}**`,
          ...(entry.note === "" ? [] : [`  - *${entry.note}*`]),
          ...entry.words.map((word) => {
            const note = written.get(word);
            return note ? `  - ${word}: ${note}` : `  - ${word}`;
          }),
        ];
      })
      .join("\n");
  }

  // gloss: the stored shape, with the category bolded. A category holding only
  // a note drops its colon — a dangling `**Afraid**:` reads as a line that
  // broke rather than as a list that is empty.
  return entries
    .flatMap((entry) => [
      entry.words.length > 0
        ? `- **${entry.category}**: ${entry.words.join(", ")}`
        : `- **${entry.category}**`,
      ...(entry.note === "" ? [] : [`  - *${entry.note}*`]),
      ...entry.notes.map((note) => `  - ${note.word}: ${note.text}`),
    ])
    .join("\n");
}
