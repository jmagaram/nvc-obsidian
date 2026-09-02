import { createContext, useContext } from "react";

/**
 * Whether this is a Mac, which the host answers rather than the picker.
 *
 * It decides only how a shortcut is *spelled* — see `PrimaryButton` in
 * Chrome.tsx — never what a key does. Asked of the host because the plugin has
 * Obsidian's `Platform` and the gallery does not, and because sniffing
 * `navigator` for an operating system is the thing Obsidian's plugin review
 * rejects. No host to ask means not a Mac: that is the spelled-out hint, which
 * reads as merely unfamiliar rather than as wrong.
 *
 * Beside `host.tsx` rather than in it because that file exports components and
 * nothing else, which is what lets fast refresh work there.
 */
export const MacContext = createContext(false);

export function useIsMac() {
  return useContext(MacContext);
}
