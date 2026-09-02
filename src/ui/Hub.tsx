import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { HubCard, PillGroup } from "../model/screen";
import { useFocusOnArrival } from "./arrival";
import { Chrome, Header, PrimaryButton } from "./Chrome";
import { Icon } from "./host";
import { scrollIntoDialogBody, step } from "./keyboard";

export function Hub({
  cards,
  groups,
  total,
  onOpen,
  onClear,
  onInsert,
  onClose,
}: {
  cards: readonly HubCard[];
  groups: readonly PillGroup[];
  total: number;
  onOpen: (category: string) => void;
  onClear: () => void;
  onInsert: () => void;
  onClose: () => void;
}) {
  /* Cards and pills are one field, not two. Every one of them does the same
     thing — open a category — and a card is only a category you have already
     picked, so the eye reads the body as one inventory and the arrows had
     better agree: ↑ ↓ walk the cards and then the rows of the cloud, ← → move
     along a row, and the break between the two clouds is a wider gap rather
     than a wall.

     One tab stop for the whole field. There are twenty-six categories, so Tab
     alone meant twenty-six presses to reach Clear all — the same complaint the
     feelings list had, and a worse case of it.

     Numbering runs cards first and then the clouds in order, which is both the
     DOM order and the reading order, so `step` can do left and right without
     measuring anything. */
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const size = (upTo: number) =>
    groups.slice(0, upTo).reduce((n, g) => n + g.names.length, 0);
  const clouds = groups.map((group, index) => ({
    group,
    first: cards.length + size(index),
  }));
  /* Clear all empties the cards while the screen is up, so the field can shrink
     under its own refs: the pills renumber, the unmounted cards blank the slots
     they held, and the tail of the array is left holding nothing. Hence both
     the clamp — a tab stop past the end would leave the field with no way into
     it at all — and the slice, without which End would land on a slot with no
     button in it and the key would do nothing. */
  const count = cards.length + size(groups.length);
  const stop = Math.min(active, count - 1);

  /* The field's own tab stop, which on arrival is the first card, or the first
     pill where nothing is picked yet. The screen is an inventory of categories
     and the field is the inventory, so this is both the thing the screen is
     about and the one place a press does anything: with focus outside it the
     arrows walk nothing, since they move from wherever they already are. */
  useFocusOnArrival(() => items.current[stop]);

  function move(event: KeyboardEvent, index: number) {
    const to = step(items.current.slice(0, count), index, event.key);
    if (to === null) return;
    event.preventDefault();
    const element = items.current[to];
    if (!element) return;
    setActive(to);
    element.focus({ preventScroll: true });
    scrollIntoDialogBody(element);
  }

  /** What makes a card or a pill part of the field. */
  const inField = (index: number) => ({
    tabIndex: index === stop ? 0 : -1,
    ref: (element: HTMLButtonElement | null) => {
      items.current[index] = element;
    },
    // A click moves the tab stop as well, so Tab picks up from wherever the
    // mouse left off rather than from the top of the screen.
    onFocus: () => setActive(index),
    onKeyDown: (event: KeyboardEvent) => move(event, index),
  });

  return (
    <Chrome
      header={<Header title="Insert feelings" onClose={onClose} />}
      footer={
        <>
          {/* Words alone, and down here: an `x` on this screen would be the
              second one, a thumb's width from the header's close and reading as
              the same gesture. Disabled rather than absent when nothing is
              picked, so the CTA holds its place instead of sliding sideways as
              the count appears. */}
          <button
            className="mod-secondary"
            onClick={onClear}
            disabled={total === 0}
          >
            Clear all
          </button>
          <PrimaryButton
            label={
              total === 0
                ? "Insert"
                : `Insert ${total} feeling${total === 1 ? "" : "s"}`
            }
            onClick={onInsert}
            disabled={total === 0}
          />
        </>
      }
    >
      {cards.length > 0 ? (
        cards.map((card, index) => (
          <button
            className={`plain hub-card hub-card-${card.kind}`}
            key={card.category}
            onClick={() => onOpen(card.category)}
            {...inField(index)}
          >
            <span className="card-head">
              <span className="card-name">
                {card.category}
                {card.hasNote ? (
                  <Icon name="message-square-text" label="has a note" />
                ) : null}
              </span>
              <Icon name="chevron-right" />
            </span>
            <span className="card-words">
              {card.words.map((w, i) => (
                <span key={w.word}>
                  {i > 0 ? ", " : ""}
                  {w.word}
                  {/* Sized in `em` and drawn faint, so a dozen of them across
                      a card read as footnote marks rather than as a dozen
                      icons competing with the words they mark.

                      Unlabelled, unlike the one on the card head. A button's
                      name is the flattening of everything inside it, so a
                      labelled marker per word would say "has a note" a dozen
                      times in one breath. Nothing is lost by leaving them
                      decorative: this card is a glance, and each word's own
                      row on the next screen already announces whether it has
                      a note. */}
                  {w.hasNote ? <Icon name="asterisk" /> : null}
                </span>
              ))}
            </span>
          </button>
        ))
      ) : (
        <p className="muted" style={{ margin: "0 0 8px" }}></p>
      )}

      {/* No headings: the names carry their own valence, and each group is
          alphabetised on its own, so the alphabet restarting marks the break as
          plainly as a label would. The kind rides on the class as well, because
          the unmet half is drawn in a heavier line than the met half — the same
          line its cards carry; see `.pills-unmet .pill` in dialog.css. The clouds are siblings rather than wrapped divs because
          the gap between them is drawn by `.pills + .pills`, and an empty group
          renders nothing so it cannot leave that gap behind. */}
      {clouds.map(({ group, first }) =>
        group.names.length === 0 ? null : (
          <div className={`pills pills-${group.kind}`} key={group.kind}>
            {group.names.map((name, index) => (
              <button
                className="pill"
                key={name}
                onClick={() => onOpen(name)}
                {...inField(first + index)}
              >
                {name}
              </button>
            ))}
          </div>
        ),
      )}

      {/* CNVC gives permission to copy and share the inventory and asks to be
          credited for it, and this screen is the inventory. It sits under the
          categories rather than in a settings tab, because a tab nobody opens
          is a weaker way of keeping that promise. Only the words and the
          category names are theirs — every definition on the next screen was
          written for this project — which is why the line credits the
          inventory and not the plugin.

          Outside the field. It is a sentence rather than a stop on the walk
          through the categories, and `count` is what both the arrows and the
          tab stop are measured against. */}
      <p className="credit">
        Feelings and Needs Inventory, © 2023 Center for Nonviolent
        Communication, cnvc.org.
      </p>
    </Chrome>
  );
}
