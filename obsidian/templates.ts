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
> It walks through four questions from Nonviolent Communication: what happened, what you feel, what you need, and what you could ask for. Use it to sort yourself out, gain some clarity, or prepare for a conversation, if you decide to have one.
>
> If you're overwhelmed, close your eyes and take a few slow breaths first. Each question builds on the one before, so go top to bottom if you can. Not every section has to be filled in.
>
> If the hard part is something they said to you, the **Hear them** command is the other half. If it's something you did, run **Forgive yourself**.

## What happened

> [!info]- Observation, not judgment
> - Write what happened as a camera would have seen and heard it, with exact quotes where you can.
> - Avoid *always*, *never*, *rude*, *lazy*, *unfair*, and *ignored*: they state your conclusion, not what happened.
> - Test: could the other person read it and say *yes, that happened*?
> - Not *She ignored me.* Try *She didn't answer my two texts on Tuesday.*



## What you feel

> [!info]- Feelings, not thoughts
> - Name what is going on inside you, and notice where it sits in your body.
> - Let the feeling be there: every feeling points at a need.
> - Be specific: *good* and *bad* could mean anything, while *relieved*, *restless*, and *discouraged* tell you more.
> - Look under anger for vulnerable feelings such as hurt, fear, loneliness, or shame.
> - *Ignored*, *attacked*, and *let down* are thoughts about what someone did, as is anything after *I feel that* or *I feel like*.
> - Not *I feel ignored.* Try *I feel lonely and hurt.*

${toEmptyBlock(FEELINGS)}



## What you need

> [!info]- Needs, not strategies
> - Name what matters to you here: needs are universal and belong to everyone, including understanding, safety, closeness, rest, and autonomy.
> - Which needs were threatened, at risk, or met?
> - Take them seriously: having needs isn't neediness.
> - If it names a person or action, ask what having it would give you; that is the need.
> - Not *I need her to text back.* Try *I need connection and reassurance.*

${toEmptyBlock(NEEDS)}



## What you could ask for

> [!info]- Requests, not demands
> - Start wide and creative: find every way the need could be met, including ways that don't involve them.
> - Pick one that is specific, doable, and now.
> - Say what you want, not what you don't.
> - Some requests are to yourself; not everything here was theirs to give.
> - If they could not say no without paying for it, it's a demand.
> - Not *Be more considerate.* Try *Would you text me if you'll be more than an hour late?*
`,
  },
  {
    id: "hear-them",
    name: "Hear them",
    text: `# Hear them

> [!note]- What this is for
> Someone said or did something that stung, and you're tempted to strike back, walk away, or grovel. Any of those reactions can make things harder. This is for making a tentative guess about the feeling and need behind their words, before you decide how to respond. Understanding them does not require agreement, taking responsibility for their feelings, or continuing the conversation.
>
> It asks the same four questions as the **Make sense of it** command, turned towards the other person: what they said, what they might be feeling, what they might be needing, and what you could say back. Your needs matter just as much. If you choose to keep talking and they feel heard, you can ask whether they are willing to hear your side.
>
> If you're too flooded to wonder what they feel, run **Make sense of it** first.

## What they said or did

> [!info]- Their words, not your reading of them
> - Write what they said and did, as exactly as you can, the way a camera would have caught it.
> - Leave out what it meant to you and the story in your head about it; that reaction belongs in **Make sense of it**.
> - Test: would they recognise this as what they said?
> - Not *She attacked me for texting.* Try *She said "You're so needy. I can't go a day without you checking up on me."*



## What they might be feeling

> [!info]- A guess, not certainty
> - Guess what was going on inside them in a few words; you don't have to be right.
> - Someone's words may reflect pain, fear, or frustration, but your guess is only a starting point to check.
> - Anger or judgment may point to something they are missing or afraid to lose, but only they can say whether it does.
> - *She feels that…* and *She feels I'm…* are guesses at her thoughts, not her feelings.
> - Not *She feels that I'm too much.* Try *She might be feeling overwhelmed and scared.*

${toEmptyBlock(FEELINGS)}



## What they might be needing

> [!info]- Needs, not strategies
> - Guess what they were missing or afraid to lose when they said it.
> - We all have the same needs: connection, safety, respect, play, and many others.
> - A judgment can sometimes show that something matters to them, but treat a possible need as a guess rather than proof.
> - *She needs me to…* is a strategy, not a need; guess the need without deciding what she should do or whether you're the one to help.
> - Not *She needs me to back off.* Try *She might need space, and trust that I'll be fine without a reply.*

${toEmptyBlock(NEEDS)}



## What you could say back

