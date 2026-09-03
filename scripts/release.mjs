// Cut a release.
//
//   npm run release
//   npm run release -- --editor   write the notes in $EDITOR instead of at the prompt
//   npm run release -- --draft    build it but leave it unpublished
//
// Prompts for the new version, the release notes and whether this is a
// pre-release, then does the whole series: bump, commit, push, tag, push the
// tag. Pushing the tag is what fires .github/workflows/release.yml, and the
// workflow publishes the release outright — there is nothing left to click.
//
// The notes reach the workflow inside the tag's own annotation, which is the
// only thing that travels with a `git push origin <tag>`. The workflow reads
// them back out and hands them to `gh release create --notes-file`. A trailer
// line on the end carries the one other decision — latest, pre-release or
// draft — for the same ride. `git tag -n99 <tag>` shows the lot locally.
//
// The checks up front are the reason this exists. Every one of them is a
// mistake that has already happened once: a tag left pointing at a stale commit,
// a tag that did not match manifest.json, a release built from a tree with
// uncommitted work in it.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { bump } from "./version-bump.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The two files a release is allowed to have dirty — it is about to write them. */
const RELEASE_FILES = ["manifest.json", "versions.json"];

/**
 * The trailer the workflow reads to decide how to publish. It is a line at the
 * end of the tag message rather than something in the tag name, because the tag
 * name is nailed to manifest.json — bare x.y.z, no suffix of any kind.
 *
 * The name is shared with .github/workflows/release.yml, which greps for it and
 * strips every line matching it out of the notes. Change it in both places.
 */
const CHANNEL_TRAILER = "Release-channel";

/** `--editor` writes the notes in $EDITOR; `--draft` leaves the release unpublished. */
const flags = new Set(process.argv.slice(2));

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  })?.trim();
}

function readJson(file) {
  return JSON.parse(readFileSync(join(root, file), "utf8"));
}

/**
 * Releases come off the default branch because that is where BRAT reads
 * manifest.json from to decide which release to fetch.
 */
function checkBranch() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "main") {
    throw new Error(
      `On "${branch}". BRAT reads manifest.json from the default branch, so a ` +
        "release has to come off main.",
    );
  }
}

/**
 * A tag should name a tree somebody actually ran. Uncommitted work means the
 * thing you tested and the thing you tagged are different.
 */
function checkClean() {
  /* Strip the two-letter status and its padding by pattern rather than by a
     fixed offset: the output is trimmed, so the first line has already lost the
     leading space that would make every line the same width. A rename reads
     "old -> new"; the new name is the one that matters. */
  const dirty = git(["status", "--porcelain"])
    .split("\n")
    .filter(Boolean)
    .map((line) =>
      line
        .trim()
        .replace(/^\S+\s+/, "")
        .split(" -> ")
        .pop(),
    )
    .filter((file) => !RELEASE_FILES.includes(file));
  if (dirty.length > 0) {
    throw new Error(
      `Uncommitted changes:\n\n  ${dirty.join("\n  ")}\n\n` +
        "Commit or stash them — a tag should describe a tree you have run.",
    );
  }
}

/** Returns how many commits are waiting to be pushed. */
function checkSynced() {
  git(["fetch", "--quiet", "origin"], { stdio: "ignore" });
  const behind = git(["rev-list", "--count", "main..origin/main"]);
  if (behind !== "0") {
    throw new Error(`Behind origin/main by ${behind}. Pull before releasing.`);
  }
  return Number(git(["rev-list", "--count", "origin/main..main"]));
}

function tagExists(tag) {
  if (git(["tag", "--list", tag])) return "locally";
  if (git(["ls-remote", "--tags", "origin", `refs/tags/${tag}`]))
    return "on origin";
  return null;
}

