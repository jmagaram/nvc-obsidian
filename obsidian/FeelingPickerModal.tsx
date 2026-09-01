import { App, Modal, Notice, setIcon } from 'obsidian'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { categories } from '../src/data/feelings.ts'
import { Dialog } from '../src/Dialog.tsx'

/** Obsidian's own modal chrome, which this plugin replaces with its own. */
const HOST_CHROME = [
  'modal-header-button',
  'modal-close-button',
  'modal-header',
  'modal-title',
]

/**
 * The picker in an Obsidian modal.
 *
 * Obsidian's `Modal` supplies the backdrop, focus trap and Escape handling that
 * the browser gallery's `.frame` stands in for. It also supplies a title bar and
 * a close button, which this plugin hides — the dialog draws its own header, `‹`
 * and `×`, and two of each would be one too many. See obsidian/styles.css.
 *
 * Nothing is written to a note yet. `Insert` reports what it would have written
 * and closes, which is enough to prove the button works while the markdown
 * format is still undecided.
 */
export default class FeelingPickerModal extends Modal {
  private root: Root | null = null

  constructor(app: App) {
    super(app)
  }

  onOpen() {
    this.modalEl.addClass('nvc-modal')
    this.hideHostChrome()
    /* Obsidian parks initial focus on its close button, which this plugin
       hides — leaving nothing focused and Tab starting outside the modal. Take
       focus onto the content instead so the keyboard has somewhere to begin. */
    this.contentEl.tabIndex = -1
    this.root = createRoot(this.contentEl)
    this.root.render(
      <Dialog
        categories={categories}
        icon={setIcon}
        onInsert={(markdown) => {
          const lines = markdown.split('\n').filter((l) => l.startsWith('- '))
          new Notice(
            `Would insert ${lines.length} feeling${lines.length === 1 ? '' : 's'}.`,
          )
          this.close()
        }}
        onClose={() => this.close()}
      />,
    )
    this.contentEl.focus()
  }

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
        if (el instanceof HTMLElement && HOST_CHROME.some((c) => el.classList.contains(c))) {
          el.style.display = 'none'
        }
      }
    }
  }

  onClose() {
    // Unmount before Obsidian empties the element React is rendering into.
    this.root?.unmount()
    this.root = null
    this.contentEl.empty()
  }
}
