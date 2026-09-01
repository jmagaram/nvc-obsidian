import type { HubCard, PillGroup } from "../model/screen";
import { Chrome, Header, PrimaryButton } from "./Chrome";
import { Icon } from "./host";

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
        cards.map((card) => (
          <button
            className="plain card"
            key={card.category}
            onClick={() => onOpen(card.category)}
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
          the outline the pill draws differs between the two — see `.pill` in
          dialog.css. The clouds are siblings rather than wrapped divs because
          the gap between them is drawn by `.pills + .pills`, and an empty group
          renders nothing so it cannot leave that gap behind. */}
      {groups.map((group) =>
        group.names.length === 0 ? null : (
          <div className={`pills pills-${group.kind}`} key={group.kind}>
            {group.names.map((name) => (
              <button className="pill" key={name} onClick={() => onOpen(name)}>
                {name}
              </button>
            ))}
          </div>
        ),
      )}
    </Chrome>
  );
}
