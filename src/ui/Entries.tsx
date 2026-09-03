import { Fragment } from "react";
import type { ReactNode } from "react";
import "../entries.css";
import { groupsIn } from "../model/entries";
import type { Entry, Layout } from "../model/entries";
import { useStackWhenWrapped } from "./measure";

/**
 * A run of words, drawn the same way wherever words appear.
 *
 * `role="list"` is not redundant: Safari drops list semantics from a `ul` whose
 * `list-style` is `none`, which is every list here. The items stay
 * `display: inline` so the words wrap like prose — as flex items a wrapped line
 * stops lining up with the one above it. The comma is drawn by CSS rather than
 * written, so it is not selected when the words are.
 *
 * The `inline` is also what `useStackWhenWrapped` measures. An inline box gets
 * one client rect per line it occupies, and that is the whole of how the auto
 * layout knows the aligned arrangement has run out of room.
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

/**
 * Everything said about one category, in the order the note stores it.
 *
 * The category's own note first, because it is about the name above it rather
 * than about any of the words; then a line per word that carries one, in word
 * order. Words nobody wrote about are not listed — a blank line for each of
 * them would be a column of nothing.
 *
 * Two voices and no third device. A word note names its word upright and then
 * says the note in italics, so the inventory's word and somebody's own sentence
 * separate without an indent, a colon or a second colour doing the work; the
 * category's note is italic all through, because it has no word to name and the
 * absence has to read as deliberate rather than as a label that went missing.
 *
 * `em` rather than a class, so the voice is in the markup. Nothing in
 * `.markdown-rendered` restyles an `em`, and the one thing the italics must
 * survive is somebody's theme.
 */
function Notes({ entry }: { entry: Entry }) {
  const written = new Map(entry.notes.map((note) => [note.word, note.text]));
  return (
    <>
      {entry.note === "" ? null : (
        <dd className="note category-note">
          <em>{entry.note}</em>
        </dd>
      )}
      {entry.words
        .filter((word) => written.has(word))
        .map((word) => (
          <dd className="note word-note" key={word}>
            <span className="about">{word}</span>
            <em>{written.get(word)}</em>
          </dd>
        ))}
    </>
  );
}

/**
 * The hairline between the two polarity groups.
 *
 * A `div` and not an `hr`. `hr` is not allowed inside a `dl`, and inside
 * `.markdown-rendered` it arrives carrying the app's own rule — a different
 * weight, a different colour and margins meant for separating sections of
 * prose. What this needs is one hairline the width of the block's interior, and
 * a box is the honest way to ask for one.
 *
 * `role="separator"` so the meaning is not only in the paint. It says nothing
 * about *what* it separates, which is the open question in the spec and is not
 * for this element to answer on its own.
 */
function Split() {
  return <div className="split" role="separator" />;
}

/**
 * Every group in the block, with a rule between them.
 *
 * One function for all three layouts that have groups, so the rule is drawn in
 * one place and cannot appear in one layout and not another. `groupsIn` answers
 * with a single group where there is no split to draw — the needs list, and any
 * block that parsed but did not resolve — so "no rule when there is only one
 * group" needs no test here: there is no second group to put one before.
 */
function Groups({
  entries,
  children,
}: {
  entries: readonly Entry[];
  children: (entry: Entry) => ReactNode;
}) {
  return (
    <>
      {groupsIn(entries).map((group, at) => (
        <Fragment key={group[0].category}>
          {at > 0 ? <Split /> : null}
          {group.map(children)}
        </Fragment>
      ))}
    </>
  );
}

/**
 * Category names in a right-flush column, words in a second, so every word list
 * in the block starts on the same vertical line.
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
 * **One grid for the whole block, groups and all.** The label column is sized to
 * the longest name anywhere in the block, and a grid per group would size two
 * columns independently and let the words start in two different places either
 * side of the rule. So the wrappers are `display: contents` and the rule spans
 * every column.
 */
function Aligned({ entries }: { entries: readonly Entry[] }) {
  return (
    <dl className="rows aligned">
      <Groups entries={entries}>
        {(entry) => (
          <div className="category-row" key={entry.category}>
            <dt className="category">{entry.category}</dt>
            {entry.words.length > 0 ? (
              <dd className="words-cell">
                <Words words={entry.words} />
              </dd>
            ) : null}
            <Notes entry={entry} />
          </div>
        )}
      </Groups>
    </dl>
  );
}

/**
 * The same contents with the name on its own line above the words it labels.
 *
 * What Aligned spends on a label column, this spends on a line — which is the
 * trade the two exist to offer. No grid, because nothing here lines up with
 * anything in another category; the indent under the name is a padding and not
 * a column.
 */
