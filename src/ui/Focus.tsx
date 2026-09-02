import { useRef } from "react";
import type { DeckMarks, FocusScreen } from "../model/screen";
import { useFocusOnArrival } from "./arrival";
import { Card } from "./Card";
import { Chrome, Header, PrimaryButton } from "./Chrome";
import { Deck } from "./Deck";
import { Icon } from "./host";

/**
 * One segment per card in the deck, in deck order: how far along the deck you
 * are, and which of its words you have kept.
 *
 * A single filled bar could only say the first of those. The segments say both
 * without spending a second control on it, and a category here runs four to
 * nine words, so each segment is wide enough to read at a glance.
 *
 * The only telling of position now, in either modality. A caption above this
 * used to say "3 of 9" and left the bar decoration under it, but its two
 * numbers keep different time: the total holds still for a whole deck, and sits
 * on the button above this, which needs it anyway to say how long the list it
 * opens is. The ordinal changes on every press, and a cursor walking nine
 * segments says that without spending a word on it. Hence the `progressbar`
 * role, which only duplicated the caption while there was one.
 *
 * The colour stays unannounced. It is not what the role is for, and what it
 * draws is already spoken twice: the card says "Selected" when it is, and so
 * does each word's own row on the list screen.
 */
function Progress({
  chosen,
  current,
}: {
  chosen: DeckMarks;
  /** 1-based card on screen. `null` on the closing card, which stands past the
      last of them and so carries no cursor. */
  current: number | null;
}) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Progress"
      aria-valuemin={1}
      aria-valuemax={chosen.length}
      aria-valuenow={current ?? chosen.length}
      aria-valuetext={`${current ?? chosen.length} of ${chosen.length}`}
    >
      {chosen.map((kept, index) => (
        <span
          key={index}
          className={[
            "progress-step",
            kept ? "is-chosen" : "",
            index + 1 === current ? "is-current" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </div>
  );
}

/**
 * The deck, card and closing card alike.
 *
 * One component for both because the chrome around them is the same, and only
 * what is inside the card changes as you page. Sliding the whole screen moved a
 * header and footer that were identical either side of the transition, which
 * read as the screen jittering sideways for no reason. So the push belongs to
 * screen changes — handled by the outer Slide in Dialog, which now keeps one key
 * for the whole deck — and paging moves the card and nothing else.
 */
export function Focus({
  screen,
  prev,
  next,
  onBack,
  onClose,
  onShowList,
  onPrev,
  onNext,
  onToggle,
  onOpenNote,
  onCategoryNote,
}: {
  screen: FocusScreen;
  /** The card either side, for the deck to draw the one being dragged toward. */
  prev: FocusScreen | null;
  next: FocusScreen | null;
  onBack: () => void;
  onClose: () => void;
  onShowList: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  onOpenNote: () => void;
  onCategoryNote: () => void;
}) {
  const end = screen.kind === "focusEnd" ? screen : null;
  const card = screen.kind === "focusCard" ? screen : null;
  const position = end ? end.total : (card?.position ?? 0);

  /* The answer the card is waiting for, which is the middle of the footer:
     Yes or Not this, and Done on the closing card. Nothing on the card face
     could take this instead — the note button is the only control up there, it
     is missing on an unselected card, and paging remounts whatever is inside
     the nested Slide, which is the very thing the `n` key exists to work
     around. The footer holds still through paging, so one arrival is enough
     for the whole deck: Space answers the card in front of you, ← → turn it,
     and Tab from here reaches the two arrows that do the same.

     The one screen where a keyboard was not quite stranded before — the global
     keys in src/Dialog.tsx answer the deck wherever focus is — and the one
     where landing anywhere else would be strange, since ⌘⏎ already presses
     this button. */
  const answer = useRef<HTMLButtonElement>(null);
  useFocusOnArrival(() => answer.current);

  /* Bare buttons rather than `clickable-icon`: these are primary footer
     navigation sitting either side of a `mod-cta`, and `.primary { flex: 1 }`
     assumes solid siblings that do not grow. They carry a label because the
     glyph is an icon rather than a character.

     Arrows rather than chevrons, though a carousel would use chevrons: this
     screen already draws a chevron-left in its header for Back, and one glyph
     pointing the same way at two destinations — out of the deck, and one card
     back through it — is the ambiguity worth spending a second pair of icons
     on. It also puts the footer's glyph and the key that presses it in the same
     shape; see the paging block in src/Dialog.tsx. */
  const previous = (
    <button
      className="step"
      onClick={onPrev}
      disabled={position === 1 && !end}
      aria-label="Previous"
    >
      <Icon name="arrow-left" />
    </button>
  );

  return (
    <Chrome
      bodyClass="focus-body"
      header={
        <Header title={screen.category} onBack={onBack} onClose={onClose} />
      }
      footer={
        end ? (
          <>
            {previous}
            <PrimaryButton
              ref={answer}
              label={`Done${end.count > 0 ? ` · ${end.count} selected` : ""}`}
              onClick={onBack}
            />
          </>
        ) : (
          <>
            {previous}
            {/* The label names the press, not the state — the card behind it is
                already the state, and says so across its whole surface. A button
                reading "Selected" was the third telling of one fact, after the
                tint and a check glyph beside that very label, and it left the
                two states differing by two letters once the glyph came off.
                "Yes" and "Not this" cannot be misread for each other.

                Neither is a `mod-cta`. With a status label the accent fill meant
                "this is on"; with an action label it means "press me", and
                neither press wants urging — a filled "Yes" leans on you to take
                every card in an inventory where most words will not apply, and a
                filled "Not this" leans on you to undo.

                And no `aria-pressed`, deliberately. It is for a toggle whose name
                holds still while its state moves; here the name *is* the state,
                and "Not this, pressed" contradicts itself. What it used to
                announce is on the card instead — see `card-state` below. */}
            <PrimaryButton
              ref={answer}
              label={card?.selected ? "Not this" : "Yes"}
              cta={false}
              onClick={onToggle}
            />
            <button className="step" onClick={onNext} aria-label="Next">
              <Icon name="arrow-right" />
            </button>
          </>
        )
      }
    >
      {/* The deck's size on the button rather than in a caption beside it. It
          is the number that says how long the list you are about to open is,
          which is worth knowing before you open it, and it holds still while
          you page — where a caption's other number, the ordinal, moved every
          press and is drawn better by the rule below than written out.

          Centred, because everything else on this screen is: the title above
          it, the card and the word inside it, the three buttons below. Off
          that line it was the one thing the eye had to account for. The list
          screen puts the reciprocal switch in this same band and aligns it
          left, with the rows it belongs to — the same door in the same place,
          each side of it keeping its own screen's axis. */}
      <div className="focus-actions">
        {/* No glyph, by the test written over `.list-actions` in src/ui/List.tsx:
            an icon beside a label earns its place by making a column down the
            left edge of a stack, or by naming what the label cannot. There is
            no stack here, centring took away the edge a glyph could line up on,
            and `list` says nothing that "Show all 9" has not already said. It
            leaves the two switches matching in kind as well as in place. */}
        <button onClick={onShowList}>{`Show all ${screen.total}`}</button>
      </div>
      <Progress chosen={screen.chosen} current={card ? card.position : null} />

      {/* Owns no scroll container, deliberately: this moves inside the body
          Chrome supplies rather than replacing it. A render prop rather than a
          child, because the deck draws two of these while a drag is open — the
          card you are on and the one you are pulling toward. */}
      <Deck
        screen={screen}
        prev={prev}
        next={next}
        onPage={(delta) => (delta === 1 ? onNext() : onPrev())}
      >
        {(s) => (
          <Card
            screen={s}
            onToggle={onToggle}
            onOpenNote={onOpenNote}
            onCategoryNote={onCategoryNote}
          />
        )}
      </Deck>
    </Chrome>
  );
}
