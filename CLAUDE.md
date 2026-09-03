# nvc-toolkit

An Obsidian plugin that picks feelings or needs from the CNVC word lists and
writes them into a note, and the component gallery it is built out of.

`README.md` is the shopfront. `CONTRIBUTING.md` has the build, the vault deploy
and the release — read it rather than working any of that out again from here.
This file is the part neither of those covers: the conventions the code already
follows, and the things that look like tidying but are not.

## How it is arranged

`src/` is the picker and knows nothing about Obsidian. `obsidian/` is a thin
shell over it — the modal, the two commands, and the block a note holds. The
gallery hosts the same picker in a browser.

The dependency runs **model → ui and never back**; `src/model/entries.ts:55`
says so where it would be tempting to break it. Nothing in `src/model/` imports
React.

There is one picker and two word lists. Which list a run is picking from is an
`Inventory` (`src/data/inventory.ts`), handed down from the command that opened
the modal or from the block being edited. Nothing below that seam asks which
list it is looking at, and new code should not start.

## Where state lives

One reducer, and `src/Dialog.tsx:69` holds the only `useReducer` in the repo.

- `src/model/types.ts` — `State`, a discriminated `View` union, and a flat
  `Action` union. The invariants the reducer maintains are written above `State`.
- `src/model/reducer.ts` — two inits and one pure `reducer`. The shuffle is
  injected rather than called, so a run can be made reproducible.
- `src/model/screen.ts` — the selector layer. `Screen` is deliberately a
  _different_ union from `View`, split so that no component can test for a value
  that cannot be there. Add a screen variant here, not a conditional in a
  component.
- `src/model/entries.ts` — the serialization seam, both directions.
- `src/model/resolve.ts` — all-or-nothing canonicalization of what a note holds.

Local interaction state stays out of the reducer on purpose: the roving-tabindex
index in `Hub` and `List`, refs, and the animation state in `Slide.tsx`.
`obsidian/PickerModal.tsx` holds no picker state at all.

## Components

Props are typed inline on the destructured parameter. There is no `type Props`
and no `interface` anywhere in `src/` or `obsidian/` — do not introduce the
first one. Named exports throughout; the only default exports are the three
shapes a host requires. Files under `src/ui/` are named for the `Screen.kind`
they draw.

Screens are presentational with respect to domain state: they get a slice of
`Screen` plus `onX` callbacks, and never read the reducer.

Logic with no DOM in it is pulled out into a lowercase module beside the
components that use it — `keyboard.ts`, `arrival.ts`, `press.ts`, `motion.ts` —
so that it can be read and checked without a browser. When a calculation starts
growing inside a component, that is where it goes.

## Styling

Plain global `.css` files, imported for their side effect by the module that
owns them. No CSS Modules, no framework, no CSS-in-JS. Obsidian loads exactly
one stylesheet, so the plugin build writes exactly one — everything reachable
from `obsidian/main.ts`'s import graph. A style missing from a build is a
dropped import, not a missing file.

**Every colour and size is an Obsidian variable, with no fallback literals**
(`src/dialog.css:9`), so there is one place to change a value. The shipping
stylesheets contain no hex, `rgb()` or `hsl()` at all; the literals live in
`src/gallery-obsidian.css`, which is the browser's stand-in for Obsidian's own
variables and does not ship. A component never names a colour.

The project's own properties are `--nvc-`-prefixed and defined on `.nvc-dialog`.

Class names are not a free choice (`src/dialog.css:41`): a class either belongs
to the host on purpose — `clickable-icon`, `modal-title`, `mod-cta` — or it is
prefixed with the screen that owns it. Obsidian ships a global `.card` and
`.action-row`, and a collision is invisible until it is not. To check a bare
name, read Obsidian's own `app.css`, extracted from `obsidian.asar`.

## The words

`src/data/feelings.ts` and `src/data/needs.ts` reproduce the CNVC inventory
unchanged, verified word for word against the source. Each file lists the
apparent transcription errors that are **not** errors — a word in two
categories, a word in both polarities — so that a future reader does not
helpfully correct the data. Do not.

Rules derive from the string at runtime. Nothing should be hardwired to today's
inventory, because the inventory changes.

## What can never change

- **Inventory ids** (`src/data/inventory.ts`). They are the word after `nvc-` in
  every fence language and the tail of every command id.
- **Command ids** (`obsidian/main.ts`). Obsidian files a user's hotkey under
  `nvc-toolkit:insert-feelings`; renaming the command silently unbinds it. It
  reads like a coincidence to tidy up. It is not.
- **Fence languages, and the layout names inside them** (`src/model/block.ts`,
  `obsidian/block.tsx`). The user-facing layout titles are deliberately not the
  fence names. A language that is not registered is not a block at all —
  Obsidian draws that fence as code — so renaming one silently un-blocks every
  block already written under it.
- **The plugin `id`** in `manifest.json`, which is the folder name in every
  vault that has installed it.

A block's fence language is its whole identity: Obsidian hands a code block
processor the body and never the info string, and the body is deliberately plain
markdown so the note still reads with the plugin off. Drop the language and
`- Connection: trust` and `- Angry: irate` are the same kind of thing.

## Traps

- There is no `process` on Obsidian mobile, which is why the plugin build
  defines `process.env.NODE_ENV`.
- `scrollIntoView` is banned inside the dialog — it drags whatever is behind the
  modal along with it. Use `scrollIntoDialogBody` (`src/ui/keyboard.ts:59`).
- Every screen must call `useFocusOnArrival` (`src/ui/arrival.ts:32`). A mouse
  never notices; a keyboard is stranded on every screen change.
- Press feedback cannot be `:active` — that is a pointer state, and a button
  pressed with Enter never enters it (`src/ui/press.ts:5`).
- A shortcut and the hint that announces it ship together, or you get a key
  nothing advertises and a hint for a key nothing binds. Both fail quietly.
- The `auto` layout measures the aligned arrangement and switches the whole
  block to stacked when any word run has wrapped (`src/ui/measure.ts`). It reads
  `getClientRects().length`, which needs the word runs to stay `display: inline`
  — as flex or grid items they are one rect however many lines they occupy, and
  the block would silently never stack. This one _does_ work headlessly: it
  hangs off layout rather than off animation.
- A rewrite re-reads the note and compares before writing. The note is editable
  behind a modal, so what was drawn from is never trusted.
- A blank note is a delete, everywhere.
- The mobile modal's geometry is three declarations that only work together
  (`obsidian/styles.css:96`). Change one and the top edge moves.

## Checking your work

There are no tests, and adding a test runner is not the answer to a change — try
it in the gallery (`npm run dev`), then in a vault (`npm run plugin:deploy`).

Without a browser attached, build the gallery and drive it with headless
Chrome's `--dump-dom`. A headless run has no rendering loop: `requestAnimationFrame`,
animation progress and WAAPI `onfinish` never fire, and a synthetic pointer
makes no click. That is a real limit here, because `Slide` and
`src/ui/arrival.ts` both hang off animation completion — a screen that never
"arrives" headlessly may be fine in the app.