function Stacked({ entries }: { entries: readonly Entry[] }) {
  return (
    <dl className="stacked">
      <Groups entries={entries}>
        {(entry) => (
          <div className="category-block" key={entry.category}>
            <dt className="category">{entry.category}</dt>
            {entry.words.length > 0 ? (
              <dd className="words-cell">
                <Words words={entry.words} />
              </dd>
            ) : null}
            <Notes entry={entry} />
          </div>
        )}
      </Groups>
    </dl>
  );
}

/**
 * Aligned, unless aligned does not fit — and then stacked, for the whole block.
 *
 * The rule is *any* word list wrapping, not most of them and not the average.
 * One wrapped row inside an aligned column is the worst-looking state in the
 * set — the second line starts under the label column and the block stops
 * looking like it has columns at all — so it is worth stacking a block that was
 * otherwise fine to be sure of never drawing one.
 *
 * All or nothing for the same reason: two arrangements inside one block would
 * be two answers to a question the reader did not know was being asked.
 *
 * The measurement is of the rendered element and never of a character count. A
 * threshold in characters is wrong at every width but the one it was chosen at,
 * and it would change its mind about a block when the reader changed their
 * readable line length — which is a setting about the note, not about this.
 */
function Auto({ entries }: { entries: readonly Entry[] }) {
  /* What a re-measure hangs on: the words are what can wrap, and their
     categories are what sizes the column they wrap inside. The notes cannot
     change either answer — they have a column to themselves and wrap freely —
     so they are left out and a note being edited does not re-measure. */
  const signature = entries
    .map((entry) => `${entry.category}:${entry.words.join(",")}`)
    .join("|");
  const { box, stacked } = useStackWhenWrapped(signature);

  return (
    <div className="auto" ref={box}>
      {stacked ? <Stacked entries={entries} /> : <Aligned entries={entries} />}
    </div>
  );
}

/**
 * A line per word whether or not it carries a note, with the notes in a column
 * beside them.
 *
 * A word's note is on the word's own line rather than under it, so a word
 * nobody wrote about costs one line and not two. That is the whole reason to
 * choose this layout: it is for an entry where most words carry a note, and it
 * is wasteful for one where few do.
 *
 * The category name spans both columns rather than sitting in the first. The
 * point here is that the *words* line up with each other, and a name in the
 * word column would be a word-shaped thing that is not a word. Its own note
 * spans both for the same reason.
 */
function Column({ entries }: { entries: readonly Entry[] }) {
  return (
    <dl className="rows column">
      <Groups entries={entries}>
        {(entry) => {
          const written = new Map(
            entry.notes.map((note) => [note.word, note.text]),
          );
          return (
            <div className="category-group" key={entry.category}>
              <dt className="category">{entry.category}</dt>
              {entry.note === "" ? null : (
                <dd className="note category-note">
                  <em>{entry.note}</em>
                </dd>
              )}
              {entry.words.map((word) => (
                <div className="note-row" key={word}>
                  <dt className="word">{word}</dt>
                  <dd className="note word-note">
                    {written.has(word) ? <em>{written.get(word)}</em> : null}
                  </dd>
                </div>
              ))}
            </div>
          );
        }}
      </Groups>
    </dl>
  );
}

/**
 * The words and nothing else, with the groups run together and no rule between
 * them.
 *
 * This is the one layout meant to sit inside a sentence somebody is writing,
 * which is why the frame comes off it as well — see `.nvc-block.is-bare` in
 * obsidian/styles.css. It has no structure left to signal.
 *
 * It never draws nothing, though. A block holding only category notes would
 * otherwise be an empty line, which reads as broken rather than as deliberate.
 * Converting it loses nothing either way: `toPlainMarkdown` keeps every note
 * this drops.
 */
function PlainLine({ entries }: { entries: readonly Entry[] }) {
  return (
    <p className="inline-words">
      {entries.some((entry) => entry.words.length > 0)
        ? entries.flatMap((entry) => entry.words).join(", ")
        : entries
            .map((entry) => entry.note)
            .filter(Boolean)
            .join("; ")}
    </p>
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
      {layout === "aligned" ? <Aligned entries={entries} /> : null}
      {layout === "stacked" ? <Stacked entries={entries} /> : null}
      {layout === "auto" ? <Auto entries={entries} /> : null}
      {layout === "column" ? <Column entries={entries} /> : null}
      {layout === "inline" ? <PlainLine entries={entries} /> : null}
    </div>
  );
}
