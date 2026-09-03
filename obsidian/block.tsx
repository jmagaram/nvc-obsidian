import {
  MarkdownRenderChild,
  MarkdownView,
  Menu,
  Notice,
  setIcon,
} from "obsidian";
import type {
  Editor,
  MarkdownPostProcessorContext,
  MarkdownSectionInformation,
  Plugin,
} from "obsidian";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { Inventory } from "../src/data/inventory.ts";
import {
  LANGUAGES,
  languageFor,
  parseBody,
  toBody,
  toPlainMarkdown,
} from "../src/model/block.ts";
import type { Entry, Layout } from "../src/model/entries.ts";
import { resolve } from "../src/model/resolve.ts";
import { Entries } from "../src/ui/Entries.tsx";
import PickerModal from "./PickerModal.tsx";

/**
 * The layouts on offer, in the order the menu lists them.
 *
 * The titles say what you get rather than what the layout is called: `One word
 * per line` and `Plain line` mean something to somebody choosing between them
 * where `column` and `inline` would not. The fence names underneath are
 * permanent and are not these.
 *
 * Auto first, because it is what a new block gets and therefore what the check
 * mark is against until somebody decides otherwise. The two it chooses between
 * follow it, in the order that makes them read as one question: side by side,
 * or one above the other.
 *
 * The icons are the argument in miniature. A wand is the conventional mark for
 * something that works it out for you; `columns` is two things beside each
 * other and `align-start-vertical` is two things stacked against one left edge,
 * which is what those two layouts are; `list` says the next one is a list; and
 * `pilcrow` is a paragraph mark, which is the promise the plain line makes —
 * that what comes out is ordinary prose.
 *
 * **Obsidian ships a curated subset of Lucide, not all of it**, and `setIcon`
 * draws nothing at all for a name outside it — no error, no placeholder, just a
 * menu item with a gap where the glyph goes. Three of the first choices here
 * failed that way and are not coming back: `sparkles`, `columns-2` and `rows-2`
 * are absent, the last two because the bundled generation still calls that
 * glyph `columns` and ships no partner for it. Check a name against the icons
 * in `obsidian.asar` before using it, the same way a bare class name is checked
 * against `app.css`.
 */
const CHOICES: { layout: Layout; title: string; icon: string }[] = [
  { layout: "auto", title: "Auto", icon: "wand-2" },
  { layout: "aligned", title: "Aligned", icon: "columns" },
  { layout: "stacked", title: "Stacked", icon: "align-start-vertical" },
  { layout: "column", title: "One word per line", icon: "list" },
  { layout: "inline", title: "Plain line", icon: "pilcrow" },
];

