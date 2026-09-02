import { MarkdownRenderChild, MarkdownView, Menu, Notice, setIcon } from 'obsidian'
import type {
  Editor,
  MarkdownPostProcessorContext,
  MarkdownSectionInformation,
  Plugin,
} from 'obsidian'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { categories } from '../src/data/feelings.ts'
import {
  LANGUAGES,
  languageFor,
  parseBody,
  toBody,
  toPlainMarkdown,
} from '../src/model/block.ts'
import type { Entry, Layout } from '../src/model/entries.ts'
import { resolve } from '../src/model/resolve.ts'
import { Entries } from '../src/ui/Entries.tsx'
import FeelingPickerModal from './FeelingPickerModal.tsx'

/**
 * The layouts on offer, in the order the menu lists them.
 *
 * The titles say what you get rather than what the layout is called: `Grouped`
 * and `Sentence` mean something to somebody choosing between them where `Gloss`
 * would not. The fence names underneath are permanent and are not these.
 */
const CHOICES: { layout: Layout; title: string; icon: string }[] = [
  { layout: 'gloss', title: 'Grouped', icon: 'list' },
  { layout: 'column', title: 'One word per line', icon: 'list-ordered' },
  { layout: 'sentence', title: 'Sentence', icon: 'text' },
  { layout: 'inline', title: 'Plain line', icon: 'minus' },
  { layout: 'table', title: 'Table', icon: 'table' },
]

