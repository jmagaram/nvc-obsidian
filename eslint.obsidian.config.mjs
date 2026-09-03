// The community directory's automated review, runnable before submitting.
//
// This is not the project's linter — `npm run lint` is oxlint, and it stays the
// one that runs on every change. This config exists only to answer "would the
// directory's scanner complain", which is why it is a separate file and a
// separate script.
//
// It is scoped to what ships. Build tooling (`scripts/`, the vite configs) is
// on the scanner's own ignore list and is not in tsconfig.app.json either, so
// the type-aware rules could not parse it anyway.
//
// `src/` is linted along with `obsidian/`, even though `src/App.tsx` and
// `src/main.tsx` are the gallery and never reach a vault. The directory's
// scanner has no ignore list and reads the whole repo as plugin source, so a
// finding it raises in gallery-only code is one a submission will raise too.
// Anything the gallery does that a plugin may not do has to go regardless of
// whether it ships — in the sibling project a `navigator.userAgent` in a demo
// page is exactly what failed a submission.

import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    ignores: [
      "dist/",
      "build/",
      "node_modules/",
      // Claude Code's scratch worktrees: whole checkouts, each with its own
      // build output. Gitignored, but ESLint does not read .gitignore, and the
      // type-aware parser rejects every file in them as outside the project.
      ".claude/",
      "scripts/",
      "*.mjs",
      "vite.config.ts",
      "vite.plugin.config.ts",
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    // Several of the recommended rules are type-aware. tsconfig.app.json
    // already covers exactly the two folders being linted.
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.app.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
