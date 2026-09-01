import { App, Modal, Notice } from 'obsidian'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { categories } from '../src/data/feelings.ts'
import { Dialog } from '../src/Dialog.tsx'

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
   * Take away Obsidian's own close button and title bar.
   *
   * The dialog draws its own header inside the layer that slides between
   * screens, and Obsidian's button is positioned on the modal, outside it. The
   * two cannot coexist: the header would slide away leaving a × hovering over
   * nothing. So one of them has to go, and the one that animates is ours.
   *
   * Done here rather than in styles.css because a rule has to win on
   * specificity and match a DOM we cannot inspect — on mobile the button is
   * not where the desktop build puts it, and the stylesheet quietly missed it.
   * Searching from containerEl finds it under either shape, and an inline
   * style outranks every sheet. The CSS rule stays as a backup.
   */
  private hideHostChrome() {
    const chrome = this.containerEl.querySelectorAll(
      '.modal-close-button, .modal-header',
    )
    chrome.forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  }

  onClose() {
    // Unmount before Obsidian empties the element React is rendering into.
    this.root?.unmount()
    this.root = null
    this.contentEl.empty()
  }
}
