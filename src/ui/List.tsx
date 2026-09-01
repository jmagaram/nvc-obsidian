import { useLayoutEffect, useRef } from "react";
import type { ListRow } from "../model/screen";
import { ActionButton, Chrome, Header } from "./Chrome";
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
      {/* No trailing chevron. The chip is the affordance now, and a chevron
          inside one reads as a disclosure, which this is not. */}
      <ActionButton
        icon="layers"
        label="Review one at a time"
        onClick={onOneAtATime}
      />

      <div style={{ padding: "var(--size-4-3) 0" }}>
        {note === "" ? (
          <ActionButton
            icon="message-square-plus"
            label={`Add note about ${category}`}
            onClick={onCategoryNote}
          />
        ) : (
          <>
            <div className="hub-head">
              <span className="section" style={{ margin: 0 }}>
                Note
              </span>
              {/* An action opposite a section label is Obsidian's view-header
                  shape, where the action is always an icon. It also makes
                  "edit an existing note" render the same here as it does on a
                  row below. The Focus end card keeps words for the same action,
                  because it has no header row to hang an icon off. */}
              <button
                className="clickable-icon"
                aria-label={`Edit note about ${category}`}
                onClick={onCategoryNote}
              >
                <Icon name="square-pen" />
              </button>
            </div>
            <button className="plain note-extract" onClick={onCategoryNote}>
              {note}
            </button>
          </>
        )}
      </div>

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