> [!info]- A question, not a diagnosis
> - Try your guess as a question they can correct, such as *Are you feeling ___ because you need ___?*
> - Keep it about them; save explanations, defenses, and your side until they feel heard.
> - Advising, reassuring, correcting the facts, one-upping, and quizzing them aren't helpful now, however true or kind.
> - A wrong guess can help them correct you, and if you keep talking, ask whether they are willing to hear your side.
> - Not *I was only worried*, *you could have just replied*, or *sorry, I'll stop*. Try *Are you feeling overwhelmed and needing some space?*
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
> Go top to bottom if you can. Not every section has to be filled in. You don't have to contact anyone or make repair now. If you choose to repair with the other person, **Hear them** can help you begin by hearing their side.

## What you did

> [!info]- The action, not the verdict
> - Write what you said or did, as exactly as you can, the way a camera would have caught it.
> - Leave out the verdict: *I was a jerk* and *I always do this* teach as little as judging anyone else.
> - Test: would someone who saw it agree that it happened without agreeing with what you think it makes you?
> - Not *I was horrible to him.* Try *When he texted a second time, I wrote "You're so needy."*



## What you feel now

> [!info]- Regret, not self-punishment
> - Name what you feel about having done it, and where it sits in your body.
> - Let guilt, shame, and regret be there without arguing with them or explaining them away.
> - *I feel like an idiot* is a verdict, while *I feel ashamed* is a feeling that may cover sadness, embarrassment, or fear of what it cost.
> - Not *I feel like a terrible partner.* Try *I feel sad and ashamed.*

${toEmptyBlock(FEELINGS)}



## What it cost you

> [!info]- Mourning: your needs, not a verdict about you
> - Ask which of your own needs went unmet by what you did: connection, integrity, care for someone you love, being the person you mean to be.
> - Letting yourself feel this can make it easier to choose differently, while beating yourself up can make you want to stop feeling.
> - If it names what you should do next, it's a strategy; ask what that action would serve.
> - Not *I need to stop being so reactive.* Try *I need connection with him, and to treat him with care.*

${toEmptyBlock(NEEDS)}



## What you were reaching for

> [!info]- Self-forgiveness: understand the need, not excuse the action
> - Ask what you needed in that moment that made this seem like a way to get it.
> - One NVC lens is that actions, including this one, try to meet a need even when the strategy fails.
> - Seeing that need is self-forgiveness: it helps you choose differently without letting yourself off.
> - Not *I don't know why I did it. I just snapped.* Try *I needed space, and to trust he'd be all right without an answer.*

${toEmptyBlock(NEEDS)}



## What you'll do now

> [!info]- A next step, not a penance
> - Pick one thing that serves both needs: the one you hurt and the one you were reaching for.
> - Say what you'll do, not what you'll never do again: *When I need space I'll say so* is actionable, while *I'll stop snapping* is not.
> - If it involves them, make it an offer they can decline; an apology that has to be accepted is a demand.
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

## What they did

> [!info]- The act, not the adjective
> - Write what they did or said, as exactly as you can, the way a camera would have caught it.
> - Avoid adjectives such as *thoughtful*, *generous*, and *amazing*: they are conclusions that hide the act.
> - Test: could they picture the moment from what you wrote?
> - Not *She was really understanding about it.* Try *She called that evening and said she'd needed a quiet day, and it wasn't about me.*



## What you felt

> [!info]- Feelings, not compliments
> - Name what it stirred in you, and where you felt it.
> - Be specific: *good* says little, while *relieved*, *touched*, *warm*, and *glad* each say something different.
> - A compliment is about them, while a feeling is about you and cannot be argued with or deflected.
> - Not *I felt like you really get me.* Try *I felt relieved, and warm towards you.*

${toEmptyBlock(FEELINGS)}



## Why it mattered to you

> [!info]- Needs, not praise
> - Ask which need of yours their action met; that is why it mattered and makes the thanks land as more than manners.
> - The same needs as always: connection, honesty, support, care, to matter, and many others.
> - If it names what they did, ask what having it gave you; that is the need.
> - Not *I needed you to call.* Try *I needed to know I still matter to you.*

${toEmptyBlock(NEEDS)}



## What you'll tell them

> [!info]- A celebration, not a reward
> - If you want to share it, tell them what they did, what you felt, and why it mattered to you, in person or in writing.
> - Avoid adding a *but* or a request tucked in behind it, because thanks with an ask can feel like a bribe.
> - When it's your turn to be thanked, take it in: *It was nothing* refuses the gift.
> - Not *You're the best. Thanks for being so understanding.* Try *When you called last night and told me it wasn't about me, I felt so relieved. I'd needed to know I still matter to you.*
`,
  },
];
