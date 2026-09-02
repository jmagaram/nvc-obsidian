import { Plugin } from 'obsidian'
import type { Editor } from 'obsidian'
import type { Entry } from '../src/model/entries.ts'
import { toBlock } from '../src/model/block.ts'
import { registerBlocks } from './block.tsx'
import FeelingPickerModal from './FeelingPickerModal.tsx'
// The plugin's own chrome, for the modal frame and for a block in a note.
// Everything else in the shipped styles.css comes from src/dialog.css and
// src/entries.css, which the build reaches through the imports in Dialog.tsx
// and Entries.tsx.
import './styles.css'

export default class NvcPlugin extends Plugin {
  onload() {
    // Blocks first: a note open at load time is drawn before the command can be
    // reached.
    registerBlocks(this)

    /* `editorCallback` rather than `callback`, so the command does not offer
       itself when there is no note open — there would be nowhere to put the
       answer. */
    this.addCommand({
      id: 'insert-feelings',
      name: 'Insert feelings…',
      editorCallback: (editor) => {
        new FeelingPickerModal(this.app, (entries) =>
          insert(editor, entries),
        ).open()
      },
    })
  }
}

/**
 * Put what was picked where the cursor is, as a block the plugin can redraw.
 * Pressing `Insert` having picked nothing writes nothing — an empty line would
 * be a worse answer than none.
 *
 * It always goes in as the default layout, the shape it had before there was a
 * choice. Which layout you want is a question about the note you are looking
 * at, and it is one right-click away once the words are actually on the page —
 * so it is not worth stopping the picker to ask.
 */
function insert(editor: Editor, entries: readonly Entry[]) {
  const text = toBlock(entries)
  if (text) editor.replaceSelection(`${text}\n`)
}