/** A fence line, and the marker and language written on it. */
const FENCE = /^(\s*(?:`{3,}|~{3,}))([A-Za-z0-9-]+)\s*$/;

/** The line that closes one. */
const CLOSING = /^\s*(?:`{3,}|~{3,})\s*$/;

/**
 * A change to make to the note: `text` replaces lines `from` through `to`,
 * inclusive.
 *
 * `to` one *before* `from` is the empty range — no lines replaced — and is an
 * insertion at `from`. It is not a sentinel and nothing constructs it on
 * purpose: it is what the ordinary arithmetic produces for the body of a fence
 * that has no body, so every consumer below has to be able to read it.
 *
 * Null when the note no longer looks the way the block was drawn from, which is
 * always a reason to do nothing rather than to guess.
 */
type Change = { text: string; from: number; to: number } | null;

type Replace = (lines: string[], info: MarkdownSectionInformation) => Change;

/**
 * Teach the plugin to draw its own blocks.
 *
 * One registration per language, because a code block processor is handed the
 * block's body and never the info string — so the language is the only way for
 * the layout *and which word list is inside* to be known without reading the
 * note back off disk. Both ride down into `render` on the closure, and from
 * there through every menu item, which is why nothing below asks a global which
 * inventory it is looking at.
 */
export function registerBlocks(plugin: Plugin) {
  for (const [language, { inventory, layout }] of LANGUAGES) {
    plugin.registerMarkdownCodeBlockProcessor(language, (source, el, ctx) => {
      render(plugin, source, el, ctx, inventory, layout);
    });
  }
}

function render(
  plugin: Plugin,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  inventory: Inventory,
  layout: Layout,
) {
  /* Asked here, above `parseBody`, and not folded into it. A block holding
     nothing and a block that cannot be read are different answers, and only one
     of them has somewhere useful to go — see `picksIn`. `[]` stands for the
     empty block through the rest of this function, so the flag and the list are
     the same fact read twice and cannot come apart. */
  const empty = source.trim() === "";
  const parsed = empty ? [] : parseBody(source);
  if (!parsed) {
    /* Someone has typed something we cannot read back. Show it as the code
       block it looks like — whatever is in there is theirs, and losing it would
       be the worse failure. The one branch that draws none of our chrome: no
       frame, no menu, no placeholder, because there is nothing here we can
       honestly claim to be drawing. */
    el.createEl("pre").createEl("code", { text: source });
    return;
  }

  el.addClass("nvc-block");
  /* The plain line is the one layout with no frame. Everything the outline
     signals — that this is a record rather than typed text, and that it cannot
     be edited where it sits — is about structure, and this layout has none left
     to signal. It exists to sit inside a sentence somebody is writing, and a
     boxed comma-separated run in the middle of a paragraph is not that.

     Not while it is empty, though. What an empty block draws is an invitation
     to fill it, and an invitation with no frame is a line of text in the middle
     of a note that turns out to be a button. */
  if (layout === "inline" && !empty) el.addClass("is-bare");
  if (empty) {
    placeholder(plugin, ctx, el, inventory);
  } else {
    /* A block that parses but does not resolve is still drawn, from what was
       typed rather than from the inventory: it parsed, so it is ours. Only
       `Edit…` needs it to resolve, because only `Edit…` has to put the words
       back on screens that are built out of the inventory. */
    const opened = resolve(parsed, inventory.categories);
    const entries: readonly Entry[] = opened ?? parsed;
    const root = createRoot(el.createDiv());
    root.render(<Entries entries={entries} layout={layout} />);
    ctx.addChild(new ReactBlock(el, root));
  }

  /* Right-click is the desktop gesture and the button is everything else:
     there is no right-click on a phone, and a visible control is how anyone
     finds out the layout can be changed at all. */
  /* `clickable-icon` is Obsidian's own class for a button that is only an icon,
     and wearing it is not decoration. The app styles a bare `button` as a
     filled pill and does it through `button:not(.clickable-icon)`, which is one
     class and one element — so a single class of ours cannot take the fill off
     and this button drew as a grey lozenge in the corner of every block. The
     class is the documented way out, and it brings the icon's colour, padding
     and hover with it. */
  const button = el.createEl("button", {
    cls: "nvc-block-menu clickable-icon",
    attr: { type: "button", "aria-label": "Block options" },
  });
  setIcon(button, "more-horizontal");
  button.addEventListener("click", (evt) => {
    evt.preventDefault();
    showMenu(plugin, ctx, el, source, inventory, layout, evt);
  });

  el.addEventListener("contextmenu", (evt) => {
    // Nothing to offer where the block has no line in a file — leave Obsidian's
    // own menu alone rather than replacing it with one that cannot do anything.
    if (!ctx.getSectionInfo(el)) return;
    evt.preventDefault();
    showMenu(plugin, ctx, el, source, inventory, layout, evt);
  });
}

/**
 * The way into an empty block: the one control a block can offer when it has
 * nothing to draw.
 *
 * Plain DOM rather than a React sibling of `Entries`. A React root costs a
 * `ctx.addChild(new ReactBlock(…))` to unmount it, and a line of text with a
 * click handler is not worth a root and a lifetime. It is also not `Entries`
 * handed an empty list: that draws an empty grid, or a one-column header for
 * `table`, and asking a component whose whole job is to draw picks to draw the
 * absence of them would make all five layouts answer for a case none of them is
 * about.
 *
 * A real `button`, because this does something rather than going somewhere. A
 * link that navigates nowhere announces itself wrongly to a screen reader and
 * offers a middle-click and a copy-address that mean nothing. It can wear
 * neither `clickable-icon`, which is drawn for a 16px glyph and would be a lie
 * about a line of text, nor the app's own fill, which reads as a form in the
 * middle of somebody's note — so it outranks the app instead, and
 * obsidian/styles.css carries that fight.
 *
 * In a hover popover or an export `edit` finds no section to change and returns
 * without opening anything, which is exactly what `Edit…` in the menu already
 * does there. One rule in one place, rather than a second one here.
 */
function placeholder(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  inventory: Inventory,
) {
  const button = el.createEl("button", {
    cls: "nvc-block-empty",
    attr: { type: "button" },
  });
  /* `icon` is the wrapper both hosts put around a glyph — see the note in
     src/ui/host.tsx — so the gallery's copy of this control lays out in one box
     the way the vault's does, and the two cannot disagree about spacing.

     Hidden from the accessibility tree: the words beside it already say what
     this does, and "plus" would be one more thing to listen past. */
  const glyph = button.createSpan({
    cls: "icon",
    attr: { "aria-hidden": "true" },
  });
  setIcon(glyph, "plus");
  // The noun off the inventory, like every other word that differs between the
  // two lists. The ellipsis is the promise `Edit…` and both commands make: this
  // opens a modal rather than doing something on the spot.
  button.createSpan({ text: `Pick ${inventory.noun.many}…` });
  /* The body goes down as the empty string rather than being threaded from
     `render`: it is blank by construction here, and saying so at the call site
     is clearer than a parameter that could only ever hold the one value. */
  button.addEventListener("click", (evt) => {
    evt.preventDefault();
    edit(plugin, ctx, el, "", inventory);
  });
}

function showMenu(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  source: string,
  inventory: Inventory,
  current: Layout,
  evt: MouseEvent,
) {
  const menu = new Menu();
  const empty = source.trim() === "";

  /* First, and on its own: the other items are about how this block is drawn,
     and this is the only one about what it says. On an empty block it says what
     the placeholder in the middle of that block says, word for word — two names
     for one action would leave a reader working out whether they are two. */
  menu.addItem((item) =>
    item
      .setTitle(empty ? `Pick ${inventory.noun.many}…` : "Edit…")
      .setIcon("pencil")
      .onClick(() => edit(plugin, ctx, el, source, inventory)),
  );
  menu.addSeparator();

  /* All five stay on an empty block, though none of them changes anything on
     screen there. The layout lives on the fence line rather than in the body,
     so choosing it before there is a body is choosing how the block will draw
     once there is one — and taking the choices away would mean the only way to
     set a layout is to fill the block first and then change your mind. */
  for (const choice of CHOICES) {
    menu.addItem((item) =>
      item
        .setTitle(choice.title)
        .setIcon(choice.icon)
        .setChecked(choice.layout === current)
        .onClick(() => setLayout(plugin, ctx, el, inventory, choice.layout)),
    );
  }

  /* The way out. One item rather than five, using the layout on screen: you can
     already see what you are about to get.

     Not offered on an empty block. `unwrap` reads the body back out of the note
     and gives up when it will not parse, which a blank body never does — so the
     item was there and did nothing, silently, which is worse than not being
     there at all. Nothing in `unwrap` changes: the refusal it already makes is
     stated up here instead of being discovered down there. */
  if (!empty) {
    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle("Convert to Markdown")
        /* `unlink`, because that is precisely what this does: the block stops
           being the plugin's and becomes text like any other. A page or a
           document glyph would say "markdown", which the words already say, and
           would leave the one-way part of it unsaid. */
        .setIcon("unlink")
        .onClick(() => unwrap(plugin, ctx, el, inventory, current)),
    );
  }

  menu.showAtMouseEvent(evt);
}

