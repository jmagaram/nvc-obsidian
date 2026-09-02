# Contributing

This repo is two things: the Obsidian plugin, and the gallery of React
components it is built out of. `obsidian/` is a thin shell — the modal, the two
commands, and the block a note holds — over `src/`, which is the picker itself
and knows nothing about Obsidian. A change to a component is a change to the
plugin.

## Build it yourself

Point `.env.local` at your vault folder — the one containing `.obsidian` — and
deploy:

```sh
npm install
echo 'OBSIDIAN_VAULT=/path/to/your/vault' > .env.local
npm run plugin:deploy
```

Then enable the plugin under Settings → Community plugins. `npm run plugin:dev`
rebuilds and redeploys on every change; with pjeby's
[Hot Reload](https://github.com/pjeby/hot-reload) plugin installed, Obsidian
picks each build up on its own, because the deploy touches the `.hotreload` file
that plugin watches for. Without it, reload the vault by hand after a build.

`.env.local` is gitignored — the vault path is one machine's, not the
project's. Use a scratch vault rather than the one you write in; a plugin under
development throws, and a note is a bad place to find that out.

## Run it on a phone, or without building

[BRAT](https://tfthacker.com/BRAT) installs a plugin from a repository's
releases rather than from the directory, which is how a tagged version gets onto
a device that cannot build one:

1. Install **BRAT** from Settings → Community plugins.
2. Run **BRAT: Add a beta plugin for testing** from the command palette.
3. Paste `jmagaram/nvc-obsidian` and click **Add Plugin**.
4. Enable the plugin under Settings → Community plugins.

BRAT checks for new releases on startup, so updates arrive on their own. It only
ever sees a release that has been published — see **Releasing** below. Don't run
this and a build of your own in the same vault; disable whichever you are not
testing.

## The component gallery

The gallery is a plain web page that hosts the picker outside Obsidian, and it
is where most of the work happens.

```sh
npm run dev
```

Nothing in `src/` knows it is in Obsidian, so the gallery is the fast loop and
the vault is the check. There are no tests: try a change in the gallery, then in
a vault.

## The scripts

```sh
npm run dev             # the gallery, in a browser
npm run gallery:build   # build the gallery, into dist/
npm run plugin:build    # typecheck, then build the plugin into build/
npm run plugin:dev      # build on change, straight into the vault
npm run plugin:deploy   # build once and copy it into the vault
npm run lint
npm run version:bump    # set the version in the two files that carry it
npm run release         # bump, commit, push, tag — the tag cuts the release
```

`npm run build` is the **plugin** build, not the gallery's. The community
directory's scanner reproduces a release from source by running it and checking
the output against the release assets, so it has to stay the plugin one.

## How the build works

Two Vite configs. `vite.config.ts` builds the gallery into `dist/`;
`vite.plugin.config.ts` builds the plugin into `build/`. Vite for both, rather
than esbuild for the plugin, so the gallery and the plugin resolve CSS
identically and the repo keeps one bundler.

`build/`, not a name of our own: the directory's scanner looks for `main.js` at
the repo root or in `dist/`, `build/` or `out/`, and `dist/` is already the
gallery's.

What comes out is the three files Obsidian downloads by name, plus one more:

- **`main.js`** — CommonJS, which is what Obsidian loads. `obsidian`,
  `electron` and the Node builtins are external because the app supplies them;
  everything else, React included, is bundled, since Obsidian provides no React.
  `process.env.NODE_ENV` is defined at build time because React reads it and
  there is no `process` on Obsidian mobile.
- **`styles.css`** — Obsidian loads exactly one stylesheet, so
  `cssCodeSplit` is off and every CSS file reachable from `obsidian/main.ts`'s
  import graph lands in it. If a style goes missing from a build, an import was
  dropped, not a file.
- **`manifest.json`** and **`versions.json`** — copied in from the repo root by
  a small plugin in the config. No bundler produces them, and they live at the
  root because that is where the directory and BRAT read them from.

`versions.json` is copied into the vault too, but is not attached to a release.

## Releasing

A release is `main.js`, `manifest.json` and `styles.css` attached by name to a
GitHub release whose tag equals the `version` in `manifest.json`. That is the
whole contract. BRAT and the directory both read `manifest.json` at the HEAD of
the default branch, see a version, and go looking for the release tagged with
it — so a release has to come off `main`, and anything that breaks that
correspondence ships nothing, silently.

The tag is bare `x.y.z`: no `v` prefix, no pre-release suffix. Obsidian takes
nothing else, and one version has to read the same in three places: the manifest,
`versions.json`, and the tag.

### What a release can never take back

The `id` in `manifest.json` is permanent. `nvc-toolkit` is the folder name in
every vault that has ever installed this, and the prefix Obsidian files a hotkey
under. So are the two command ids and the fence languages a block is written
with — `obsidian/main.ts` and `src/model/block.ts` each say why beside the code
that would otherwise look tidyable.

The `name` is not permanent, but it cannot be an acronym: the directory's
scanner rejects an all-caps name, which is why this shipped as `NVC (dev)` for
as long as it did.

`main.js` is never committed. `build/` is gitignored, and the release workflow is
the only thing that produces the file Obsidian downloads — which is also why a
release with no assets on it is worse than no release at all.

`minAppVersion` is the oldest Obsidian the plugin actually works on, not the
newest one it happened to be tested against. The sibling project finds that by
running `eslint-plugin-obsidianmd`'s `no-unsupported-api` rule; this repo has
not brought that lint over yet, so the number is only as good as the last time
somebody thought about it.

### The README is rendered twice

Once on GitHub and once inside Obsidian's plugin browser, which is a different
renderer with less patience. Image paths stay relative and the markup stays
plain — no `<picture>`, no `srcset`, no Git LFS, or the browser shows a gap
where the screenshot should be. The four `docs/screenshots/*.png` links are
already written that way; keep the next one the same.

### The tag is the trigger

**Do not use GitHub's "Draft a new release" button.** The release here is
something the tag produces, not something you write by hand. Pushing a tag runs
`.github/workflows/release.yml`, which builds and then runs `gh release create`
— and that fails if a release for the tag already exists, leaving you a release
page with no `main.js` on it, which is the one file Obsidian downloads.

From a clean `main`:

```sh
npm run release
```

It asks for the new version, defaulting to the next patch, then bumps
`manifest.json` and `versions.json`, commits, pushes, tags, and pushes the tag.
That last push is what cuts the release.

The checks it makes first — on the branch, on uncommitted work, on being in
sync with origin, on the tag not already existing — are each a mistake that has
already happened once. If one fires, fix the thing it names.

The same sequence by hand, if the script is in the way:

```sh
npm run version:bump 0.2.0   # writes both files, prints these same commands
git commit -am "Release 0.2.0"
git push
git tag -a 0.2.0 -m "0.2.0"
git push origin 0.2.0
```

### Then publish the draft

The workflow checks the tag against the manifest, builds, and opens a **draft**
release with the three assets attached. On the
[Releases](https://github.com/jmagaram/nvc-obsidian/releases) page, edit that
draft:

1. Write the notes. The directory's review asks for them, and an empty body is
   what a reader gets instead of a changelog.
2. Check the three assets are actually attached. If the workflow failed there
   will be none — fix and re-tag rather than publishing an empty release.
3. Leave **Set as a pre-release** unchecked. The directory skips pre-releases
   outright, which is what made every 0.1.x invisible to it.
4. **Publish release.** Neither the directory nor BRAT can see a draft.

Bumping the root `manifest.json` is what tells every installed copy there is an
update, so a beta can be given a tag and a release _without_ a manifest bump.

### When a release does not show up

- **The workflow failed on the tag check.** The tag and `manifest.json`
  disagree. Delete the tag locally and on origin, fix the version, tag again.
- **The release is still a draft**, or is marked as a pre-release.
- **BRAT reports no new version.** It reads `manifest.json` from `main`. If the
  bump commit was never pushed, BRAT is looking at the old number.

## Before submitting to the community directory

Submission happens once, at `community.obsidian.md` — not by pull request;
`obsidianmd/obsidian-releases` stopped taking those in May 2026. After that, an
update is only a new release.

Worth doing first, in this order:

1. Bring over `lint:obsidian` from the sibling project. It runs the directory's
   own automated review — `eslint-plugin-obsidianmd`, against
   `eslint.obsidian.config.mjs` — so a submission fails on your machine rather
   than on theirs. It is not the project's linter; `npm run lint` is.
2. Settle `minAppVersion`, which that lint is also how you find.
3. Look at the README the way the plugin browser will render it, not the way
   GitHub does.
