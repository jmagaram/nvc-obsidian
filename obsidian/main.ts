import { Plugin } from "obsidian";
import type { Editor } from "obsidian";
import { INVENTORIES } from "../src/data/inventory.ts";
import type { Inventory } from "../src/data/inventory.ts";
import type { Entry } from "../src/model/entries.ts";
import { toBlock } from "../src/model/block.ts";
import { registerBlocks } from "./block.tsx";
import PickerModal from "./PickerModal.tsx";
import { TEMPLATES } from "./templates.ts";
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

    /* One command per template, from the registry the text lives in, for the
       same reason the loop above reads `INVENTORIES`: a template that arrived
       without a way to write it is a mistake this shape cannot make.

       `editorCallback` again, and for a second reason on top of the first — a
       template is written into the note you are looking at, so without one open
       there is nowhere for it to go and nothing for the command to mean. */
    for (const template of TEMPLATES) {
      this.addCommand({
        id: template.id,
        name: template.name,
        editorCallback: (editor) => insertTemplate(editor, template.text),
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

/**
 * Put a template where the cursor is, starting on a line of its own.
 *
 * A heading with anything at all in front of it on the line is not a heading,
 * and the first thing in a template is one — so a blank line goes in first
 * whenever the cursor is not already at the start of an empty one. Two newlines
 * rather than one, because a heading wants air above it and this is landing in
 * the middle of a note somebody is already writing.
 *
 * One on the end for the same reason, whichever way it went in: the last thing
 * in a template is a callout, and whatever was already below the cursor would
 * otherwise start on the line straight after it.
 *
 * `insert` above does none of this and is deliberately left alone. It is an
 * older command, changing what it writes would change notes people are already
 * keeping, and a fence dropped into the middle of a line is a mistake you see
 * immediately and undo in one keystroke. Thirty lines whose first heading
 * quietly became body text is not.
 */
function insertTemplate(editor: Editor, text: string) {
  const at = editor.getCursor("from");
  // `from`, so a selection about to be replaced is measured at its start rather
  // than at whichever end the cursor happens to be sitting on.
  const before = editor.getLine(at.line).slice(0, at.ch);
  const lead = before.trim() === "" ? "" : "\n\n";
  editor.replaceSelection(`${lead}${text}\n`);
}