/**
 * Reopen the picker on what this block already holds, which may be nothing.
 *
 * `picksIn` is the validation as well as the reading: a body whose shape is
 * wrong and a body whose words are wrong both arrive here as null, and both get
 * the one message, because past `- Angry: banana` there is nothing useful left
 * to say. A blank body is neither, and comes back as `[]` — the picker opens on
 * a run state-identical to a fresh one and commits into the fence that is
 * already in the note. A block broken badly enough not to parse never reaches
 * this at all: `render` shows it verbatim without a menu.
 */
function edit(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  source: string,
  inventory: Inventory,
) {
  // Nothing to edit where the block has no lines of its own — a hover popover,
  // an embed, an export.
  if (!ctx.getSectionInfo(el)) return;

  const opened = picksIn(source, inventory);
  if (!opened) {
    new Notice(
      "This block can’t be edited: it holds words this plugin doesn’t know. " +
        "Put them back, or convert the block to Markdown.",
    );
    return;
  }

  /* The modal wants a callback that returns nothing, and writing to the note is
     asynchronous — so the promise is run out here rather than handed back. A
     write that fails has to say so: swallowing it would lose the edit with the
     modal already closed and nothing on screen to suggest it. */
  const save = (entries: readonly Entry[]) => {
    void saveEdit(plugin, ctx, el, inventory, opened, entries).catch(() => {
      new Notice("This block couldn’t be saved.");
    });
  };

  new PickerModal(plugin.app, inventory, save, opened).open();
}

