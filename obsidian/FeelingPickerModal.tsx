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
  }

  onClose() {
    // Unmount before Obsidian empties the element React is rendering into.
    this.root?.unmount()
    this.root = null
    this.contentEl.empty()
  }
}
