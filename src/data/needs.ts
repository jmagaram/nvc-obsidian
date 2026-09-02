// The needs and their category headings come from the Center for Nonviolent
// Communication's four-page Feelings and Needs Inventory, © 2023 Center for
// Nonviolent Communication, www.cnvc.org. CNVC gives permission to copy and
// share it and asks to be credited; see README.md.
//
// The word list is reproduced unchanged — verified against the source
// word-for-word in August 2026. Two things here look like transcription errors
// and are not: `safety` is listed under both Connection and Physical Wellbeing,
// and several entries are phrases rather than single words. Both are upstream.
//
// The definitions are not. The source is a bare word list with no glosses, so
// every definition below was written for this project. See TODO.md.

export type Need = {
  word: string
  definition: string
}

export type NeedCategory = {
  name: string
  needs: Need[]
}

export const categories: NeedCategory[] = [
  {
    name: 'Autonomy',
    needs: [
      { word: 'choice', definition: 'More than one real option in front of you.' },
      { word: 'freedom', definition: 'Living your life without something holding you back.' },
      { word: 'independence', definition: 'Standing on your own without asking permission.' },
      { word: 'space', definition: 'Room around you that nobody else is filling.' },
      { word: 'spontaneity', definition: 'Following an impulse the moment it arrives.' },
    ],
  },
  {
    name: 'Connection',
    needs: [
      { word: 'acceptance', definition: 'Being taken as you are.' },
      { word: 'affection', definition: 'Warmth shown to you in small ways.' },
      { word: 'appreciation', definition: 'Having what you give be noticed.' },
      { word: 'belonging', definition: 'Being one of the people here rather than a guest.' },
      { word: 'cooperation', definition: 'Working with someone toward what you both want.' },
      { word: 'communication', definition: 'Words passing between you and landing.' },
      { word: 'closeness', definition: 'Little distance left between you and someone.' },
      { word: 'community', definition: 'A group of people whose lives touch yours.' },
      { word: 'companionship', definition: 'Someone alongside you in what you do.' },
      { word: 'compassion', definition: 'Suffering met with care rather than judgement.' },
      { word: 'consideration', definition: 'Having your needs weighed before someone acts.' },
      { word: 'consistency', definition: 'Being met the same way today as yesterday.' },
      { word: 'empathy', definition: 'Someone sensing what it is like to be you.' },
      { word: 'inclusion', definition: 'Being brought in rather than left outside.' },
      { word: 'intimacy', definition: 'Letting someone see what you show no one else.' },
      { word: 'love', definition: 'Caring deeply and being deeply cared for.' },
      { word: 'mutuality', definition: 'Giving and receiving flowing both ways.' },
      { word: 'nurturing', definition: 'Care that helps someone grow.' },
      { word: 'respect/self-respect', definition: 'Being treated as worth something, by others and by yourself.' },
      { word: 'safety', definition: 'Being able to lower your guard.' },
      { word: 'security', definition: 'Trusting that what you depend on will still be there.' },
      { word: 'stability', definition: 'Ground that does not shift under you.' },
      { word: 'support', definition: 'Not carrying the weight alone.' },
      { word: 'to know and be known', definition: 'Being familiar to someone all the way through.' },
      { word: 'to see and be seen', definition: 'Being noticed as you actually are.' },
      { word: 'to understand and be understood', definition: 'Making sense to someone, and them to you.' },
      { word: 'trust', definition: 'Being able to count on what someone says.' },
      { word: 'warmth', definition: 'Kindness you can feel in how someone treats you.' },
    ],
  },
  {
    name: 'Honesty',
    needs: [
      { word: 'authenticity', definition: 'Being the same on the outside as within.' },
      { word: 'integrity', definition: 'Your actions matching what you believe.' },
      { word: 'presence', definition: 'Being fully here rather than half elsewhere.' },
    ],
  },
  {
    name: 'Meaning',
    needs: [
      { word: 'awareness', definition: 'Noticing what is happening in and around you.' },
      { word: 'celebration of life', definition: 'Marking what is good while it is here.' },
      { word: 'challenge', definition: 'Something hard enough to stretch you.' },
      { word: 'clarity', definition: 'Seeing a thing plainly, with the fog gone.' },
      { word: 'competence', definition: 'Being good at what you set out to do.' },
      { word: 'consciousness', definition: 'Being awake to what you are part of.' },
      { word: 'contribution', definition: 'Adding something to a life other than your own.' },
      { word: 'creativity', definition: 'Making something that was not there before.' },
      { word: 'discovery', definition: 'Finding what you did not know was there.' },
      { word: 'efficacy', definition: 'Your effort actually changing something.' },
      { word: 'effectiveness', definition: 'Reaching the result you aimed at.' },
      { word: 'growth', definition: 'Becoming more than you were.' },
      { word: 'hope', definition: 'Believing something better is still possible.' },
      { word: 'learning', definition: 'Coming to know what you did not know before.' },
      { word: 'mourning', definition: 'Grieving a loss fully instead of passing over it.' },
      { word: 'participation', definition: 'Having a hand in what gets decided.' },
      { word: 'purpose', definition: 'A reason your effort is worth spending.' },
      { word: 'self-expression', definition: 'Putting what is inside you into the world.' },
      { word: 'stimulation', definition: 'Enough going on to keep your mind alive.' },
      { word: 'to matter', definition: 'Your existence counting to someone.' },
      { word: 'understanding', definition: 'Grasping how something actually works.' },
    ],
  },
  {
    name: 'Peace',
    needs: [
      { word: 'beauty', definition: 'Something lovely to rest your attention on.' },
      { word: 'communion', definition: 'Feeling joined to something larger than you.' },
      { word: 'ease', definition: 'Doing what you do without strain.' },
      { word: 'equality', definition: 'Standing on level ground with others.' },
      { word: 'harmony', definition: 'Parts fitting together without friction.' },
      { word: 'inspiration', definition: 'Something lifting you toward what you could make.' },
      { word: 'order', definition: 'Things arranged so you can find your way.' },
    ],
  },
  {
    name: 'Physical Wellbeing',
    needs: [
      { word: 'air', definition: 'Clean air to breathe.' },
      { word: 'food', definition: 'Enough to eat, and food that nourishes.' },
      { word: 'movement or exercise', definition: 'Using your body the way it was made to be used.' },
      { word: 'rest/sleep', definition: 'Stopping long enough to be restored.' },
      { word: 'sexual expression', definition: 'Living out your sexuality.' },
      { word: 'safety', definition: 'Being out of harm’s way.' },
      { word: 'shelter', definition: 'A place that keeps the weather off you.' },
      { word: 'touch', definition: 'Physical contact with another person.' },
      { word: 'water', definition: 'Enough clean water to drink.' },
    ],
  },
  {
    name: 'Play',
    needs: [
      { word: 'joy', definition: 'Delight that needs no reason.' },
      { word: 'humor', definition: 'Laughing at how things are.' },
    ],
  },
]
