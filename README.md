# NVC for Obsidian

Pick feelings or needs from the Center for Nonviolent Communication's word lists
and put them into a note. It adds two commands: **Insert feelings…** and
**Insert needs…**

![The feelings picker: categories as pills, the answered ones showing what was picked](docs/images/feelings-picker.png)

Open a category to mark every word in it at once, or be walked through it a word
at a time with a definition for each — which is how you find the words you would
never have picked off a list. Anything you pick can carry a note of your own, and
so can a category.

![One category open, with several of its words marked](docs/images/category-open.png)

![One word of a walk, with its definition](docs/images/word-card.png)

![The needs picker](docs/images/needs-picker.png)

What lands at the cursor is ordinary markdown, so the note still reads with the
plugin turned off:

```md
- Angry: incensed, indignant, outraged
- Peaceful: calm, content
```

With the plugin on, that block can be redrawn — grouped, one word per line, as a
sentence, as a plain line, or as a table — reopened in the picker to change what
it holds, or handed back to plain markdown for good.

## Install

Not in Obsidian's community directory yet. Until it is,
[BRAT](https://tfthacker.com/BRAT) installs it from this repository's releases:

1. Install **BRAT** from Settings → Community plugins.
2. Run **BRAT: Add a beta plugin for testing** from the command palette.
3. Paste `jmagaram/nvc-obsidian` and click **Add Plugin**.
4. Enable it under Settings → Community plugins.

BRAT checks for new releases on startup, so updates arrive on their own. It
needs Obsidian 1.5.7 or newer, and runs on desktop and mobile.

## Attribution

The feelings and needs word lists, and the category headings they sit under,
come from the Center for Nonviolent Communication's Feelings and Needs
Inventory, © 2023 Center for Nonviolent Communication,
[cnvc.org](https://www.cnvc.org). CNVC gives permission to copy and share it and
asks to be credited. The plugin carries that credit under the categories on the
first screen of the picker, and anything built from this code inherits the same
obligation.

The definitions attached to each word are not from CNVC. The inventory is a bare
word list with no glosses; every definition here was written for this project.

The word lists keep their own terms. Nothing in this repository relicenses them.

## Building it

See [CONTRIBUTING.md](CONTRIBUTING.md) for running the plugin from source, the
component gallery it is built out of, and how releases are cut.
