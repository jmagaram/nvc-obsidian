// Cut a release.
//
//   npm run release
//
// Prompts for the new version, showing the current one, then does the whole
// series: bump, commit, push, tag, push the tag. Pushing the tag is what fires
// .github/workflows/release.yml.
//
// It stops there on purpose. The workflow creates a DRAFT release, and a draft
// is invisible to BRAT and to the community directory, so publishing it is a
// deliberate step you take after looking at what was built.
//
// The checks up front are the reason this exists. Every one of them is a
// mistake that has already happened once: a tag left pointing at a stale commit,
// a tag that did not match manifest.json, a release built from a tree with
// uncommitted work in it.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { bump } from "./version-bump.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The two files a release is allowed to have dirty — it is about to write them. */
const RELEASE_FILES = ["manifest.json", "versions.json"];

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

  // Before the bump, so a broken build never leaves a half-applied version
  // behind in the working tree.
  console.log("\nBuilding…");
  execFileSync("npm", ["run", "plugin:build"], { cwd: root, stdio: "inherit" });

  console.log(`
About to:
  manifest.json   ${current} -> ${version}
  versions.json   + "${version}": "${manifest.minAppVersion}"
  git commit      manifest.json versions.json
  git push        origin main
  git tag         ${version}
  git push        origin ${version}   <- fires the release workflow
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
  git(["tag", "-a", version, "-m", version]);
  git(["push", "origin", version], { stdio: "inherit" });

  const slug = repoSlug();
  console.log(`
Tagged ${version} and pushed. The workflow is building it:

  https://github.com/${slug}/actions

It creates the release as a DRAFT. Publish it — a draft is invisible to both
BRAT and the community directory:

  https://github.com/${slug}/releases

Then on the phone: BRAT -> Add beta plugin -> ${slug}
`);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
