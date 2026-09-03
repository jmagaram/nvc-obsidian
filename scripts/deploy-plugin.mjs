// Copy a built plugin into an Obsidian vault.
//
// Run directly (`node scripts/deploy-plugin.mjs`) or imported by
// vite.plugin.config.ts, which calls deployToVault() after every rebuild in
// watch mode.

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const built = join(root, "build");

/** Everything a plugin folder holds. All of it comes out of the build. */
const FILES = ["main.js", "manifest.json", "styles.css", "versions.json"];

/**
 * Obsidian expects the folder to be named for the plugin's `id`, so read it
 * from the manifest rather than restating it. A second copy of the id is a
 * second thing to remember on the one day it ever changes.
 */
const PLUGIN_ID = JSON.parse(
  readFileSync(join(root, "manifest.json"), "utf8"),
).id;

/**
 * Every place the vault path may be written down, nearest first. It is kept out
 * of git — the path is one person's machine, not the project's — and that is
 * exactly why one file is not enough: gitignored means `git worktree add`
 * cannot bring it along, so a fresh worktree would have nowhere to read it
 * from.
 */
function envFiles() {
  const files = [join(root, ".env.local")];

  // The main checkout. Every linked worktree points back at its .git, so this
  // resolves to the same directory from any of them, and one file there serves
  // all of them. Absent when this is not a git checkout, or git is not
  // installed, which is fine — the other places still apply.
  try {
    const commonDir = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    files.push(join(dirname(commonDir), ".env.local"));
  } catch {
    // Nothing to add.
  }

  // Outside the repo altogether, so it survives re-cloning.
  files.push(join(homedir(), ".config", "nvc-toolkit", ".env"));

  // In the main checkout the first two are the same path.
  return [...new Set(files)];
}

function vaultPath() {
  // Nearest first, because loadEnvFile never overwrites a variable that is
  // already set: the nearest file that names a vault wins, and an
  // OBSIDIAN_VAULT already in the environment beats every file.
  const files = envFiles();
  for (const file of files) {
    try {
      process.loadEnvFile(file);
    } catch {
      // Missing or unreadable. The next place may have it.
    }
  }

  const vault = process.env.OBSIDIAN_VAULT;
  if (!vault) {
    throw new Error(
      "OBSIDIAN_VAULT is not set. Put the full path to your vault\n\n" +
        "  OBSIDIAN_VAULT=/path/to/your/vault\n\n" +
        "in whichever of these suits — the first one that names a vault " +
        `wins:\n\n${files.map((file) => `  ${file}`).join("\n")}\n`,
    );
  }
  // A vault is a folder with a .obsidian in it. Checking says so now rather
  // than leaving a plugin folder somewhere a typo pointed at.
  if (!existsSync(join(vault, ".obsidian"))) {
    throw new Error(`No .obsidian folder in ${vault} — is that a vault?`);
  }
  return vault;
}

export function deployToVault() {
  const destination = join(vaultPath(), ".obsidian", "plugins", PLUGIN_ID);
  mkdirSync(destination, { recursive: true });

  for (const file of FILES) {
    const from = join(built, file);
    if (!existsSync(from)) {
      throw new Error(`${file} is missing from build/ — build first.`);
    }
    copyFileSync(from, join(destination, file));
  }

  // Hot Reload watches for this file and reloads the plugin when the folder
  // changes. Harmless if that plugin is not installed.
  const flag = join(destination, ".hotreload");
  if (existsSync(flag)) {
    const now = new Date();
    utimesSync(flag, now, now);
  } else {
    writeFileSync(flag, "");
  }

  return destination;
}

// Only when run as a script, not when the Vite config imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Deployed to ${deployToVault()}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
