import { useEffect, useReducer, useRef } from "react";
import "./dialog.css";
import { buildMarkdown } from "./model/markdown";
import { createInitialState, reducer } from "./model/reducer";
import { toScreen } from "./model/screen";
import type { Screen } from "./model/screen";
import type { Categories } from "./model/types";
import { Focus } from "./ui/Focus";
import { Hub } from "./ui/Hub";
import { HostProvider } from "./ui/host";
import type { SetIcon } from "./ui/host";
import { isTyping, NOTE_KEY } from "./ui/keyboard";
import { List } from "./ui/List";
import { Note } from "./ui/Note";
import { Slide } from "./ui/Slide";

/**
 * A key that changes exactly when the view should animate, and a rank that
 * orders the screens so `Slide` can tell a push from a pop. Focus cards are
 * ranked by position, so paging through the deck slides as well.
 */
function identify(screen: Screen): { key: string; rank: number } {
  switch (screen.kind) {
    case "hub":
      return { key: "hub", rank: 0 };
    case "list":
      return { key: `list:${screen.category}`, rank: 1000 };
    /* One key for the whole deck. Paging between cards is animated inside
       Focus, so the outer layer — header and footer included — must hold still
       through it and only push when the screen itself changes. */
    case "focusCard":
    case "focusEnd":
      return { key: `focus:${screen.category}`, rank: 2000 };
    case "categoryNote":
      return { key: `note:${screen.category}`, rank: 3000 };
    case "feelingNote":
      return { key: `note:${screen.category}:${screen.word}`, rank: 3000 };
  }
}

