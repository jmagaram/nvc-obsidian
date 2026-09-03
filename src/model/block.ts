import { INVENTORIES } from "../data/inventory";
import type { Inventory } from "../data/inventory";
import {
  DEFAULT_LAYOUT,
  groupsIn,
  LAYOUTS,
  namesItsWord,
  oneLine,
} from "./entries";
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
 * There is no alias here for an older name and there never will be one. Not for
 * one of the sibling's, and not for one of this plugin's own: the views this
 * file used to name — `gloss`, `sentence`, `table` — are gone rather than
 * retired, and nothing reads them. What that costs is exact and was accepted: a
 * fence under one of those names is not a block any more, and Obsidian draws it
 * as the code it looks like, body and all. The body is plain markdown by
 * design, so what shows is still the list somebody wrote.
 */
export const LANGUAGES: ReadonlyMap<string, BlockLanguage> = (() => {
  const languages = new Map<string, BlockLanguage>();
  for (const inventory of INVENTORIES) {
    // Hand-typable, and a synonym for the default. Never written.
    languages.set(`nvc-${inventory.id}`, { inventory, layout: DEFAULT_LAYOUT });
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
    ? `\`\`\`${languageFor(inventory, DEFAULT_LAYOUT)}\n${body}\n\`\`\``
    : "";
}

/**
 * A block with no body, for a scaffold to leave in a note.
 *
 * `toBlock`'s counterpart rather than its contradiction. That one is the
 * picker's answer, and a picker given nothing has nothing to write; this one is
 * a template's answer, and the empty fence *is* what was asked for. It draws as
 * a control that opens the picker on whichever list its language names, which
 * is the whole of what a template section needs to say.
 *
 * The canonical language and not the bare `nvc-feelings` synonym, so everything
 * this plugin writes is spelled one way and the note reads the same however the
 * block got there. The synonym stays what `LANGUAGES` says it is: hand-typable,
 * and never written.
 *
 * `DEFAULT_LAYOUT` and not a view named here, for the reason `toBlock` above
 * has it: the views are not a fixed set, and one written into this file by name
 * is one that has to be found again when the set changes. It already caught
 * this function once — it said `gloss`, which stopped being a view while this
 * was on a branch, and the merge that brought the two together was clean.
 */
export function toEmptyBlock(inventory: Inventory): string {
  return `\`\`\`${languageFor(inventory, DEFAULT_LAYOUT)}\n\`\`\``;
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

/**
 * A note, made safe to set loose in somebody's note.
 *
 * The words never need this — they come out of a fixed inventory and hold
 * nothing markdown reads — but a note is free text, and the converter wraps
 * every one of them in italics or drops it after a label. An asterisk or an
 * underscore inside one closes the emphasis early and re-opens it around the
 * wrong half of the sentence; a backtick starts a code span that swallows the
 * rest of the line; a bracket pair becomes a link to nothing. None of these
 * fail loudly. They just quietly say something else.
 *
 * The leading `#`, `-`, `>` and `|` are escaped for a hazard the others do not
 * have: they only mean anything at the start of a line, and nothing here emits
 * a note at the start of one today. It is escaped anyway, because "no note ever
 * starts a line" is a property of five call sites rather than of this function,
 * and a sixth would break it silently.
 *
 * The collapse to one line comes first. A newline inside a note would end the
 * bullet it is part of and leave the rest as a paragraph of its own.
 */
function escape(text: string): string {
  return oneLine(text)
    .replace(/([\\`*_[\]])/g, "\\$1")
    .replace(/^([#\->|])/, "\\$1");
}

/**
 * What separates the two polarity groups once the block is plain text.
 *
 * `***` and not `---`, which is the same rule drawn differently and is a trap
 * here: a line of text directly above `---` is not a rule at all, it is a setext
 * heading, and the line directly above this one is a category line every time
 * the block ends its first group with one. `***` has no such reading.
 *
 * Blank lines either side because a thematic break may not interrupt a list —
 * without them the `- **Angry**` above it and the `***` are one paragraph's
 * worth of list and the rule never appears.
 */
const RULE = "\n\n***\n\n";

/** Everything said about one category, as the sublist under its own bullet. */
function notesUnder(entry: Entry): string[] {
  return [
    /* The category's own note first, because it is about the line above it
       rather than about any of the words below — the same order the block is
       drawn in and the same order it is stored in.

       Italic and unlabelled. Every other bullet in this sublist names a word
       first, so without the italics this one reads as one more word; with them,
       the absence of a label reads as deliberate. */
    ...(entry.note === "" ? [] : [`    - *${escape(entry.note)}*`]),
    /* A word note is its word upright and the note italic beside it, with no
       colon between. That is exactly how the block draws it, and the two voices
       — the inventory's word and somebody's own sentence — are what separate the
       halves, so a colon would be a third thing doing a job already done.

       And the word comes off exactly where the block takes it off, which is
       what keeps "exactly how the block draws it" true. `namesItsWord` is
       false only when the category has one word and no note of its own, so the
       unlabelled bullet above is still the only one in the sublist. */
    ...entry.notes.map((note) =>
      namesItsWord(entry)
        ? `    - ${note.word} *${escape(note.text)}*`
        : `    - *${escape(note.text)}*`,
    ),
  ];
}

/**
 * A category as one list item with its words inline, and its notes indented
 * under it.
 *
 * **The category must be a list item.** A plain paragraph line following a
 * bulleted list is absorbed into the last item as a lazy continuation, so a
 * category line that came after a notes sublist would silently become part of
 * the last note. A bullet of its own is the only form that holds under every
 * combination of Obsidian's line-break settings, and it survives being
 * reformatted by anything else.
 *
 * Four spaces of indent for the sublist, which is the one width every reader
 * agrees on.
 *
 * A category holding only a note drops its colon — a dangling `**Afraid**:`
 * reads as a line that broke rather than as a list that is empty.
 */
function grouped(entry: Entry): string[] {
  return [
    entry.words.length > 0
      ? `- **${entry.category}**: ${entry.words.join(", ")}`
      : `- **${entry.category}**`,
    ...notesUnder(entry),
  ];
}

/**
 * The same category with a bullet per word instead of a line of them, which is
 * the whole of what the column layout says.
 *
 * A word's note stays on the word's own line rather than under it, so a word
 * nobody wrote about costs one line and not two — which is the reason to choose
 * this layout at all.
 */
function perWord(entry: Entry): string[] {
  const written = new Map(entry.notes.map((note) => [note.word, note.text]));
  return [
    `- **${entry.category}**`,
    ...(entry.note === "" ? [] : [`    - *${escape(entry.note)}*`]),
    ...entry.words.map((word) => {
      const note = written.get(word);
      return note ? `    - ${word} *${escape(note)}*` : `    - ${word}`;
    }),
  ];
}

/**
 * The words on one line, and everything anybody wrote underneath them.
 *
 * This is the layout that drops the categories and the divider on screen, and
 * it is the one place where converting could have lost something — so it does
 * not. The notes come back as their own block, which is what makes *no view
 * converts lossily* true and is why the command needs no warning attached.
 *
 * A blank line between the two keeps the run of words scannable and makes the
 * notes easy to select and delete in one gesture for anybody who wanted only
 * the words after all.
 *
 * Two trailing spaces are markdown's line break, and every note but the last
 * carries them, so the block stays a list of separate lines rather than
 * reflowing into one paragraph. The last needs none: nothing follows it.
 *
 * A category note has no word to be labelled by, so it takes its category's
 * name. That is the only address it has, and dropping it to keep the categories
 * out of this layout would be losing text somebody wrote in order to keep a
 * layout's promise about text they did not.
 */
function plainLine(entries: readonly Entry[]): string {
  const words = entries.flatMap((entry) => entry.words);
  const notes = entries.flatMap((entry) => [
    ...(entry.note === "" ? [] : [{ label: entry.category, text: entry.note }]),
    ...entry.notes.map((note) => ({ label: note.word, text: note.text })),
  ]);

  const said = notes
    .map((note) => `${note.label}: ${escape(note.text)}`)
    .join("  \n");

  // A block that is only notes still says what it has. An empty line above them
  // would read as broken rather than as deliberate.
  if (words.length === 0) return said;
  return said === "" ? words.join(", ") : `${words.join(", ")}\n\n${said}`;
}

/**
 * The same picks as ordinary markdown, in the layout they are being drawn in —
 * what a block turns into when someone converts it and takes the text back.
 *
 * Built from the parsed entries and never from what is on screen: the commas
 * between words are drawn by CSS, and an empty note cell and a missing one look
 * identical in the DOM.
 *
 * **Aligned, stacked and auto all convert to the same thing.** Markdown has no
 * label column and no quiet label, so the one difference between those three
 * views is the one thing that cannot survive the trip. Nothing is lost that
 * markdown could have held, which is what matters — somebody who chose Stacked
 * does not get something stacked, and the menu says nothing about it, because
 * the alternative was a second line in a menu item and that is worse than the
 * surprise it was warning about.
 */
export function toPlainMarkdown(
  entries: readonly Entry[],
  layout: Layout,
): string {
  if (layout === "inline") return plainLine(entries);

  const written = layout === "column" ? perWord : grouped;
  return groupsIn(entries)
    .map((group) => group.flatMap(written).join("\n"))
    .join(RULE);
}
