import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ListRow } from "../model/screen";
import { useFocusOnArrival } from "./arrival";
import { Chrome, Header, PrimaryButton } from "./Chrome";
import { Icon } from "./host";
import { scrollIntoDialogBody } from "./keyboard";

export function List({
  category,
  note,
  rows,
  count,
  reveal,
  onBack,
  onClose,
  onOneAtATime,
  onCategoryNote,
  onToggle,
  onOpenNote,
}: {
  category: string;
  note: string;
  rows: readonly ListRow[];
  count: number;
  reveal: number | null;
  onBack: () => void;
  onClose: () => void;
  onOneAtATime: () => void;
  onCategoryNote: () => void;
  onToggle: (word: string) => void;
  onOpenNote: (word: string) => void;
}) {
  const revealed = useRef<HTMLDivElement>(null);

  // Centre the word you were last on, rather than scrollIntoView, which would
  // also scroll whatever is behind the dialog.
  useLayoutEffect(() => {
    const row = revealed.current;
    const body = row?.closest(".dialog-body");
    if (!row || !(body instanceof HTMLElement)) return;
    body.scrollTop =
      row.offsetTop - body.clientHeight / 2 + row.offsetHeight / 2;
  }, [category, reveal]);

  /* The list holds one tab stop, not one per word. Tab reaches the word you
     were last on and then leaves through that row's own note buttons; ↑ ↓ move
     between words, the way they do in any other list. Tabbing every row was the
     alternative, and a selected row costs two or three stops of its own, so a
     category could run to sixty stops between the actions above the list and
     the Done button below it.

     The checkbox carries the tab stop rather than the row, so nothing here
     needs a role: it is still a checkbox, still announced with its word and its
     checked state, and Space still toggles it natively.

     Where the stop starts is `reveal` — the word you were last on, the same one
     the effect above centres. Read once at mount, which is all it needs: the
     list is keyed by category inside `Slide`, so every path that sets a new
     `reveal` has left the list and come back to a fresh one. */
  const [active, setActive] = useState(reveal ?? 0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  /* That same word's checkbox, which is the row the effect above has just
     centred: the eye and the caret should not have to be told two different
     places to start. Space takes it from there, and the arrows can move because
     they now have somewhere to move from. */
  useFocusOnArrival(() => inputs.current[active]);

  // Bound to each row rather than to a wrapper, so the arrows work from a row's
  // note buttons too and the body keeps the flat run of children it lays out.
  function onRowKeyDown(event: KeyboardEvent, index: number) {
    const last = rows.length - 1;
    let next: number;
    if (event.key === "ArrowDown") next = Math.min(index + 1, last);
    else if (event.key === "ArrowUp") next = Math.max(index - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;

    // Even at an end, where focus does not move: the arrow's own scrolling is
    // what the row-by-row scrolling below replaces.
    event.preventDefault();
    const input = inputs.current[next];
    if (!input) return;
    setActive(next);
    input.focus({ preventScroll: true });
    // The row rather than the checkbox: a selected one carries its note on a
    // line of its own below, and scrolling to the box alone would leave it
    // under the edge. And at the first word the body goes all the way home
    // rather than stopping at that row, because the actions and the category
    // note sit above it inside the same scroller, and no key walks up to them.
    const row = input.closest(".row");
    if (row instanceof HTMLElement) scrollIntoDialogBody(row, next === 0);
  }

  return (
    <Chrome
      header={<Header title={category} onBack={onBack} onClose={onClose} />}
      footer={
        <PrimaryButton
          label={`Done${count > 0 ? ` · ${count} selected` : ""}`}
          onClick={onBack}
        />
      }
    >
      {/* Labels alone, unlike every other action in the dialog. An icon beside
          a label earns its place two ways, and neither is available here: it
          gives a column of glyphs down the left edge of a stack, which a row
          that centres its chips does not have, and it names the action, which
          `layers` never did — nothing recovers "one card at a time" from a
          stack of sheets. The note chip is bare for the same reason rather than
          to match: it only ever renders when there is no note, so no glyph is
          carrying an add-versus-edit distinction the way one does on a row
          below. No trailing chevron either — a chevron inside a chip reads as a
          disclosure, which neither of these is. */}
      <div className="list-actions">
        <button onClick={onOneAtATime}>Review one at a time</button>
        {note === "" ? (
          <button
            aria-label={`Add note about ${category}`}
            onClick={onCategoryNote}
          >
            Add note
          </button>
        ) : null}
      </div>

      {/* No label over it. The extract's own rule and italic already say "a
          note", and the header directly above already says which category it is
          about, so a label could only restate one or the other. Naming the
          category in it — "About Angry" — restates the header and then breaks
          on the needs inventory, where a name runs to the length of "To
          understand and be understood". That leaves the edit action nothing to
          sit opposite, so it moves beside the note rather than above it. */}
      {note === "" ? null : (
        <div className="category-note">
          <button className="plain note-extract" onClick={onCategoryNote}>
            {note}
          </button>
          <button
            className="clickable-icon"
            aria-label={`Edit note about ${category}`}
            onClick={onCategoryNote}
          >
            <Icon name="square-pen" />
          </button>
        </div>
      )}

      {rows.map((row, index) => (
        <div
          className={row.selected ? "row row-selected" : "row"}
          key={row.word}
          ref={index === reveal ? revealed : undefined}
          onKeyDown={(event) => onRowKeyDown(event, index)}
        >
          <label className="row-label">
            <input
              type="checkbox"
              checked={row.selected}
              tabIndex={index === active ? 0 : -1}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              /* A click on a row moves the tab stop as well, so Tab picks up
                 from wherever the mouse left off rather than from the row the
                 list was opened on. */
              onFocus={() => setActive(index)}
              onChange={() => onToggle(row.word)}
            />
            <span className="row-text">
              <span className="row-word">{row.word}</span>
              <span className="row-def">{row.definition}</span>
            </span>
          </label>
          {row.selected ? (
            <button
              className="clickable-icon row-note-link"
              aria-label={
                row.note === ""
                  ? `Add a note about ${row.word}`
                  : `Edit note about ${row.word}`
              }
              onClick={() => onOpenNote(row.word)}
            >
              <Icon
                name={row.note === "" ? "message-square-plus" : "square-pen"}
              />
            </button>
          ) : null}
          {row.note === "" ? null : (
            <button
              className="plain note-extract"
              aria-label={`Edit note about ${row.word}`}
              onClick={() => onOpenNote(row.word)}
            >
              {row.note}
            </button>
          )}
        </div>
      ))}
    </Chrome>
  );
}