/**
 * Write what the picker came back with into the block it was opened on.
 *
 * Only the body is touched, so the block keeps the layout it was being drawn
 * in — which layout you want is a question about the note, and answering it
 * again on every edit would be asking twice.
 *
 * A save that keeps nothing takes the block out rather than leaving an empty
 * one behind. The reason used to be that an empty fence no longer parsed and
 * came back as the verbatim code it looked like; it does not any more — it
 * draws as a placeholder — so the reason is now the gesture itself. Clearing
 * every pick and pressing Save is the only way to take a block out of a note
 * from inside the picker, and there is nothing else it could mean: closing the
 * modal writes nothing, which is what changing your mind looks like. The line
 * it stood on is left blank, which is where the cursor was anyway.
 *
 * A block that was *already* empty is the one exception. Nothing was put in, so
 * there is nothing to take out, and a Save that changed nothing must not remove
 * a fence somebody deliberately left there to be filled in.
 */
async function saveEdit(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  inventory: Inventory,
  opened: readonly Entry[],
  entries: readonly Entry[],
) {
  const body = toBody(entries);

  /* Opened empty and saved empty: the fence is already exactly what it should
     be, and the honest change is no change. Answered up here and not inside the
     change below, because down there `null` is the only way to say no and it is
     the one the Notice reports as a block that moved — which would be a lie
     about a block that did not move and needed nothing written to it. */
  if (!body && opened.length === 0) return;

  const saved = await rewrite(plugin, ctx, el, (lines, info) => {
    if (fenceAt(lines, info.lineStart, inventory) === null) return null;
    if (!CLOSING.test(lines[info.lineEnd] ?? "")) return null;

    /* The note is editable behind a modal, so what is about to be overwritten
       is not necessarily what was opened. Read it back and only write over the
       picks this edit actually started from — anything else and the safe answer
       is the one the rest of this file gives, which is to do nothing. */
    const current = picksIn(
      lines.slice(info.lineStart + 1, info.lineEnd).join("\n"),
      inventory,
    );
    if (!current || !sameEntries(current, opened)) return null;

    /* Body lines only, so the block keeps the layout it was drawn in. On a
       fence with no body there is no line between the two to overwrite:
       `lineEnd - 1` lands one before `lineStart + 1`, which is an inclusive
       range of no lines and therefore an insertion. That falls out of the same
       arithmetic every other change here uses, which is why there is no branch
       for it — `rewrite` is where a range of no lines becomes an insert,
       because that is where a pair of numbers stops being arithmetic and
       becomes an edit to somebody's file. */
    return body
      ? { text: body, from: info.lineStart + 1, to: info.lineEnd - 1 }
      : { text: "", from: info.lineStart, to: info.lineEnd };
  });

  if (!saved) {
    new Notice("This block changed while it was open. Nothing was saved.");
  }
}

