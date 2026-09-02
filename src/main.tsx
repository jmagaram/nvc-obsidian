import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './gallery-obsidian.css'
/* The plugin's own stylesheet, after the app's stand-in and for the same reason
   the vault loads it after app.css. Only its `.nvc-block` half draws anything
   here — the `.nvc-modal` rules match a host element the gallery does not have —
   but that half is the frame a block is read in, so the gallery is showing the
   file that ships rather than a copy of it that can drift. */
import '../obsidian/styles.css'
import './harness.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
