/* The word lists import `Category` back from here, which is a cycle on paper
   and not one in fact: `import type` is erased, so nothing circular is left in
   the bundle. The shape belongs beside the thing that consumes it. */
import { categories as feelings } from "./feelings";
import { categories as needs } from "./needs";

/** One entry in an inventory, and its gloss. */
export type Word = {
  word: string;
  definition: string;
};

/**
 * A heading in the inventory and the words under it.
 *
 * `kind` is the feelings list's own split between "feelings when needs are
 * satisfied" and "feelings when needs are not satisfied". It is optional because
 * needs have no such polarity — not because a feelings category might be missing
 * one. Absent means the list does not divide, and the hub draws one cloud
 * instead of two; see `toScreen`.
 */
export type Category = {
  name: string;
  kind?: "met" | "unmet";
  words: Word[];
};

/**
 * A word list and everything that differs about picking from it.
 *
 * The picker itself knows nothing about which list it is running: every screen,
 * the reducer, the parser and the serializer take `category: string` and
 * `word: string` and stop there. What is left over is small enough to be one
 * value handed down from the host, which is what this is — the seam the two
 * commands meet at.
 *
 * The alternative is two pickers, and the sibling project has already run that
 * experiment: its feelings and needs screens were written as deliberate copies
 * and converged to within three lines of each other, so every change since has
 * had to be made twice.
 */
export type Inventory = {
  /**
   * The word after `nvc-` in this list's fence languages, and the tail of its
   * command id. Both are permanent: a language names blocks already sitting in
   * somebody's vault, and a command id is what Obsidian files a hotkey under.
   */
  id: "feelings" | "needs";
  categories: readonly Category[];
  /** The hub's header, and the verb the commit button is built from. */
  title: string;
  /** For `Insert 3 needs`. */
  noun: { one: string; many: string };
};

export const FEELINGS: Inventory = {
  id: "feelings",
  categories: feelings,
  title: "Insert feelings",
  noun: { one: "feeling", many: "feelings" },
};

export const NEEDS: Inventory = {
  id: "needs",
  categories: needs,
  title: "Insert needs",
  noun: { one: "need", many: "needs" },
};

/**
 * Every list this plugin picks from, in the order it offers them.
 *
 * One place, because three things are generated from it and drifting apart
 * would be silent: the commands, the fence languages, and the gallery's
 * chooser.
 */
export const INVENTORIES: readonly Inventory[] = [FEELINGS, NEEDS];
