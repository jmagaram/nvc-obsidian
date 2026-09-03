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
 * **This is the text, and the README describes it.** There is no way to ship a
 * `.md` file — scripts/deploy-plugin.mjs copies four files by name and a
 * release attaches three, and those are the only ones Obsidian ever downloads —
 * so a template has to be a string in the bundle, and a command is the only way
 * to hand one over. The README's "Make sense of it" section paraphrases what
 * the callouts teach; if the teaching changes, check it still says so.
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
 * Every folded callout has the same shape, so a reader who has seen one can
 * skim the rest. The title names the distinction NVC draws at that step —
 * observation from judgment, feeling from thought, need from strategy, request
 * from demand — because a collapsed callout shows nothing but its title, and
 * that one line is the lesson. The first bullet says what to write, the middle
 * ones are the tests, and the last is a wrong line beside a right one, all four
 * drawn from the same small story.
 *
 * The heading is `#` and the sections are `##`, because this arrives as a note
 * of its own rather than as a section of somebody else's.
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

> [!note]- What this is for
> Something happened, usually with another person, and you're flooded with feelings and thoughts you can't sort out. This is for getting clear before you say or do something that makes it worse, and for finding a way through that brings you closer to what you need.
>
> It walks through the four questions Nonviolent Communication asks: what happened, what you feel, what you need, and what you could ask for. The folded note under each heading says what belongs there and what doesn't. Use it to sort yourself out, gain some clarity, or prepare for a conversation.
>
> If you're overwhelmed, close your eyes and take a few slow breaths first. Each question builds on the one before, so go top to bottom if you can. Not every section has to be filled in.

## What happened

> [!info]- Observation, not judgment
> - Write what happened as a camera would have seen and heard it, with exact quotes where you can.
> - Leave out what you concluded from it. Judgment hides in words like *always*, *never*, *rude*, *lazy*, *unfair*, *ignored*.
> - Test: could the other person read it and say "yes, that happened"?
> - Not *She ignored me.* Try *She didn't answer my two texts on Tuesday.*



## What you feel

> [!info]- Feelings, not thoughts
> - Name what is going on inside you, and notice where it sits in your body.
> - Don't block a feeling because you think you shouldn't have it. Every feeling points at a need.
> - Be specific. *Good* and *bad* could mean anything. *Relieved*, *restless*, *discouraged* tell you something.
> - Find the vulnerable feelings under anger: hurt, scared, lonely, ashamed, …
> - *Ignored*, *attacked*, *let down* are thoughts about what someone did. So is anything after "I feel that" or "I feel like".
> - Not *I feel ignored.* Try *I feel lonely and hurt.*

${toEmptyBlock(FEELINGS)}



## What you need

> [!info]- Needs, not strategies
> - Name what matters to you here. Needs are universal and belong to everyone: understanding, safety, closeness, rest, autonomy, and many more.
> - Which of your needs were threatened or at risk? Which were met?
> - Take them seriously. Having needs isn't neediness.
> - If it has a person or an action in it, it's a strategy. Ask what having it would give you. That's the need.
> - Not *I need her to text back.* Try *I need to know I matter.*

${toEmptyBlock(NEEDS)}



## What you could ask for

> [!info]- Requests, not demands
> - Find a way to get the need met. Start wide and creative: every way it could happen, including ways that don't involve them.
> - Pick one and make it specific, doable, and now.
> - Say what you want, not what you don't.
> - Some requests are to yourself. Not everything here was theirs to give.
> - Could they say no without paying for it? If not, it's a demand.
> - Not *Be more considerate.* Try *Would you text me if you'll be more than an hour late?*
`,
  },
];