/**
 * What a block's body holds, or null when it cannot be read back.
 *
 * Empty is not unreadable. `parseBody` answers null for a blank body and
 * `resolve` answers null for an empty list, and each is right on its own terms —
 * one is the writer's inverse and one is the picker's seed, and neither has
 * anything to hand back. But null in those two means *this cannot be read*, and
 * a block holding nothing is not that. It is a block waiting to be filled.
 *
 * So the distinction is drawn here, above both, rather than by loosening
 * either: making `parseBody` answer `[]` for a blank body would push the same
 * ambiguity into every one of its callers, including the one that must still
 * refuse — `unwrap`, which has nothing to convert.
 *
 * `trim` rather than a comparison against the empty string, because Obsidian
 * may hand the processor `""` or a lone newline for the same fence, and one
 * somebody left a space inside is still empty.
 */
function picksIn(
  source: string,
  inventory: Inventory,
): readonly Entry[] | null {
  if (source.trim() === "") return [];
  return resolve(parseBody(source), inventory.categories);
}

/**
 * Whether two readings of a block hold the same picks.
 *
 * The stored text is the comparison, which is exact rather than approximate
 * because `resolve` hands back one canonical spelling and order for any way of
 * writing the same picks.
 */
function sameEntries(a: readonly Entry[], b: readonly Entry[]): boolean {
  return toBody(a) === toBody(b);
}

/**
 * Redraw this block by rewriting its fence line.
 *
 * The choice belongs in the note rather than in a setting so that each block
 * keeps the shape it was left in, on every device.
 */
async function setLayout(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  inventory: Inventory,
  layout: Layout,
) {
  await rewrite(plugin, ctx, el, (lines, info) => {
    const fence = fenceAt(lines, info.lineStart, inventory);
    if (fence === null) return null;
    return {
      text: `${fence}${languageFor(inventory, layout)}`,
      from: info.lineStart,
      to: info.lineStart,
    };
  });
}

/**
 * Replace the block with the markdown it is drawing, and let go of it.
 *
 * One way on purpose. Past here the text is a list like any other, which is the
 * whole point — the outliner can fold it, a formatter can reflow it, and this
 * plugin has no further claim on it.
 *
 * Nothing is lost on the way. Every layout's output carries both kinds of note,
 * the plain line included, which is what lets this run without asking first.
 */
async function unwrap(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  inventory: Inventory,
  layout: Layout,
) {
  await rewrite(plugin, ctx, el, (lines, info) => {
    if (fenceAt(lines, info.lineStart, inventory) === null) return null;
    if (!CLOSING.test(lines[info.lineEnd] ?? "")) return null;

    // Read the body out of the note rather than trusting what was drawn from —
    // it may have been edited since.
    const body = lines.slice(info.lineStart + 1, info.lineEnd).join("\n");
    const entries = parseBody(body);
    if (!entries) return null;

    const parts = [toPlainMarkdown(entries, layout)];
    /* A fence may interrupt a paragraph; a list may not — and a paragraph may
       not follow one either. Text on the line below is absorbed into the last
       bullet as a lazy continuation, which is the same trap the sublists inside
       the output are shaped around, arriving from outside the block instead.
       Text on the line above swallows the first bullet the same way.

       Not for the plain line, which is the one layout meant to land inside a
       paragraph somebody is already writing. Keeping it off its neighbours
       would be undoing the only thing it is for. */
    if (layout !== "inline") {
      if (lines[info.lineStart - 1]?.trim()) parts.unshift("");
      if (lines[info.lineEnd + 1]?.trim()) parts.push("");
    }

    return { text: parts.join("\n"), from: info.lineStart, to: info.lineEnd };
  });
}

/**
 * The fence marker opening this line, or null if it is not this block's own.
 *
 * The language is looked up rather than matched against a pattern, so the names
 * are spelled once — in `LANGUAGES` — instead of again here, where a list added
 * to the registry would otherwise be a list this file silently did not know.
 *
 * And it has to be *this* inventory's language, not merely one of ours. Every
 * caller is about to overwrite lines it read before a menu or a modal was open,
 * and the note is editable behind both; a feelings block that has since moved
 * onto these lines is exactly the case where doing nothing is the right answer.
 */
