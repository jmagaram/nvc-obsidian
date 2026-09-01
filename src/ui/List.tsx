import { useLayoutEffect, useRef } from "react";
import type { ListRow } from "../model/screen";
import { Chrome, Header } from "./Chrome";
import { Icon } from "./host";

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

  return (
    <Chrome
      header={<Header title={category} onBack={onBack} onClose={onClose} />}
      footer={
        <button className="primary mod-cta" onClick={onBack}>
          Done{count > 0 ? ` · ${count} selected` : ""}
        </button>
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
        >
          <label className="row-label">
            <input
              type="checkbox"
              checked={row.selected}
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
