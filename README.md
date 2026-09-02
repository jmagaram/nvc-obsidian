# NVC for Obsidian

Browse feelings by category, pick the ones that fit, and insert them into a
note. Built from the Center for Nonviolent Communication's word list.

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

## Working on it

```sh
npm run dev             # the component gallery, in a browser
npm run gallery:build   # build the gallery
npm run plugin:build    # build the plugin
npm run plugin:deploy   # build it and copy it into a vault
npm run lint
```

`src/` is the picker itself and the gallery that hosts it; `obsidian/` is the
thin plugin shell — the modal, the command, and the stylesheet that adapts the
picker to Obsidian's own.

`plugin:deploy` reads `OBSIDIAN_VAULT` from `.env.local`.
