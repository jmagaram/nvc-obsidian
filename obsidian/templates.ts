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
 * The four questions, as notes to fill in: once turned inward, once towards
 * the other person, once at something you did yourself, and once — without the
 * request — as thanks.
 *
 * **This is the text, and the README describes it.** There is no way to ship a
 * `.md` file — scripts/deploy-plugin.mjs copies four files by name and a
 * release attaches three, and those are the only ones Obsidian ever downloads —
 * so a template has to be a string in the bundle, and a command is the only way
 * to hand one over. The README has a section per template paraphrasing what
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
 * Every folded callout, in every template, has the same shape, so a reader who
 * has seen one can skim the rest. The title names the distinction NVC draws at
 * that step — observation from judgment, feeling from thought, need from
 * strategy, request from demand — because a collapsed callout shows nothing but
 * its title, and that one line is the lesson. The first bullet says what to
 * write, the middle ones are the tests, and the last is a wrong line beside a
 * right one. One small story, the unanswered texts, runs through all of them,
 * seen from each side in turn.
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
>
> If the hard part is something they said to you, the **Hear them** command is the other half. If it's something you did, run **Forgive yourself**.

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
  {
    id: "hear-them",
    name: "Hear them",
    text: `# Hear them

> [!note]- What this is for
> Someone said or did something that stung, and you're tempted to strike back, walk away, or grovel. All three tend to make it worse. This is for finding the feeling and the need behind their words. Once you can see those, the sting goes out of what they said, and you can get back to talking and come out closer than you went in.
>
> It asks the same four questions as the **Make sense of it** command, turned towards the other person: what they said, what they might be feeling, what they might be needing, and what you could say back. Hearing them doesn't mean agreeing with them, and it doesn't mean your side doesn't count. Your needs matter just as much. Once they feel heard, it's your turn.
>
> If you're too flooded to wonder what they feel, run **Make sense of it** first.

## What they said or did

> [!info]- Their words, not your reading of them
> - Write what they said and did, as exactly as you can, the way a camera would have caught it.
> - Leave out what it meant to you and the story in your head about it. That's your reaction, and it belongs in **Make sense of it**.
> - Test: would they recognise this as what they said?
> - Not *She attacked me for texting.* Try *She said "You're so needy. I can't go a day without you checking up on me."*



## What they might be feeling

> [!info]- A guess, held lightly
> - Guess what was going on inside them. Pick a few words. You don't have to be right.
> - Hurtful words are usually their pain talking. Under them is often hurt, sadness, loneliness, fear, shame, …
> - Anger and judgment aimed at you point to something they're missing and can't see or name yet. Blame is what that looks like from outside.
> - *She feels that…* and *She feels I'm…* are guesses at her thoughts, not her feelings.
> - Not *She feels that I'm too much.* Try *She might be feeling overwhelmed and scared.*

${toEmptyBlock(FEELINGS)}



## What they might be needing

> [!info]- The need behind the words
> - Guess what they were missing or afraid to lose when they said it.
> - We all have the same needs: connection, safety, respect, play, and many others.
> - Judgment is a tragic expression of an unmet need. It pushes away the very thing they're reaching for. Translate it and it stops being an attack.
> - *She needs me to…* is a strategy, not a need. Guess the need without deciding what she should do about it, or whether you're the one to help.
> - Not *She needs me to back off.* Try *She might need space, and trust that I'll be fine without a reply.*

${toEmptyBlock(NEEDS)}



## What you could say back

> [!info]- A question, not a diagnosis
> - Say your guess back as a question they can correct: "Are you feeling ___ because you need ___?" The aim is for them to feel understood, and for you to find out whether you did.
> - Keep it about them. No "because I", no explaining, no defending. Your side waits until they feel heard.
> - Advising, reassuring, correcting the facts, one-upping, and quizzing them aren't helpful now, however true or kind.
> - A wrong guess still works: they'll say what's right, and that's them being heard. Keep going until they soften or go quiet. Then it's your turn.
> - Not *I was only worried*, *you could have just replied*, or *sorry, I'll stop*. Try *Are you feeling overwhelmed, and needing some space?*
`,
  },
  {
    id: "forgive-yourself",
    name: "Forgive yourself",
    text: `# Forgive yourself

> [!note]- What this is for
> You said or did something you wish you hadn't, and you're either beating yourself up or telling yourself it was nothing. Neither teaches you anything. This is for taking it seriously without turning on yourself: feeling what it cost, finding what you were reaching for, and choosing what to do next.
>
> Nonviolent Communication calls the two halves mourning and self-forgiveness. Mourning is letting yourself feel the needs your action left unmet. Self-forgiveness is seeing that you were trying to meet a need too, just in a way that didn't work. Hold both and the lesson sticks. Hold only one and it doesn't.
>
> Go top to bottom if you can. Not every section has to be filled in. If the other person is still hurting, **Hear them** is how the repair starts.

## What you did

> [!info]- The action, not the verdict
> - Write what you said or did, as exactly as you can, the way a camera would have caught it.
> - Leave out the verdict. *I was a jerk* and *I always do this* are judgments, and a judgment of yourself teaches as little as a judgment of anyone else.
> - Test: would someone who saw it agree that's what happened, without having to agree with what you think it makes you?
> - Not *I was horrible to him.* Try *When he texted a second time, I wrote "You're so needy."*



## What you feel now

> [!info]- Regret, not self-punishment
> - Name what you feel about having done it, and where it sits in your body.
> - Guilt, shame and regret are real feelings. Let them be there without arguing with them or explaining them away.
> - *I feel like an idiot* is a verdict. *I feel ashamed* is a feeling. Under the verdict is usually something quieter: sad, embarrassed, scared of what it cost.
> - Not *I feel like a terrible partner.* Try *I feel sad and ashamed.*

${toEmptyBlock(FEELINGS)}



## What it cost you

> [!info]- Mourning: the needs it left unmet
> - Ask which of your own needs went unmet by what you did: connection, integrity, care for someone you love, being the person you mean to be.
> - Feeling this is what makes you want to do differently. Beating yourself up doesn't. It just makes you want to stop feeling.
> - Not *I need to stop being so reactive.* Try *I need connection with him, and to treat him with care.*

${toEmptyBlock(NEEDS)}



## What you were reaching for

> [!info]- Self-forgiveness: the need you were trying to meet
> - Ask what you needed in that moment that made this seem like the way to get it. There always is one.
> - Everything anyone does is an attempt to meet a need, including this. The need was fine. The strategy failed.
> - Seeing this is self-forgiveness. It isn't letting yourself off. It's understanding yourself well enough to choose differently next time.
> - Not *I don't know why I did it. I just snapped.* Try *I needed space, and to trust he'd be all right without an answer.*

${toEmptyBlock(NEEDS)}



## What you'll do now

> [!info]- A next step, not a penance
> - Pick one thing that serves both needs: the one you hurt and the one you were reaching for.
> - Say what you'll do, not what you'll never do again. *I'll stop snapping* is nothing you can act on. *When I need space I'll say so* is.
> - If it involves them, it's an offer they can decline. An apology that has to be accepted is a demand.
> - Not *I'll never speak to him like that again.* Try *I'll tell him I'm sorry, and that next time I need space I'll say so instead.*
`,
  },
  {
    id: "thank-them",
    name: "Thank them",
    text: `# Thank them

> [!note]- What this is for
> Someone did something that mattered to you, and *thanks* or *you're amazing* doesn't say it. This is for telling them what they did, what it stirred in you, and which need of yours it met, so they know exactly what landed and get to feel it too.
>
> Praise is a judgment, even a kind one. *You're so thoughtful* puts you in the judge's seat and tells them nothing about you. Appreciation tells them what their action did for you, and that is the part they can't get anywhere else.
>
> The same three questions as the other templates, minus the request. There isn't one.

## What they did

> [!info]- The act, not the adjective
> - Write what they did or said, as exactly as you can, the way a camera would have caught it.
> - Adjectives hide the act. *Thoughtful*, *generous* and *amazing* are conclusions. Write what led you to them.
> - Test: could they picture the moment from what you wrote?
> - Not *She was really understanding about it.* Try *She called that evening and said she'd needed a quiet day, and it wasn't about me.*



## What you felt

> [!info]- Feelings, not compliments
> - Name what it stirred in you, and where you felt it.
> - Be specific. *Good* says nothing. *Relieved*, *touched*, *warm*, *glad* each say something different.
> - A compliment is about them. A feeling is about you, and it's the part they can't argue with or deflect.
> - Not *I felt like you really get me.* Try *I felt relieved, and warm towards you.*

${toEmptyBlock(FEELINGS)}



## What it met

> [!info]- The need behind the gladness
> - Ask which need of yours their action met. That's why it mattered, and it's what makes the thanks land as more than manners.
> - The same needs as always: connection, honesty, support, care, to matter, and many others.
> - Not *I needed you to call.* Try *I needed to know I still matter to you.*

${toEmptyBlock(NEEDS)}



## What you'll tell them

> [!info]- A celebration, not a reward
> - Say all three to them: what they did, what you felt, what it met. Say it to their face, or write it, but say it to them and not just about them.
> - No *but*, and no request tucked in behind it. Thanks with an ask attached is a bribe, and they'll feel the hook.
> - When it's your turn to be thanked, take it in. *It was nothing* refuses the gift.
> - Not *You're the best. Thanks for being so understanding.* Try *When you called last night and told me it wasn't about me, I felt so relieved. I'd needed to know I still matter to you.*
`,
  },
];
