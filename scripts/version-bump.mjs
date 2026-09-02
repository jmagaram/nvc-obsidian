// Set the plugin's version in the two files that carry it.
//
//   node scripts/version-bump.mjs 0.2.0
//
// manifest.json is what the community directory reads to decide there is a new
// release; versions.json tells an older Obsidian which release it may still
// install. The git tag has to match manifest.json exactly, so this prints the
// tag commands rather than guessing when you want them run.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Obsidian takes x.y.z and nothing else — no `v`, no `-beta.1` suffix. */
const VERSION = /^\d+\.\d+\.\d+$/;

function readJson(file) {
  return JSON.parse(readFileSync(join(root, file), "utf8"));
}

function writeJson(file, value) {
  writeFileSync(join(root, file), `${JSON.stringify(value, null, 2)}\n`);
}

export function bump(version) {
  if (!version) {
    throw new Error("Usage: node scripts/version-bump.mjs <x.y.z>");
  }
  if (!VERSION.test(version)) {
    throw new Error(
      `"${version}" is not x.y.z. Obsidian rejects anything else, including ` +
        "a `v` prefix or a pre-release suffix.",
    );
  }

  const manifest = readJson("manifest.json");
  manifest.version = version;
  writeJson("manifest.json", manifest);

  // Every version maps to the Obsidian it needs. Past entries stay: that is
  // the whole point of the file.
  const versions = readJson("versions.json");
  versions[version] = manifest.minAppVersion;
  writeJson("versions.json", versions);

  return version;
}

// Only when run as a script. `npm run release` imports bump() and does the
// git work itself.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const version = bump(process.argv[2]);
    console.log(`manifest.json and versions.json are now ${version}. Next:

  git commit -am "Prepare ${version}"
  git push
  git tag -a ${version} -m "${version}"
  git push origin ${version}

Or let \`npm run release\` do all of it.
`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
