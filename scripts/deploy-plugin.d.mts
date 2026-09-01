/**
 * Copy build/ into the vault named by OBSIDIAN_VAULT and return where it
 * went. Throws if the variable is unset, the path is not a vault, or the build
 * output is missing.
 *
 * Hand-written because the script itself stays plain JavaScript: node runs it
 * directly from an npm script, with no build step in front of it.
 */
export declare function deployToVault(): string
