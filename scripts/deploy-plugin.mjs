// Copy a built plugin into an Obsidian vault.
//
// Run directly (`node scripts/deploy-plugin.mjs`) or imported by
// vite.plugin.config.ts, which calls deployToVault() after every rebuild in
// watch mode.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const built = join(root, 'build')

/** Everything a plugin folder holds. All of it comes out of the build. */
const FILES = ['main.js', 'manifest.json', 'styles.css', 'versions.json']

/**
 * Obsidian expects the folder to be named for the plugin's `id`, so read it
 * from the manifest rather than restating it. A second copy of the id is a
 * second thing to remember on the one day it ever changes.
 */
const PLUGIN_ID = JSON.parse(
  readFileSync(join(root, 'manifest.json'), 'utf8'),
).id

function vaultPath() {
  // Kept out of git: the path is one person's machine, not the project's.
  try {
    process.loadEnvFile(join(root, '.env.local'))
  } catch {
    // No .env.local is fine as long as the variable is set some other way.
  }

  const vault = process.env.OBSIDIAN_VAULT
  if (!vault) {
    throw new Error(
      'OBSIDIAN_VAULT is not set. Put the full path to your vault in ' +
        '.env.local:\n\n  OBSIDIAN_VAULT=/path/to/your/vault\n',
    )
  }
  // A vault is a folder with a .obsidian in it. Checking says so now rather
  // than leaving a plugin folder somewhere a typo pointed at.
  if (!existsSync(join(vault, '.obsidian'))) {
    throw new Error(`No .obsidian folder in ${vault} — is that a vault?`)
  }
  return vault
}

export function deployToVault() {
  const destination = join(vaultPath(), '.obsidian', 'plugins', PLUGIN_ID)
  mkdirSync(destination, { recursive: true })

  for (const file of FILES) {
    const from = join(built, file)
    if (!existsSync(from)) {
      throw new Error(`${file} is missing from build/ — build first.`)
    }
    copyFileSync(from, join(destination, file))
  }

  // Hot Reload watches for this file and reloads the plugin when the folder
  // changes. Harmless if that plugin is not installed.
  const flag = join(destination, '.hotreload')
  if (existsSync(flag)) {
    const now = new Date()
    utimesSync(flag, now, now)
  } else {
    writeFileSync(flag, '')
  }

  return destination
}

// Only when run as a script, not when the Vite config imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Deployed to ${deployToVault()}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