/** A fence line for one of our languages, and nothing else. */
const FENCE = /^(\s*(?:`{3,}|~{3,}))nvc-feelings(?:-[a-z]+)?\s*$/

/** The line that closes one. */
const CLOSING = /^\s*(?:`{3,}|~{3,})\s*$/

/**
 * A change to make to the note: `text` replaces lines `from` through `to`.
 * Null when the note no longer looks the way the block was drawn from, which is
 * always a reason to do nothing rather than to guess.
 */
type Change = { text: string; from: number; to: number } | null

type Replace = (lines: string[], info: MarkdownSectionInformation) => Change

/**
 * Teach the plugin to draw its own blocks.
 *
 * One registration per language, because a code block processor is handed the
 * block's body and never the info string — so the language is the only way for
 * the layout to be known without reading the note back off disk.
 */
export function registerBlocks(plugin: Plugin) {
  for (const [language, layout] of Object.entries(LANGUAGES)) {
    plugin.registerMarkdownCodeBlockProcessor(language, (source, el, ctx) => {
      render(plugin, source, el, ctx, layout)
    })
  }
}

function render(
  plugin: Plugin,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  layout: Layout,
) {
  const parsed = parseBody(source)
  if (!parsed) {
    /* Someone has typed something we cannot read back. Show it as the code
       block it looks like rather than drawing an empty one — whatever is in
       there is theirs, and losing it would be the worse failure. */
    el.createEl('pre').createEl('code', { text: source })
    return
  }

  /* A block that parses but does not resolve is still drawn, from what was
     typed rather than from the inventory: it parsed, so it is ours. Only
     `Edit…` needs it to resolve, because only `Edit…` has to put the words back
     on screens that are built out of the inventory. */
  const opened = resolve(parsed, categories)
  const entries: readonly Entry[] = opened ?? parsed

  el.addClass('nvc-block')
  const root = createRoot(el.createDiv())
  root.render(<Entries entries={entries} layout={layout} />)
  ctx.addChild(new ReactBlock(el, root))

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
  const button = el.createEl('button', {
    cls: 'nvc-block-menu clickable-icon',
    attr: { type: 'button', 'aria-label': 'Block options' },
  })
  setIcon(button, 'more-horizontal')
  button.addEventListener('click', (evt) => {
    evt.preventDefault()
    showMenu(plugin, ctx, el, source, layout, evt)
  })

  el.addEventListener('contextmenu', (evt) => {
    // Nothing to offer where the block has no line in a file — leave Obsidian's
    // own menu alone rather than replacing it with one that cannot do anything.
    if (!ctx.getSectionInfo(el)) return
    evt.preventDefault()
    showMenu(plugin, ctx, el, source, layout, evt)
  })
}

function showMenu(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  source: string,
  current: Layout,
  evt: MouseEvent,
) {
  const menu = new Menu()

  /* First, and on its own: the other items are about how this block is drawn,
     and this is the only one about what it says. */
  menu.addItem((item) =>
    item
      .setTitle('Edit…')
      .setIcon('pencil')
      .onClick(() => edit(plugin, ctx, el, source)),
  )
  menu.addSeparator()

  for (const choice of CHOICES) {
    menu.addItem((item) =>
      item
        .setTitle(choice.title)
        .setIcon(choice.icon)
        .setChecked(choice.layout === current)
        .onClick(() => setLayout(plugin, ctx, el, choice.layout)),
    )
  }

  /* The way out. One item rather than five, using the layout on screen: you can
     already see what you are about to get. */
  menu.addSeparator()
  menu.addItem((item) =>
    item
      .setTitle('Convert to Markdown')
      .setIcon('file-text')
      .onClick(() => unwrap(plugin, ctx, el, current)),
  )

  menu.showAtMouseEvent(evt)
}

/**
 * Reopen the picker on what this block already holds.
 *
 * `resolve` is the validation as well as the reading: a body whose shape is
 * wrong and a body whose words are wrong both arrive here as null, and both get
 * the one message, because past `- Angry: banana` there is nothing useful left
 * to say. A block broken badly enough not to parse never reaches this at all —
 * `render` shows it verbatim without a menu.
 */
function edit(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  source: string,
) {
  // Nothing to edit where the block has no lines of its own — a hover popover,
  // an embed, an export.
  if (!ctx.getSectionInfo(el)) return

  const opened = resolve(parseBody(source), categories)
  if (!opened) {
    new Notice(
      'This block can’t be edited: it holds words this plugin doesn’t know. ' +
        'Put them back, or convert the block to Markdown.',
    )
    return
  }

  /* The modal wants a callback that returns nothing, and writing to the note is
     asynchronous — so the promise is run out here rather than handed back. A
     write that fails has to say so: swallowing it would lose the edit with the
     modal already closed and nothing on screen to suggest it. */
  const save = (entries: readonly Entry[]) => {
    void saveEdit(plugin, ctx, el, opened, entries).catch(() => {
      new Notice('This block couldn’t be saved.')
    })
  }

  new FeelingPickerModal(plugin.app, save, opened).open()
}

/**
 * Write what the picker came back with into the block it was opened on.
 *
 * Only the body is touched, so the block keeps the layout it was being drawn
 * in — which layout you want is a question about the note, and answering it
 * again on every edit would be asking twice.
 *
 * A save that keeps nothing takes the block out rather than leaving an empty
 * one behind: an empty fence is a block that no longer parses, drawn back as
 * the verbatim code it looks like. The line it stood on is left blank, which is
 * where the cursor was anyway.
 */
async function saveEdit(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  opened: readonly Entry[],
  entries: readonly Entry[],
) {
  const body = toBody(entries)

  const saved = await rewrite(plugin, ctx, el, (lines, info) => {
    if (fenceAt(lines, info.lineStart) === null) return null
    if (!CLOSING.test(lines[info.lineEnd] ?? '')) return null

    /* The note is editable behind a modal, so what is about to be overwritten
       is not necessarily what was opened. Read it back and only write over the
       picks this edit actually started from — anything else and the safe answer
       is the one the rest of this file gives, which is to do nothing. */
    const current = resolve(
      parseBody(lines.slice(info.lineStart + 1, info.lineEnd).join('\n')),
      categories,
    )
    if (!current || !sameEntries(current, opened)) return null

    return body
      ? { text: body, from: info.lineStart + 1, to: info.lineEnd - 1 }
      : { text: '', from: info.lineStart, to: info.lineEnd }
  })

  if (!saved) {
    new Notice('This block changed while it was open. Nothing was saved.')
  }
}

/**
 * Whether two readings of a block hold the same picks.
 *
 * The stored text is the comparison, which is exact rather than approximate
 * because `resolve` hands back one canonical spelling and order for any way of
 * writing the same picks.
 */
function sameEntries(a: readonly Entry[], b: readonly Entry[]): boolean {
  return toBody(a) === toBody(b)
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
  layout: Layout,
) {
  await rewrite(plugin, ctx, el, (lines, info) => {
    const fence = fenceAt(lines, info.lineStart)
    if (fence === null) return null
    return {
      text: `${fence}${languageFor(layout)}`,
      from: info.lineStart,
      to: info.lineStart,
    }
  })
}

/**
 * Replace the block with the markdown it is drawing, and let go of it.
 *
 * One way on purpose. Past here the text is a table or a list like any other,
 * which is the whole point — Obsidian's table editor can add a column to it,
 * and this plugin has no further claim on it.
 */
async function unwrap(
  plugin: Plugin,
  ctx: MarkdownPostProcessorContext,
  el: HTMLElement,
  layout: Layout,
) {
  await rewrite(plugin, ctx, el, (lines, info) => {
    if (fenceAt(lines, info.lineStart) === null) return null
    if (!CLOSING.test(lines[info.lineEnd] ?? '')) return null

    // Read the body out of the note rather than trusting what was drawn from —
    // it may have been edited since.
    const body = lines.slice(info.lineStart + 1, info.lineEnd).join('\n')
    const entries = parseBody(body)
    if (!entries) return null

    const parts = [toPlainMarkdown(entries, layout)]
    /* A fence may interrupt a paragraph; a table may not. Text on the line
       above would swallow it and leave a row of literal pipes on screen. */
    if (layout === 'table') {
      if (lines[info.lineStart - 1]?.trim()) parts.unshift('')
      if (lines[info.lineEnd + 1]?.trim()) parts.push('')
    }

    return { text: parts.join('\n'), from: info.lineStart, to: info.lineEnd }
  })
}

/** The fence marker opening this line, or null if it is not one of ours. */
function fenceAt(lines: string[], line: number): string | null {
  const match = FENCE.exec(lines[line] ?? '')
  return match ? match[1] : null
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
  const info = ctx.getSectionInfo(el)
  if (!info) return false

  const editor = editorFor(plugin, ctx.sourcePath)
  if (editor) {
    const change = replace(editor.getValue().split('\n'), info)
    if (!change) return false
    editor.replaceRange(
      change.text,
      { line: change.from, ch: 0 },
      { line: change.to, ch: editor.getLine(change.to).length },
    )
    return true
  }

  const file = plugin.app.vault.getFileByPath(ctx.sourcePath)
  if (!file) return false
  let written = false
  await plugin.app.vault.process(file, (data) => {
    const lines = data.split('\n')
    const change = replace(lines, info)
    if (!change) {
      written = false
      return data
    }
    lines.splice(change.from, change.to - change.from + 1, change.text)
    written = true
    return lines.join('\n')
  })
  return written
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
  for (const leaf of plugin.app.workspace.getLeavesOfType('markdown')) {
    const view = leaf.view
    if (view instanceof MarkdownView && view.file?.path === path) {
      return view.editor
    }
  }
  return null
}

/** Ties the React root's life to the rendered block's. */
class ReactBlock extends MarkdownRenderChild {
  private root: Root

  constructor(el: HTMLElement, root: Root) {
    super(el)
    this.root = root
  }

  onunload() {
    this.root.unmount()
  }
}