function fenceAt(
  lines: string[],
  line: number,
  inventory: Inventory,
): string | null {
  const match = FENCE.exec(lines[line] ?? "");
  if (!match) return null;
  const language = LANGUAGES.get(match[2]);
  return language?.inventory === inventory ? match[1] : null;
}

/**
 * Make a change to the note this block came from.
 *
 * Through the editor whenever the note is open in one, so the change is a
 * single entry on the undo stack — losing a conversion to a stray click would
 * be much worse than losing a layout switch. `vault.process` is the fallback
 * for a block rendered where no editor holds the file (a canvas, an export),
 * and is still the right call there for not clobbering a concurrent write.
 *
 * `replace` runs against whichever copy of the note is about to be written, so
 * it is checking the lines it is actually changing.
 *
 * Reports whether the change was made, for the one caller that has something to
 * say when it was not. `vault.process` may run its callback more than once, so
 * the flag is set inside it rather than around it.
 */
async function rewrite(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  replace: Replace,
): Promise<boolean> {
  /* Null inside a hover popover, an embed, or an export: the block on screen
     has no lines of its own to change. */
  const info = ctx.getSectionInfo(el);
  if (!info) return false;

  const editor = editorFor(plugin, ctx.sourcePath);
  if (editor) {
    const change = replace(editor.getValue().split("\n"), info);
    if (!change) return false;
    if (change.to < change.from) {
      /* No lines to replace — see `Change`. `replaceRange` given one position
         and no second is the editor's insert, and the newline goes on the end
         rather than the front: `from` is the first line *after* the gap, so the
         text has to arrive as whole lines pushed down in front of it.

         Without this branch the empty range goes down as a range whose `from`
         is after its `to`. That is not a bug anybody has hit — until an empty
         block could be edited at all, which is new here, nothing could produce
         one — and it is not known to be broken either: what CodeMirror does
         with a reversed range is simply not something the API says. This branch
         is here so the answer does not have to be looked up or relied on. The
         `vault.process` branch below needs no equivalent, because a splice of
         no lines is already an insert. */
      editor.replaceRange(`${change.text}\n`, { line: change.from, ch: 0 });
      return true;
    }
    editor.replaceRange(
      change.text,
      { line: change.from, ch: 0 },
      { line: change.to, ch: editor.getLine(change.to).length },
    );
    return true;
  }

  const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
  if (!file) return false;
  let written = false;
  await plugin.app.vault.process(file, (data) => {
    const lines = data.split("\n");
    const change = replace(lines, info);
    if (!change) {
      written = false;
      return data;
    }
    /* `to - from + 1` is zero for the empty range, so a splice that replaces
       nothing inserts — the right answer here for the same reason the editor
       branch above needs a case of its own to reach it. */
    lines.splice(change.from, change.to - change.from + 1, change.text);
    written = true;
    return lines.join("\n");
  });
  return written;
}

/**
 * The editor holding this note, if one is open on it.
 *
 * The `instanceof` is not a formality. Since Obsidian 1.7.2 a leaf restored at
 * startup holds a *deferred* view until something needs it, and a deferred view
 * has neither `file` nor `editor` — so a cast would hand back `undefined` as an
 * `Editor` and throw on the first read. A note that has not been looked at yet
 * has no editor to write through, which is what `null` already means here: the
 * caller falls back to `vault.process`.
 */
function editorFor(plugin: Plugin, path: string): Editor | null {
  for (const leaf of plugin.app.workspace.getLeavesOfType("markdown")) {
    const view = leaf.view;
    if (view instanceof MarkdownView && view.file?.path === path) {
      return view.editor;
    }
  }
  return null;
}

/** Ties the React root's life to the rendered block's. */
class ReactBlock extends MarkdownRenderChild {
  private root: Root;

  constructor(el: HTMLElement, root: Root) {
    super(el);
    this.root = root;
  }

  onunload() {
    this.root.unmount();
  }
}