function nextPatch(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

/** github.com/owner/repo from whatever form the remote is written in. */
function repoSlug() {
  const url = git(["remote", "get-url", "origin"]);
  return url
    .replace(/^git@github\.com:|^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
}

/**
 * Everything that has to pass before a version is cut, cheapest first.
 *
 * All of it runs before the bump, so a failure leaves no commit, no tag and no
 * half-applied version in the working tree. This is the last point in a release
 * where failing is free: once the tag is pushed, the way out is deleting it on
 * origin and tagging again.
 *
 * `lint:obsidian` is here because a release is exactly when it matters. It is
 * the community directory's own review, and `no-unsupported-api` is what
 * catches a `minAppVersion` that no longer covers the APIs being called — a
 * number that is otherwise only as good as the last time somebody checked.
 *
 * The gallery build is deliberately not here. It is not part of a release, so
 * it is CI's business and not this script's.
 */
const PREFLIGHT = [
  ["Linting", "lint"],
  ["Checking formatting", "format:check"],
  ["Reviewing as the community directory", "lint:obsidian"],
  ["Building", "plugin:build"],
];

/** Runs each check, letting its output through. A non-zero exit throws. */
function preflight() {
  for (const [label, script] of PREFLIGHT) {
    console.log(`\n${label}…`);
    execFileSync("npm", ["run", script], { cwd: root, stdio: "inherit" });
  }
}

/**
 * Notes typed a line at a time, ending at a blank line.
 *
 * Empty is refused rather than defaulted. An empty release body is what a
 * reader gets instead of a changelog, and the directory's review asks for one —
 * so the moment to write it is the moment you know what changed.
 */
async function notesFromPrompt(rl) {
  console.log(`
Release notes, as markdown — what changed, in a few bullets. GitHub shows this
on the release page. A blank line ends them.
`);
  const lines = [];
  for (;;) {
    const line = await rl.question("  ");
    if (line.trim()) {
      lines.push(line);
      continue;
    }
    if (lines.length > 0) return lines.join("\n").trim();
    console.log("  Notes cannot be empty — say what changed.\n");
  }
}

/**
 * Notes written in $EDITOR, for when a few bullets turn into a paragraph.
 *
 * The file opens empty, with the instructions on the console instead of in it:
 * markdown headings start with `#` and so does every convention for a comment
 * line, and a release whose notes silently lost their first heading is worse
 * than one you had to read a prompt for.
 */
function notesFromEditor() {
  const editor = process.env.VISUAL || process.env.EDITOR;
  if (!editor) {
    throw new Error(
      "--editor needs $VISUAL or $EDITOR set. Drop the flag to type the notes " +
        "at the prompt instead.",
    );
  }
  const file = join(mkdtempSync(join(tmpdir(), "nvc-release-")), "NOTES.md");
  writeFileSync(file, "");
  console.log(`
Write the release notes as markdown — what changed, in a few bullets. GitHub
shows this on the release page. Save and quit when you are done.
`);
  /* $EDITOR is conventionally a command with arguments — `code -w`, `subl -w` —
     so it is split rather than run as one name. */
  const [command, ...args] = editor.trim().split(/\s+/);
  execFileSync(command, [...args, file], { stdio: "inherit" });
  const notes = readFileSync(file, "utf8").trim();
  if (!notes) {
    throw new Error("No notes written. Nothing done.");
  }
  return notes;
}

/**
 * The tag's whole message: the notes, then the trailer the workflow acts on.
 *
 * Written with --cleanup=whitespace at the tag, because git's default for a tag
 * message strips comment lines — and a `# Fixed` heading is a comment line.
 */
function tagMessage(notes, channel) {
  return `${notes}\n\n${CHANNEL_TRAILER}: ${channel}\n`;
}

async function main() {
  checkBranch();
  checkClean();
  const unpushed = checkSynced();

  const manifest = readJson("manifest.json");
  const current = manifest.version;
  const suggested = nextPatch(current);

  const released = tagExists(current);
  console.log(
    `\nCurrent version ${current}${released ? ` — tag already exists ${released}` : ""}`,
  );
  if (unpushed > 0) {
    console.log(`${unpushed} commit${unpushed === 1 ? "" : "s"} to push.`);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`New version [${suggested}]: `)).trim();
  const version = answer || suggested;

  const clash = tagExists(version);
  if (clash) {
    rl.close();
    throw new Error(
      `Tag ${version} already exists ${clash}. Pick another version — a ` +
        "release cannot reuse a tag that is already claimed.",
    );
  }

  /* Everything you have to type happens here, before the preflight, so the
     builds run while you are not sitting in front of a prompt. */
  const notes = flags.has("--editor")
    ? notesFromEditor()
    : await notesFromPrompt(rl);

  let channel = "latest";
  if (flags.has("--draft")) {
    channel = "draft";
  } else {
    console.log(`
A pre-release is a build for BRAT and nothing else: the community directory
skips pre-releases outright, which is what made every 0.1.x invisible to it.
`);
    const pre = (await rl.question("Mark as a pre-release? [y/N] "))
      .trim()
      .toLowerCase();
    if (pre === "y" || pre === "yes") channel = "prerelease";
  }

  preflight();

  const published = {
    latest: "publishes it as the latest release",
    prerelease: "publishes it as a PRE-RELEASE",
    draft: "leaves it a DRAFT, invisible to BRAT and the directory",
  }[channel];

  console.log(`
Notes:

${notes.replace(/^/gm, "  ")}

About to:
  manifest.json   ${current} -> ${version}
  versions.json   + "${version}": "${manifest.minAppVersion}"
  git commit      manifest.json versions.json
  git push        origin main
  git tag         ${version}   <- carries the notes and ${CHANNEL_TRAILER}: ${channel}
  git push        origin ${version}   <- fires the workflow, which ${published}
`);
  const go = (await rl.question("Proceed? [y/N] ")).trim().toLowerCase();
  rl.close();
  if (go !== "y" && go !== "yes") {
    console.log("Nothing done.");
    return;
  }

  bump(version);
  git(["add", ...RELEASE_FILES]);
  git(["commit", "-m", `Release ${version}`], { stdio: "inherit" });
  git(["push", "origin", "main"], { stdio: "inherit" });
  git([
    "tag",
    "-a",
    "--cleanup=whitespace",
    "-m",
    tagMessage(notes, channel),
    version,
  ]);
  git(["push", "origin", version], { stdio: "inherit" });

  const slug = repoSlug();
  console.log(`
Tagged ${version} and pushed. The workflow is building it, and then ${published}:

  https://github.com/${slug}/actions
  https://github.com/${slug}/releases
${
  channel === "draft"
    ? `
Neither BRAT nor the directory can see a draft, so publish it from the releases
page when you are happy with what was built.
`
    : ""
}
Then on the phone: BRAT -> Add beta plugin -> ${slug}
`);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
