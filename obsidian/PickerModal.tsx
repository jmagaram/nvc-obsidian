import { App, Modal, Platform, setIcon } from "obsidian";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { Inventory } from "../src/data/inventory.ts";
import { Dialog } from "../src/Dialog.tsx";
import type { Entry } from "../src/model/entries.ts";

/** Obsidian's own modal chrome, which this plugin replaces with its own. */
const HOST_CHROME = [
  "modal-header-button",
  "modal-close-button",
  "modal-header",
  "modal-title",
];

/**
 * The picker in an Obsidian modal.
 *
 * Obsidian's `Modal` supplies the backdrop, focus trap and Escape handling that
 * the browser gallery's `.frame` stands in for. It also supplies a title bar and
 * a close button, which this plugin hides — the dialog draws its own header, `‹`
 * and `×`, and two of each would be one too many. See obsidian/styles.css.
 *
 * Two callers, and the only difference between them is `initial`: the command
 * opens it empty to write a new block at the cursor, and `Edit…` opens it on
 * what a block already holds and writes the answer back over that block. The
 * dialog reads `initial` for both the seed and the word on its button, so
 * nothing here has to say which case it is.
 *
 * Closing without committing writes nothing, on either.
 *
 * Which word list is a parameter rather than an import, because there is one
 * picker and two lists: the command that opened it and the block being edited
 * each know which, and neither would be served by a second copy of this class.
 */
export default class PickerModal extends Modal {
  private root: Root | null = null;
  private readonly inventory: Inventory;
  private readonly onCommit: (entries: readonly Entry[]) => void;
  /** What a block already holds, when this was opened to edit one. */
  private readonly initial: readonly Entry[] | undefined;

  constructor(
    app: App,
    inventory: Inventory,
    onCommit: (entries: readonly Entry[]) => void,
    initial?: readonly Entry[],
  ) {
    super(app);
    this.inventory = inventory;
    this.onCommit = onCommit;
    this.initial = initial;
  }

  onOpen() {
    this.modalEl.addClass("nvc-modal");
    this.hideHostChrome();
    /* Obsidian parks initial focus on its close button, which this plugin
       hides — leaving nothing focused and Tab starting outside the modal. Take
       focus onto the content instead so the keyboard has somewhere to begin. */
    this.contentEl.tabIndex = -1;
    this.root = createRoot(this.contentEl);
    this.root.render(
      <Dialog
        inventory={this.inventory}
        icon={setIcon}
        isMac={Platform.isMacOS}
        initial={this.initial}
        onCommit={(entries) => {
          this.onCommit(entries);
          this.close();
        }}
        onClose={() => this.close()}
      />,
    );
    this.contentEl.focus();
    this.pinModal();
  }

  /**
   * Keep the modal where it was put when the on-screen keyboard opens.
   *
   * iOS answers a focus by scrolling the web view until the focused field
   * clears the keyboard, and it does that without knowing this modal has
   * already shrunk by `--keyboard-height` — see obsidian/styles.css — so the
   * field was never covered. A field taller than the room above the keyboard
   * cannot be cleared at all, and WebKit answers that by scrolling as far as it
   * goes and giving up, which leaves the modal and its header above the top of
   * the screen. src/dialog.css caps the note field so there is always room, and
   * src/ui/Note.tsx keeps the focus itself from asking for a scroll; this puts
   * back whatever still arrives.
   *
   * A net, not the mechanism, and it never was: a header that ended up behind
   * the island had a second cause with nothing to do with scrolling, in the
   * modal's own height arithmetic, and that one is fixed in obsidian/styles.css
   * rather than caught here. Nothing this listener zeroes would have shown it.
   *
   * Behind a phone's modal there is nothing that scrolls, so any offset here is
   * WebKit's and is always wrong. Desktop is left alone: it has no keyboard to
   * make room for, and a scroll there could be somebody's.
   */
  private pinModal() {
    if (!Platform.isMobile) return;
    // `scroll` does not bubble, so listen in the capture phase — the element
    // WebKit moved is rarely the one we would have guessed.
    window.addEventListener("scroll", this.restoreOffset, true);
    // The keyboard finishing its slide is a viewport resize, not a scroll, and
    // it is the moment the modal changes height under a settled offset.
    window.visualViewport?.addEventListener("resize", this.restoreOffset);
  }

  /* Silent when there is nothing to undo, so setting the offset back to zero
     cannot answer its own scroll event. An arrow property, so adding and
     removing the listener name the same function. */
  private readonly restoreOffset = () => {
    if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    if (this.containerEl.scrollTop !== 0) this.containerEl.scrollTop = 0;
    if (this.containerEl.scrollLeft !== 0) this.containerEl.scrollLeft = 0;
  };

  /**
   * Take away Obsidian's own close button and title bar, so the only × is the
   * one in our header — the one that travels with it when a screen slides.
   *
   * styles.css does this too, and on desktop that is enough. This exists for
   * the case the stylesheet cannot reach: a button attached beside `.modal`
   * rather than inside it, where a descendant selector under `.nvc-modal` never
   * matches. Querying from containerEl covers both shapes. Belt and braces, not
   * the primary mechanism.
   */
  private hideHostChrome() {
    /* Direct children only. The dialog's own header wears `.modal-title` and
       `.clickable-icon` to inherit Obsidian's styling, so anything matching by
       class alone would hide the header it is meant to be protecting. */
    for (const parent of [this.containerEl, this.modalEl]) {
      for (const el of Array.from(parent.children)) {
        if (
          el instanceof HTMLElement &&
          HOST_CHROME.some((c) => el.classList.contains(c))
        ) {
          el.setCssStyles({ display: "none" });
        }
      }
    }
  }

  onClose() {
    window.removeEventListener("scroll", this.restoreOffset, true);
    window.visualViewport?.removeEventListener("resize", this.restoreOffset);
    // Unmount before Obsidian empties the element React is rendering into.
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
