import { FEELINGS, NEEDS } from "../src/data/inventory.ts";
import { toEmptyBlock } from "../src/model/block.ts";

/**
 * A scaffold a command writes into the note you are looking at, and its
 * permanent name.
 *
 * `id` is spelled here once and nowhere else. Obsidian files a user's hotkey
 * under `nvc-toolkit:<id>`, so renaming one silently unbinds it — the same
 * reason obsidian/main.ts gives for `insert-<inventory.id>`. These share that
 * id space, which is why a template's id must be something no word list could
 * ever be called.
 *
 * `name` carries no ellipsis. The two picker commands do, because they open a
 * modal and the ellipsis is the promise that you will be asked something before
 * anything happens; this one writes the text and is finished.
 */
export type Template = { id: string; name: string; text: string };

/**
 * The four questions, as a note to fill in.
 *
 * **This is the text, and the README quotes it.** There is no way to ship a
 * `.md` file — scripts/deploy-plugin.mjs copies four files by name and a
 * release attaches three, and those are the only ones Obsidian ever downloads —
 * so a template has to be a string in the bundle, and a command is the only way
 * to hand one over. The README section is a copy for anyone who would rather
 * keep this in their own daily note or Templater setup than press a key. Change
 * this one first.
 *
 * The feelings and needs sections hold a block with no body, which draws as
 * `Pick feelings…` rather than as a hole. That is what the empty block was
 * made for; see `render` in obsidian/block.tsx.
 *
 * The guidance sits in collapsed callouts — the `-` after the type is what
 * folds them — so it is there the first time and out of the way every time
 * after. An italic hint line under each heading was the alternative, and it
 * cannot be put away without deleting it.
 *
 * The heading is `#` and the sections are `##`, because this arrives as a note
 * of its own rather than as a section of somebody else's — and the callout at
 * the top says to replace that heading once you know what this is about.
 */
export const TEMPLATES: readonly Template[] = [
  {
    /* Not a stale copy of the name: the command was called "Make sense of what
       happened" when it shipped, and the id is what a hotkey is filed under, so
       it stays whatever it was first. Expect these two to drift further apart,
       not to be brought back into line. */
    id: "make-sense-of-what-happened",
    name: "Make sense of it",
    text: `# Make sense of it

*If you're overwhelmed, close your eyes and take a few deep breaths first.*

> [!note]- About this template
> Use this when something has happened and it's stirring up strong feelings — good or bad. Or when you're overwhelmed, running the same tape in your head, and can't make sense of the noise.
>
> It walks through four questions from Nonviolent Communication: what happened, how you feel, what you need, and what you might ask for. Use it to get clear in your own head, or to prepare for a conversation with someone else.
>
> You don't have to fill in every section, and you don't have to go in order. Replace the heading above with a short summary once you know what this is about.

## What happened

> [!question]- What goes here
> - Describe what happened the way a video camera would record it — just what was said and done.
> - Leave out your inner thoughts and what you concluded from it.
> - Avoid judgment words: *always*, *never*, *often*, *too much*, *lazy*, *rude*, *unfair*, *selfish*, *ignored*.
> - Use exact quotes, as close as you can get.
> - If this is about a conflict, they should be able to read this and say "yes, that is what happened."



## Your feelings about it

> [!question]- What goes here
> - Notice where it sits in your body — chest, stomach, shoulders.
> - Pick the good ones too. Don't reject a word because you think you shouldn't feel it.
> - Every feeling, even the hard ones, is useful information about what you need.
> - Under anger there's usually something soft and vulnerable — hurt, scared, lonely, sad.
> - Be specific. *Good* and *bad* could mean anything. *Relieved*, *restless*, *discouraged* tell you something.
> - Words like *ignored*, *attacked*, *let down* are thoughts about what someone did to you. So is anything after "I feel that you…" or "I feel like…" — those are usually "I think." Useful to notice, then keep going to what you felt underneath.

${toEmptyBlock(FEELINGS)}



## What you need

> [!question]- What goes here
> - Everyone needs the same things — understanding, safety, closeness, honesty, rest, autonomy, and many others.
> - Take yours seriously. Having needs isn't neediness.
> - Which of your needs were threatened? Which were met?
> - Getting clear on which needs are at stake makes it possible to get them met — by you or someone else.
> - "I need him to do something" is not a need — it's a particular way of meeting one. Those go under Requests and strategies. Ask what it would give you if you got it, and that's usually the need.

${toEmptyBlock(NEEDS)}



## Requests and strategies

> [!question]- What goes here
> - Start wide. What are all the ways this need could get met? Some won't involve this person at all.
> - Stuck? Imagine everything worked out perfectly. What's the first thing you'd notice?
> - Then pick one and turn it into a request: specific, doable, and now.
> - Say what you do want, not what you don't. "Be more considerate" is nothing anyone can act on. "Would you text me if you'll be more than an hour late" is.
> - Some of these are requests to yourself. Not everything here was theirs to give.
> - Could they say no without it costing them? If not, it's a demand wearing a request's clothes.
`,
  },
];
