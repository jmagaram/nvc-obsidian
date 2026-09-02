import "../entries.css";
import type { Entry, Layout } from "../model/entries";

/**
 * A run of words, drawn the same way wherever words appear.
 *
 * `role="list"` is not redundant: Safari drops list semantics from a `ul` whose
 * `list-style` is `none`, which is every list here. The items stay
 * `display: inline` so the words wrap like prose — as flex items a wrapped line
 * stops lining up with the one above it. The comma is drawn by CSS rather than
 * written, so it is not selected when the words are.
 */
function Words({ words }: { words: readonly string[] }) {
  return (
    <ul className="words words" role="list">
      {words.map((word) => (
        <li key={word}>{word}</li>
      ))}
    </ul>
  );
}

/** What a category says about each of its words, looked up by the word. */
function written(entry: Entry) {
  return new Map(entry.notes.map((note) => [note.word, note.text]));
}

/**
 * The default. One row per category with its words inline, and under them
 * everything that was said about that category.
 *
 * A description list because that is what this is — a name and what is said
 * about it — and because `dl`, `dt` and `dd` are the only list elements
 * Obsidian's `.markdown-rendered` does not already style, so the block is not
 * fighting the app for its own indentation.
 *
 * **One `dt` per category and several `dd`s under it, and no other `dt`
 * anywhere.** The name column holds categories and nothing else, which is the
 * whole of what makes the two levels legible. A word note used to be a row of
 * its own with the word as its label, and a word in the name column lines up
 * with the categories and reads as one of them — `exasperated` sitting where
 * `Annoyed` and `Sad` sit says the three are peers, when one is inside another.
 * It also sized the column: `max-content` takes the widest thing in it, so one
 * long word narrowed the words for every category in the block.
 *
 * So a word note names its own word inline instead, which is exactly how the
 * stored line and the converted markdown already read — `exasperated: About
 * exasperated`. What is left in column two is a stack of things said about one
 * category, in the order the note stores them: the words, then the category's
 * own note, unlabelled because there is no word to name and italic so that
 * absence reads as deliberate, then a line per word that carries one.
 */
function Gloss({ entries }: { entries: readonly Entry[] }) {
  return (
    <dl className="rows">
      {entries.map((entry) => (
        <div className="category-row" key={entry.category}>
          <dt className="category">{entry.category}</dt>
          {entry.words.length > 0 ? (
            <dd className="words-cell">
              <Words words={entry.words} />
            </dd>
          ) : null}
          {entry.note === "" ? null : (
            <dd className="category-note">{entry.note}</dd>
          )}
          {entry.notes.map((note) => (
            <dd className="word-note" key={note.word}>
              <span className="about">{note.word}</span>
              {note.text}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}

/**
 * One word per line whether or not it carries a note, which is the whole of
 * what this layout says.
 *
 * The category note spans both columns directly under the heading rather than
 * sitting in the label column: the point of this layout is that the words below
 * line up with each other, and a note up there would be a word-shaped thing
 * that is not a word.
 */
function Column({ entries }: { entries: readonly Entry[] }) {
  return (
    <dl className="rows column">
      {entries.map((entry) => {
        const notes = written(entry);
        return (
          <div className="category-group" key={entry.category}>
            <dt className="category">{entry.category}</dt>
            {entry.note === "" ? null : (
              <dd className="category-note">{entry.note}</dd>
            )}
            {entry.words.map((word) => (
              <div className="note-row" key={word}>
                <dt className="word">{word}</dt>
                <dd className="word-note">{notes.get(word) ?? ""}</dd>
              </div>
            ))}
          </div>
        );
      })}
    </dl>
  );
}

/**
 * The picks as prose.
 *
 * A category note is the most prose-like thing in the block, so it goes into
 * the sentence — parenthesised beside the words, and standing in their place
 * when there are none, which is what keeps the colon meaning something. Word
 * notes cannot fit a sentence and fall to the trailing count, which is the one
 * thing they can do here.
 */
function Sentence({ entries }: { entries: readonly Entry[] }) {
  const notes = entries.reduce((sum, entry) => sum + entry.notes.length, 0);
  /* A `div` rather than the `p` this reads as. The words are a `ul`, and a `ul`
     inside a `p` is not valid HTML — React builds the DOM directly so nothing
     would go wrong in the app, but anything that ever parses this markup as
     text would close the paragraph early and take the block apart. Nothing here
     needs a paragraph's semantics, so it costs nothing to be a box. */
  return (
    <div className="sentence">
      {entries.map((entry) => (
        <span className="said" key={entry.category}>
          <b>{entry.category}</b>
          {": "}
          {entry.words.length > 0 ? <Words words={entry.words} /> : null}
          {entry.note === "" ? null : (
            <span className="aside">
              {entry.words.length > 0 ? ` (${entry.note})` : entry.note}
            </span>
          )}
        </span>
      ))}
      {notes > 0 ? (
        <span className="count">
          {notes} {notes === 1 ? "note" : "notes"}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A row per word with the category repeated, because a table has neither a row
 * span nor an indent.
 *
 * A category note is a row with an empty Word cell, first among its category's
 * rows: an empty cell there says precisely that this is about the category and
 * not about a word, and it needs no legend. One rule decides the header rather
 * than one per column — a column empty for every row is left out.
 */
function Table({ entries }: { entries: readonly Entry[] }) {
  const worded = entries.some((entry) => entry.words.length > 0);
  const noted = entries.some(
    (entry) => entry.note !== "" || entry.notes.length > 0,
  );

  const rows = entries.flatMap((entry) => {
    const notes = written(entry);
    return [
      ...(entry.note === ""
        ? []
        : [{ key: `${entry.category}:`, word: "", note: entry.note }]),
      ...entry.words.map((word) => ({
        key: `${entry.category}:${word}`,
        word,
        note: notes.get(word) ?? "",
      })),
    ].map((row) => ({ ...row, category: entry.category }));
  });

  return (
    <table className="entries-table">
      <thead>
        <tr>
          <th>Category</th>
          {worded ? <th>Word</th> : null}
          {noted ? <th>Note</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td>{row.category}</td>
            {worded ? <td>{row.word}</td> : null}
            {noted ? <td className="word-note">{row.note}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A block's picks, drawn one of five ways.
 *
 * Presentational and host-free: props in, JSX out, no icons and no context, so
 * the gallery and a note in the vault draw the same thing.
 */
export function Entries({
  entries,
  layout,
}: {
  entries: readonly Entry[];
  /* A plain union rather than a union of prop shapes: all five read the same
     entries, so there is no contradiction to rule out. */
  layout: Layout;
}) {
  return (
    <div className="nvc-entries">
      {layout === "gloss" ? <Gloss entries={entries} /> : null}
      {layout === "column" ? <Column entries={entries} /> : null}
      {layout === "sentence" ? <Sentence entries={entries} /> : null}
      {layout === "table" ? <Table entries={entries} /> : null}
      {layout === "inline" ? (
        /* This layout drops the category and both kinds of note, which is what
           it is for. But it never draws nothing: a block holding only category
           notes would otherwise be an empty line, which reads as broken rather
           than as deliberate. */
        <p className="inline-words">
          {entries.some((entry) => entry.words.length > 0)
            ? entries.flatMap((entry) => entry.words).join(", ")
            : entries
                .map((entry) => entry.note)
                .filter(Boolean)
                .join("; ")}
        </p>
      ) : null}
    </div>
  );
}
