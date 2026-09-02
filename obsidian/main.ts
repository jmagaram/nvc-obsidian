import { Plugin } from "obsidian";
import type { Editor } from "obsidian";
import { INVENTORIES } from "../src/data/inventory.ts";
import type { Inventory } from "../src/data/inventory.ts";
import type { Entry } from "../src/model/entries.ts";
import { toBlock } from "../src/model/block.ts";
import { registerBlocks } from "./block.tsx";
import PickerModal from "./PickerModal.tsx";
// The plugin's own chrome, for the modal frame and for a block in a note.
// Everything else in the shipped styles.css comes from src/dialog.css and
// src/entries.css, which the build reaches through the imports in Dialog.tsx
// and Entries.tsx.
import "./styles.css";

export default class NvcPlugin extends Plugin {
  onload() {
    // Blocks first: a note open at load time is drawn before the command can be
    // reached.
    registerBlocks(this);

    /* One command per list, from the same registry the fence languages are
       built from, so a list cannot arrive with a block processor and no way to
       write one.

       The id is `insert-<id>`, which reproduces `insert-feelings` exactly. That
       is not a coincidence to be tidied up later: Obsidian files a user's
       hotkey under `nvc-toolkit:insert-feelings`, and renaming the command
       would silently unbind it.

       `editorCallback` rather than `callback`, so a command does not offer
       itself when there is no note open — there would be nowhere to put the
       answer. */
    for (const inventory of INVENTORIES) {
      this.addCommand({
        id: `insert-${inventory.id}`,
        name: `${inventory.title}…`,
        editorCallback: (editor) => {
          new PickerModal(this.app, inventory, (entries) =>
            insert(editor, entries, inventory),
          ).open();
        },
      });
    }
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
function insert(
  editor: Editor,
  entries: readonly Entry[],
  inventory: Inventory,
) {
  const text = toBlock(entries, inventory);
  if (text) editor.replaceSelection(`${text}\n`);
}
