import { copyFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { deployToVault } from './scripts/deploy-plugin.mjs'

/* `build/`, not `dist/`, which is the gallery's, and not a name of our own:
   the community directory's scanner reproduces the release from source and
   looks for main.js at the repo root or in dist/, build/ or out/. */
const OUT_DIR = 'build'

/** The two files Obsidian wants beside main.js that no bundler produces. They
    live at the repo root because that is where the directory and BRAT read
    them from. styles.css is not here — the build writes it from the CSS that
    obsidian/main.ts reaches through its import graph. */
function copyPluginFiles(): Plugin {
  return {
    name: 'nvc-copy-plugin-files',
    closeBundle() {
      for (const file of ['manifest.json', 'versions.json']) {
        copyFileSync(file, `${OUT_DIR}/${file}`)
      }
    },
  }
}

/** Watch mode: push every rebuild straight into the vault. */
function deployAfterBundle(): Plugin {
  return {
    name: 'nvc-deploy',
    closeBundle() {
      try {
        this.info(`Deployed to ${deployToVault()}`)
      } catch (error) {
        this.warn(error instanceof Error ? error.message : String(error))
      }
    },
  }
}

/**
 * Build the Obsidian plugin. Vite rather than esbuild so the gallery and the
 * plugin resolve CSS identically and the repo keeps one bundler.
 *
 * `--mode deploy` adds the copy into the vault, which is what `plugin:dev`
 * uses so a watch rebuild lands somewhere Obsidian can see it.
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    copyPluginFiles(),
    ...(mode === 'deploy' ? [deployAfterBundle()] : []),
  ],
  // React reads this, and there is no `process` on Obsidian mobile.
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    // One stylesheet, because Obsidian loads exactly one: styles.css.
    cssCodeSplit: false,
    lib: {
      entry: 'obsidian/main.ts',
      // Obsidian requires CommonJS.
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      // Obsidian supplies its own API and runs on Electron. Everything else,
      // React included, is bundled — Obsidian provides no React.
      external: [
        'obsidian',
        'electron',
        ...builtinModules,
        ...builtinModules.map((name) => `node:${name}`),
      ],
      output: { assetFileNames: 'styles.css' },
    },
  },
}))