export function Dialog({
  categories,
  onInsert,
  onClose,
  icon,
}: {
  categories: Categories;
  onInsert: (markdown: string) => void;
  onClose: () => void;
  /** The host's icon renderer — Obsidian's `setIcon`. Absent in the gallery. */
  icon?: SetIcon;
}) {
  const [state, dispatch] = useReducer(reducer, categories, createInitialState);
  const screen = toScreen(state, categories);
  const { key, rank } = identify(screen);

  // The end card pages too, so the keyboard must match the ‹ › buttons there.
  const inFocus = screen.kind === "focusCard" || screen.kind === "focusEnd";

  /**
   * What Ctrl/⌘+Enter does here, which is whatever this screen's
   * `PrimaryButton` does — the one shortcut every screen has, because every
   * screen has exactly one action that finishes it. See src/ui/Chrome.tsx,
   * where that button draws the hint that is the only thing telling you the
   * key exists.
   *
   * `null` where the button is disabled, so the key is dead in exactly the
   * cases the button is.
   */
  function primaryAction(): (() => void) | null {
    switch (screen.kind) {
      case "hub":
        return screen.total === 0
          ? null
          : () => onInsert(buildMarkdown(state, categories));
      /* Both are Done, and Done here means the hub. */
      case "list":
      case "focusEnd":
        return () => dispatch({ type: "goHub" });
      /* Select, not Done: on a card the footer's middle button is the toggle,
         and this key means that button rather than a fixed action. It completes
         the mapping the arrows started — ← ⌘⏎ → is the footer, key for key. */
      case "focusCard": {
        const { category, word } = screen;
        return () => dispatch({ type: "toggleFeeling", category, word });
      }
      case "categoryNote":
        return () => dispatch({ type: "closeCategoryNote" });
      case "feelingNote":
        return () => dispatch({ type: "closeFeelingNote" });
    }
  }

  /**
   * What `n` does here: open the note the screen is about. See src/ui/Focus.tsx,
   * where the button that draws the hint is — the only thing telling you the
   * key exists.
   *
   * The deck is the only place it is bound, because it is the only place one
   * letter has one meaning. Its own reason to exist is that paging destroys
   * whatever had focus inside the card — see the nested `Slide` in Focus — so a
   * key that does not care where focus is is the only reliable way to reach a
   * note without Tabbing from the top of the screen each time.
   *
   * `null` where no note control is on screen, so the key is dead in exactly
   * the cases the button is.
   */
  function noteAction(): (() => void) | null {
    switch (screen.kind) {
      case "focusCard": {
        const { category, word, selected } = screen;
        /* An unselected card draws its note row only to hold the height and
           offers nothing, so neither does the key. */
        if (!selected) return null;
        return () =>
          dispatch({ type: "openFeelingNote", category, word, from: "focus" });
      }
      /* No word is in focus here, so a note can only mean the category's — the
         same reading the end card's note row goes by. */
      case "focusEnd": {
        const { category } = screen;
        return () =>
          dispatch({ type: "openCategoryNote", category, from: "focusEnd" });
      }
      /* The list carries a note control per selected feeling as well as the
         category's, so one letter cannot say which it means; the hub has none;
         and on a note screen a letter is a letter. */
      case "hub":
      case "list":
      case "categoryNote":
      case "feelingNote":
        return null;
    }
  }

  /* The listener holds no screen of its own; it reads the current one off this
     ref. Bound to the screen instead, it would be torn down and rebuilt on
     every keystroke typed into a note, since each one re-renders the dialog. */
  const keys = useRef<{
    primary: (() => void) | null;
    note: (() => void) | null;
    paging: boolean;
  }>({ primary: null, note: null, paging: false });
  useEffect(() => {
    keys.current = {
      primary: primaryAction(),
      note: noteAction(),
      paging: inFocus,
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { primary, note, paging } = keys.current;
      /* Captured on the way down and stopped here, rather than caught on the
         way back up: this is a modal, and Ctrl/⌘+Enter is a combination the
         host may well have spent on something in the note behind it. Only the
         combination we answer is stopped. */
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        if (!primary) return;
        e.preventDefault();
        e.stopPropagation();
        primary();
        return;
      }

      /* Above the paging check rather than below it: `noteAction` already
         returns null everywhere off the deck, and gating on `paging` too would
         state the same rule twice and leave the next reader checking whether
         the two still agree.

         Lower case and unmodified only. `e.key` is "N" under Shift, so that
         case never reaches here and `e.shiftKey` needs no test of its own; and
         ⌘/Ctrl+N is the host's new note, which is not ours to take. `e.key` is
         also the character produced rather than the key's position, so on a
         layout that puts n elsewhere the shortcut follows the letter — which is
         what a mnemonic should do and what the drawn hint promises, so this is
         not an oversight to be corrected to `e.code`. */
      if (e.key === NOTE_KEY.key && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!note) return;
        if (isTyping(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        note();
        return;
      }

      if (!paging) return;
      /* Swallowed, the way the list and the hub swallow the keys they claim:
         the body scrolls on the arrows otherwise, so one press both turned the
         card and moved the screen under it. */
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") e.preventDefault();
      if (e.key === "ArrowRight") dispatch({ type: "nextCard" });
      if (e.key === "ArrowLeft") dispatch({ type: "prevCard" });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  function render() {
    switch (screen.kind) {
      case "hub":
        return (
          <Hub
            cards={screen.cards}
            groups={screen.groups}
            total={screen.total}
            onOpen={(category) => dispatch({ type: "openCategory", category })}
            onClear={() => dispatch({ type: "clearAll" })}
            onInsert={() => onInsert(buildMarkdown(state, categories))}
            onClose={onClose}
          />
        );

      case "list": {
        const category = screen.category;
        return (
          <List
            category={category}
            note={screen.note}
            rows={screen.rows}
            count={screen.count}
            reveal={screen.reveal}
            onBack={() => dispatch({ type: "goHub" })}
            onClose={onClose}
            onOneAtATime={() =>
              dispatch({
                type: "showFocus",
                category,
                at: { kind: "card", index: 0 },
              })
            }
            onCategoryNote={() =>
              dispatch({ type: "openCategoryNote", category, from: "list" })
            }
            onToggle={(word) =>
              dispatch({ type: "toggleFeeling", category, word })
            }
            onOpenNote={(word) =>
              dispatch({
                type: "openFeelingNote",
                category,
                word,
                from: "list",
              })
            }
          />
        );
      }

      case "focusCard":
      case "focusEnd": {
        const category = screen.category;
        const word = screen.kind === "focusCard" ? screen.word : "";
        return (
          <Focus
            screen={screen}
            onBack={() => dispatch({ type: "goHub" })}
            onClose={onClose}
            onShowList={() => dispatch({ type: "showList", category })}
            onPrev={() => dispatch({ type: "prevCard" })}
            onNext={() => dispatch({ type: "nextCard" })}
            onToggle={() => dispatch({ type: "toggleFeeling", category, word })}
            onOpenNote={() =>
              dispatch({
                type: "openFeelingNote",
                category,
                word,
                from: "focus",
              })
            }
            onCategoryNote={() =>
              dispatch({ type: "openCategoryNote", category, from: "focusEnd" })
            }
          />
        );
      }

      case "categoryNote": {
        const category = screen.category;
        return (
          <Note
            title={category}
            label="Note"
            text={screen.text}
            onDone={() => dispatch({ type: "closeCategoryNote" })}
            onClose={onClose}
            onChange={(text) =>
              dispatch({ type: "setCategoryNote", category, text })
            }
          />
        );
      }

      case "feelingNote": {
        const { category, word } = screen;
        return (
          <Note
            title={word}
            label="Note"
            text={screen.text}
            singleLine
            onDone={() => dispatch({ type: "closeFeelingNote" })}
            onClose={onClose}
            onChange={(text) =>
              dispatch({ type: "setFeelingNote", category, word, text })
            }
          />
        );
      }
    }
  }

  // Everything the dialog styles is scoped under this class, so nothing leaks
  // into the Obsidian app around it.
  return (
    <HostProvider icon={icon}>
      <div className="nvc-dialog">
        <Slide
          screenKey={key}
          rank={rank}
          restoreScroll={screen.kind !== "list" || screen.reveal === null}
        >
          {render()}
        </Slide>
      </div>
    </HostProvider>
  );
}
