/* eslint-disable max-len */
/**
 * Central registry for AI-default banned phrases. Every prompt that references
 * these must render from this file so we do not drift (Prompt 10).
 * `detectRegex` is for a future post-hoc scanner (Prompt 16); optional when the
 * rule is contextual prose rather than a clean pattern.
 */

export type BannedPhraseCategory =
  | "descriptive_tics"
  | "emotional_telegraphs"
  | "pinterest_endings"
  | "authorial_wisdom"
  | "gauzy_world_is_watching"
  | "business_self_help_clichés"
  | "bullet_point_narrative"
  | "real_public_figures"
  | "blurb_boilerplate"
  | "nonfiction_banned_move";

export type BannedPhraseAppliesTo =
  | "fiction"
  | "non_fiction"
  | "blurb"
  | "rewrite"
  | "literary_fiction"
  | "literary_nonfiction_business";

/** Pair used in prompts and slop UI: model learns faster from a concrete swap than from negation alone. */
export type BannedPhraseReplacementExample = {
  instead_of: string;
  write: string;
};

export type BannedPhrase = {
  /** Human-readable id / primary phrase text for this row */
  pattern: string;
  detectRegex?: RegExp;
  category: BannedPhraseCategory;
  appliesTo: BannedPhraseAppliesTo[];
  /** What to do when the model reaches for the banned tic (v2: required). */
  replacementGuidance: string;
  /** Not / Yes line pair for teaching-by-example. Required for every registry row. */
  replacementExample: BannedPhraseReplacementExample;
  /** Global sequence so filtered renders keep stable order */
  order: number;
  /**
   * For chapter fiction SLOP: first row in a visual group (the "BANNED: ..." line).
   * Omitted for continuation bullets in the same group.
   */
  slopGroupHeading?: string;
  /**
   * Exact list body for this bullet, without a leading "- ".
   * Use "\n" + two-space-indented continuations to match the chapter prompt.
   */
  listLine?: string;
  /**
   * For rewrite prompt: the "no `...`" clause text (commas and spacing matter).
   */
  rewriteClause?: string;
  /**
   * For literary-prompt # BANNED PHRASES: full `- ...` line after the bullet prefix.
   */
  literaryFictionListLine?: string;
  /**
   * Literary non-fiction self-help slop: line after `-` under the business SLOP block.
   */
  literaryNonFictionListLine?: string;
};

const CHAPTER_FICTION_SLOP_PREFIX = `## SLOP FILTERS — these are absolute

When you are about to use one of the stock phrases below, do not
pattern-match around the surface form. Replace it with a concrete, scene-specific move (see each INSTEAD and Example).

`;

function byOrder(rows: BannedPhrase[]): BannedPhrase[] {
  return [...rows].sort((a, b) => a.order - b.order);
}

/** One teaching bullet: ban is secondary to the concrete swap. */
function formatTeachingSlopItem(p: BannedPhrase): string {
  const neverLabel = p.pattern.replace(/\n/g, " ").trim();
  const ex = p.replacementExample;
  return (
    `- NEVER: "${neverLabel}"\n` +
    `  INSTEAD: ${p.replacementGuidance}\n` +
    `  Example:\n` +
    `    Not: "${ex.instead_of}"\n` +
    `    Yes: "${ex.write}"`
  );
}

function headingLine(heading: string): string {
  const t = heading.trim();
  if (t.startsWith("##")) return t;
  return `## ${t}`;
}

/**
 * Renders the canonical SLOP block (fiction chapter system prompt) and other
 * scope-specific banned copy from `BANNED_PHRASES`.
 */
export function renderBannedPhrasesBlock(
  appliesTo: "fiction" | "non_fiction" | "blurb" | "rewrite",
): string {
  if (appliesTo === "fiction") {
    const rows = byOrder(
      BANNED_PHRASES.filter((p) => p.appliesTo.includes("fiction")),
    );
    let out = CHAPTER_FICTION_SLOP_PREFIX;
    let i = 0;
    for (const r of rows) {
      if (r.slopGroupHeading) {
        if (i > 0) out += "\n\n";
        out += headingLine(r.slopGroupHeading);
      }
      out += "\n" + formatTeachingSlopItem(r);
      i++;
    }
    return out;
  }
  if (appliesTo === "non_fiction") {
    const rows = byOrder(
      BANNED_PHRASES.filter((p) => p.appliesTo.includes("non_fiction")),
    );
    return (
      `BANNED MOVES (apply the swap, not a surface rewrite around the ban):\n\n` +
      rows.map((r) => formatTeachingSlopItem(r)).join("\n\n")
    );
  }
  if (appliesTo === "blurb") {
    const rows = byOrder(
      BANNED_PHRASES.filter((p) => p.appliesTo.includes("blurb")),
    );
    return rows
      .map(
        (p) =>
          `Avoid "${p.pattern}": ${p.replacementGuidance} Example: Not "${p.replacementExample.instead_of}" — Yes: "${p.replacementExample.write}"`,
      )
      .join(" ");
  }
  if (appliesTo === "rewrite") {
    const rows = byOrder(
      BANNED_PHRASES.filter(
        (p) => p.appliesTo.includes("rewrite") && p.rewriteClause,
      ),
    );
    return rows
      .map(
        (p) =>
          `${p.rewriteClause} INSTEAD: ${p.replacementGuidance} (e.g. Not: "${p.replacementExample.instead_of}" / Yes: "${p.replacementExample.write}")`,
      )
      .join(" ");
  }
  return "";
}

export function renderLiteraryFictionBannedList(): string {
  return byOrder(
    BANNED_PHRASES.filter(
      (p) => p.appliesTo.includes("literary_fiction") && p.literaryFictionListLine,
    ),
  )
    .map((p) => formatTeachingSlopItem(p))
    .join("\n\n");
}

export function renderLiteraryNonFictionBusinessList(): string {
  return byOrder(
    BANNED_PHRASES.filter(
      (p) =>
        p.appliesTo.includes("literary_nonfiction_business") &&
        p.literaryNonFictionListLine,
    ),
  )
    .map((p) => formatTeachingSlopItem(p))
    .join("\n\n");
}

/** Literary fiction: ## 8 "must not end on" list (separate from # BANNED PHRASES). */
export const LITERARY_FICTION_MUST_NOT_END_ON = `The chapter MUST NOT end on:
- A summary of what the chapter taught the characters
- A meditation on friendship, wonder, adventure, discovery
- A gauzy promise of more to come
- The phrase "little did they know"
- The phrase "and so" or "and so it was"`;

export const BANNED_PHRASES: readonly BannedPhrase[] = [
  // ——— Chapter system prompt — fiction (SLOP) ———
  {
    order: 10,
    pattern: "Her eyes twinkled / widened / lit up / darted / narrowed",
    detectRegex: /\beyes\s+(?:twinkled|widened|lit\s+up|darted|narrowed)\b/gi,
    category: "descriptive_tics",
    appliesTo: ["fiction", "rewrite"],
    replacementGuidance:
      "Replace stock eye-reactions with a specific action or observation the POV character performs. Eyes don't have vocabulary; hands, posture, and dialogue do.",
    replacementExample: {
      instead_of: "Her eyes twinkled with mischief.",
      write:
        "She said it without quite looking at him, which was how he knew she was about to do something he'd have to apologize for later.",
    },
    slopGroupHeading: "BANNED: descriptive tics from the AI training-data mean",
    listLine: `"Her eyes twinkled / widened / lit up / darted / narrowed" — find
  another way to show the emotion, ideally through action`,
    rewriteClause: `no "eyes twinkled/widened/lit up,"`,
  },
  {
    order: 11,
    pattern: "A shiver ran down her spine",
    detectRegex: /shiver\s+ran\s+down.*spine/gi,
    category: "descriptive_tics",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Swap the spine cliché for a specific, localizable sensation: skin, sound, or a small action.",
    replacementExample: {
      instead_of: "A shiver ran down her spine.",
      write: "The backs of her hands prickled; she pushed her sleeves down and kept walking.",
    },
    listLine: `"A shiver ran down her spine"`,
  },
  {
    order: 12,
    pattern: "She let out a breath she didn't know she was holding",
    detectRegex: /let\s+out\s+a\s+breath.*didn't\s+know/gi,
    category: "emotional_telegraphs",
    appliesTo: ["fiction", "rewrite"],
    replacementGuidance:
      "Breath-releases as relief-markers are a common AI-fiction tic. Replace with a specific physical action that implies relief — unclenching, sitting, noticing ambient sound again.",
    replacementExample: {
      instead_of: "She let out a breath she didn't know she was holding.",
      write: "Her hand, which had been gripping the door frame, slackened.",
    },
    listLine: `"She let out a breath she didn't know she was holding"`,
    rewriteClause: `no "she let out a breath she didn't know she was holding,"`,
  },
  {
    order: 13,
    pattern: "Her heart hammered / pounded in her chest",
    detectRegex: /\bheart\s+(?:hammered|pounded)\s+in\s+her\s+chest\b/gi,
    category: "descriptive_tics",
    appliesTo: ["fiction", "rewrite"],
    replacementGuidance:
      "Name what the body does without the cardio-metaphor. Audible pulse, breath, a held muscle, a mistake in movement.",
    replacementExample: {
      instead_of: "Her heart hammered in her chest.",
      write: "She could hear her own pulse in her ears, too loud, like a tell at a card table.",
    },
    listLine: `"Her heart hammered / pounded in her chest"`,
    rewriteClause: `no "her heart hammered in her chest,"`,
  },
  {
    order: 14,
    pattern: "A smile tugged at the corner of his mouth",
    detectRegex: /smile\s+tugged\s+at\s+the\s+corner/gi,
    category: "descriptive_tics",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Show an asymmetry in the face with one concrete detail instead of a stock smile idiom.",
    replacementExample: {
      instead_of: "A smile tugged at the corner of his mouth.",
      write: "Only one side of his mouth moved, and that was worse than a full grin.",
    },
    listLine: `"A smile tugged at the corner of his mouth"`,
  },
  {
    order: 15,
    pattern: "His jaw tightened",
    category: "descriptive_tics",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Replace the jaw clamp with a specific gesture: food, drink, a sentence stopped halfway, a neck movement.",
    replacementExample: {
      instead_of: "His jaw tightened.",
      write: "He set his coffee down with enough care to make the saucer rattle once.",
    },
    listLine: `"His jaw tightened"`,
  },
  {
    order: 16,
    pattern: "She felt a warmth spreading through her chest",
    category: "emotional_telegraphs",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Let the body show relief or affection with an action, not a glowing torso.",
    replacementExample: {
      instead_of: "She felt a warmth spreading through her chest.",
      write: "She unzipped her coat in the cold vestibule anyway, as if the building owed her that.",
    },
    listLine: `"She felt a warmth spreading through her chest"`,
  },
  {
    order: 17,
    pattern: "The silence was deafening",
    category: "emotional_telegraphs",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Make silence concrete: a small sound that wasn't there before, a held posture, a room-specific detail.",
    replacementExample: {
      instead_of: "The silence was deafening.",
      write: "The fridge clicked off, and the kitchen had that flat, unanswerable quiet after.",
    },
    listLine: `"The silence was deafening"`,
  },
  {
    order: 18,
    pattern: "Stock body-cue internal state",
    category: "descriptive_tics",
    appliesTo: ["fiction"],
    replacementGuidance:
      "If the line only labels an emotion through a body cliché, replace it with one observable behavior or one line of thought tied to a concrete object.",
    replacementExample: {
      instead_of: "Guilt sat heavy in her stomach.",
      write: "She found herself alphabetizing the spice rack, which was what she did when she didn't want the real task.",
    },
    listLine: `Any sentence whose job is to tell the reader a character's internal
  state through a stock body cue`,
  },
  {
    order: 20,
    pattern: "Narrator aphorism chapter endings",
    category: "pinterest_endings",
    appliesTo: ["fiction"],
    replacementGuidance:
      "End on an image, a line of speech, or a problem still open — not a lesson about life.",
    replacementExample: {
      instead_of: "In the end, she realized friendship was the real treasure.",
      write: "The bus doors hissed open two stops early, and she stepped off before she could name why.",
    },
    slopGroupHeading: "BANNED: the Pinterest-quote ending",
    listLine: `Chapters must NOT end on a narrator aphorism about life, growing up,
  change, impossibility, courage, or friendship.`,
  },
  {
    order: 21,
    pattern: "Forbidden closing registers",
    category: "pinterest_endings",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Cut these closing stock registers entirely; land on a sensory beat or a line only this character would say.",
    replacementExample: {
      instead_of: "Maybe that was what growing up was, she thought: learning to let go.",
      write: "She pocketed the ticket stub even though the show had been a disaster.",
    },
    listLine: `Specifically forbidden closing registers: "Sometimes the hardest
  thing…", "Maybe that was what [growing up / love / courage] was", "…and
  that was just the beginning", "Impossible was just another word for…",
  "Every moment changes you a little", "The real adventure had only just
  begun".`,
  },
  {
    order: 22,
    pattern: "Chapter ending on specific image, dialogue, or question",
    category: "pinterest_endings",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Prefer an unanswered question, a last line of dialogue, or a single visual beat over reflection.",
    replacementExample: {
      instead_of: "The chapter closed on a thought about how much everything had changed.",
      write: '"You still have my screwdriver," she said. The porch light was already off.',
    },
    listLine: `A chapter ends on a specific image, a specific line of dialogue, or a
  specific unanswered question. Never on wisdom.`,
  },
  {
    order: 30,
    pattern: "Real living public figures as speaking characters",
    category: "real_public_figures",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Invent a fictional figure in the same social role. Keep scale human and speakable; never put scripted lines in a real, living public person's mouth.",
    replacementExample: {
      instead_of:
        'The CEO leaned in. "We will disrupt agriculture," the founder said, lines written for a real tech mogul.',
      write: 'A regional buyer she called only "Mitchell" in her head had agreed to one trial acre — the rest was still a fight.',
    },
    slopGroupHeading: "BANNED: real living public figures",
    listLine: `Do NOT write real living public figures (entrepreneurs, politicians,
  celebrities, scientists, athletes) as speaking characters in fiction,
  even sympathetically. If the brief's world needs a figure in a
  comparable role, invent a fictional one. A passing mention of a real
  person's name in dialogue is acceptable if the brief establishes it;
  putting words in their mouth is not.`,
  },
  {
    order: 31,
    pattern: "Invented quotes attributed to real people",
    category: "real_public_figures",
    appliesTo: ["fiction"],
    replacementGuidance:
      "If you need a pithy line, make it an anonymous paraphrase, a fictional name, or clearly labeled folklore — never a fake direct quote on a real person.",
    replacementExample: {
      instead_of: 'The epigraph read, "Courage is a habit" — Dr. Fauci, 2020.',
      write: "The epigraph was from a county extension pamphlet, author unknown, copyright worn off at the corner.",
    },
    listLine: `Do NOT attribute invented quotes to real people in any form — not in
  dialogue, not in epigraphs, not in closing quotations.`,
  },
  {
    order: 40,
    pattern: "What they knew: / What they had: narrative lists",
    category: "bullet_point_narrative",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Render status as a scene: two concrete facts, one pressure that forces a choice, no colon-led inventory.",
    replacementExample: {
      instead_of:
        "What they knew: the road was long. What they had: a bad map, each other, and a dented thermos.",
      write: "The map was wrong in two places before lunch; the thermos clanked when he set it down, and she pretended not to notice the leak.",
    },
    slopGroupHeading: "BANNED: bullet-point narrative structure",
    listLine: `Do not structure narrative prose as "What they knew: / What they had: /
  What they needed:" lists or any variation. Prose with emotional stakes
  is not a status report. (This does not apply to nonfiction where lists
  are a legitimate tool, or to fiction scenes that genuinely feature a
  character making a list as an in-world action.)`,
  },
  {
    order: 50,
    pattern: "World is watching / global movement resolution",
    category: "gauzy_world_is_watching",
    appliesTo: ["fiction"],
    replacementGuidance:
      "Keep the resolution in the room, on the block, in the subculture. No viral fame, no globe-spanning hope montage, unless the brief is explicitly satirical.",
    replacementExample: {
      instead_of: "By spring, #RiverKids had children writing letters on every continent.",
      write: "The farmer's co-op let her use the weigh station for one Saturday; two counties showed, and that was the whole world that mattered.",
    },
    slopGroupHeading: `BANNED: the "world is watching" resolution`,
    listLine: `Do not resolve a personal-scale story by having the protagonist's
  small success inspire a global movement, attract messages from kids
  around the world, or get named at an awards ceremony in the last
  chapter. This is the AI-default uplift ending and it kills books.`,
  },
  {
    order: 60,
    pattern: "Authorial wisdom sentences",
    category: "authorial_wisdom",
    appliesTo: ["fiction", "rewrite"],
    replacementGuidance:
      "If a sentence's only job is a universal about human nature, cut it or replace with a line tied to a specific object, habit, or stake in this story.",
    replacementExample: {
      instead_of: "People are strange about the things they choose to care about.",
      write: "She had hung the calendar with the free nail from the phone-company keychain and never moved it, even after the company folded.",
    },
    slopGroupHeading: "BANNED: authorial wisdom sentences",
    listLine: `Sentences whose only purpose is for the narrator (or a character) to
  state a universal truth about human nature. "People care about strange
  things." "Everything gets stale eventually." "Different wasn't bad,
  just different." One such line per book is a lot. Zero is better than
  forced.`,
    rewriteClause: `no authorial wisdom aphorisms.`,
  },

  // ——— getChapterSystemPromptForBookType — non_fiction (BANNED MOVES) ———
  {
    order: 100,
    pattern: "Transition summary sentences (As we've seen...)",
    category: "nonfiction_banned_move",
    appliesTo: ["non_fiction"],
    replacementGuidance:
      "Bridge with the next tool, question, or problem — not a recap. Point forward, not backward.",
    replacementExample: {
      instead_of: "As we've seen, trust is a key factor in any negotiation.",
      write: "The next number to test is not whether they like you, but what they have already conceded once.",
    },
    listLine: `Transition sentences that summarize what you just said ("As we've
  seen...")`,
  },
  {
    order: 101,
    pattern: "Hedging authority dilution",
    category: "nonfiction_banned_move",
    appliesTo: ["non_fiction"],
    replacementGuidance:
      "Name scope honestly once (who, when) instead of smearing the claim with 'often' and 'some'.",
    replacementExample: {
      instead_of: "In many cases, teams can benefit from a clearer handoff.",
      write: "In the twelve teams I coached last year, the failure mode was the same: nobody owned the handoff.",
    },
    listLine: `Hedging language that dilutes authority ("In many cases...", "Often...",
  "Some might argue...")`,
  },
  {
    order: 102,
    pattern: "Examples without specificity",
    category: "nonfiction_banned_move",
    appliesTo: ["non_fiction"],
    replacementGuidance:
      "Swap placeholders for one named company, one date, or one verifiable detail; otherwise compress to principle without a fake case study.",
    replacementExample: {
      instead_of: "A major retailer improved retention by listening to its staff.",
      write: "Target's 2011 cart-attendant pilot cut shrink in test stores before it rolled up.",
    },
    listLine: `Examples without specificity (no "a Fortune 500 company" — name it, or
  make the unnamed detail so vivid it feels real)`,
  },
  {
    order: 103,
    pattern: "Motivational aphorism chapter ending",
    category: "nonfiction_banned_move",
    appliesTo: ["non_fiction"],
    replacementGuidance:
      "End on a concrete next step, a tension left open, or a fact that implies action — not a pep talk to the reader.",
    replacementExample: {
      instead_of: "The only question left is: what will you do with this knowledge?",
      write: "Fill in the one-line summary at the end of the worksheet before you start Monday's call.",
    },
    listLine: `Ending a chapter with a motivational aphorism or a "what will you do
  with this?" prompt to the reader. Trust the material.`,
  },

  // ——— Back cover blurb (render: compact line in getBackCoverPrompt) ———
  {
    order: 200,
    pattern: "in a world where…",
    category: "blurb_boilerplate",
    appliesTo: ["blurb"],
    replacementGuidance: "Set one specific year, place, or condition instead of a genre thesis.",
    replacementExample: {
      instead_of: "In a world where water is currency…",
      write: "In 2041 the county aquifer failed—then the lawyers showed up in rented sedans.",
    },
  },
  {
    order: 201,
    pattern: "little did they know…",
    category: "blurb_boilerplate",
    appliesTo: ["blurb"],
    replacementGuidance: "Imply foreshadowing with a concrete object or date, not a wink to the camera.",
    replacementExample: {
      instead_of: "Little did they know their quiet summer would end in fire.",
      write: "They signed the easement the week before the arson spree, name spelled wrong on the line.",
    },
  },
  {
    order: 202,
    pattern: "but everything changes when…",
    category: "blurb_boilerplate",
    appliesTo: ["blurb"],
    replacementGuidance: "Name a single event that breaks the status quo — no 'everything changes' boilerplate.",
    replacementExample: {
      instead_of: "But everything changes when a stranger arrives with a secret.",
      write: "The stranger brought only a sealed envelope and the deed to a house nobody remembered buying.",
    },
  },
  {
    order: 203,
    pattern: "a thrilling tale of…",
    category: "blurb_boilerplate",
    appliesTo: ["blurb"],
    replacementGuidance: "Use nouns: who wants what, who stands in the way — not 'a thrilling tale of.'",
    replacementExample: {
      instead_of: "A thrilling tale of love and vengeance in the high seas.",
      write: "A harpooner returns to a port that blacklisted his family to steal back one boat.",
    },
  },
  {
    order: 204,
    pattern: "an unforgettable journey",
    category: "blurb_boilerplate",
    appliesTo: ["blurb"],
    replacementGuidance: "Pin stakes to a route, job, or season; drop 'journey' unless the plot is literally travel with a map.",
    replacementExample: {
      instead_of: "An unforgettable journey of self-discovery.",
      write: "Three Greyhound tickets and a half-read letter: that's what she has when she leaves Omaha.",
    },
  },
  {
    order: 205,
    pattern: "you won't want to put it down",
    category: "blurb_boilerplate",
    appliesTo: ["blurb"],
    replacementGuidance: "Show tension with a last-line hook or a named risk — not a review blurb in advance.",
    replacementExample: {
      instead_of: "You won't want to put it down until the last page.",
      write: "By chapter three the reader will know the safe code; the book is whether anyone dares to use it.",
    },
  },
  {
    order: 206,
    pattern: "a must-read for fans of…",
    category: "blurb_boilerplate",
    appliesTo: ["blurb"],
    replacementGuidance: "If you use comps, one crisp pair beats a genre buffet string.",
    replacementExample: {
      instead_of: "A must-read for fans of Tana French and The Wire.",
      write: "For readers who like Tana French's procedural guilt more than the killer reveal.",
    },
  },

  // ——— Literary — # BANNED PHRASES (lib/openai/literary-chapter-system-prompts.ts) ———
  {
    order: 500,
    pattern: "eyes wide with [emotion]",
    category: "descriptive_tics",
    appliesTo: ["literary_fiction"],
    detectRegex: /eyes\s+wide\s+with/gi,
    replacementGuidance:
      "Name what the face does without the 'eyes wide' kit — lids, focus, or where the look lands.",
    replacementExample: {
      instead_of: "Her eyes were wide with wonder.",
      write: "She didn't blink until the first bell; her gaze stayed on the wire, not the crowd.",
    },
    literaryFictionListLine: `"eyes wide with [awe/wonder/curiosity/excitement/concern]"`,
  },
  {
    order: 501,
    pattern: "heart swelling / quickened / lifted / raced",
    category: "emotional_telegraphs",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Lose the cardio stock verbs; use breath, weight in the limbs, or a specific mistake in movement.",
    replacementExample: {
      instead_of: "Her heart swelled with relief.",
      write: "The knot between her shoulder blades unclenched, and the pen rolled off the table.",
    },
    literaryFictionListLine: `"heart swelling", "heart quickened", "heart lifted", "heart raced"`,
  },
  {
    order: 502,
    pattern: "tinged with / bubbling with / bright with (emotion cluster)",
    category: "emotional_telegraphs",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "One concrete image or one line of subtext, not a triple-decker emotion adjective stack.",
    replacementExample: {
      instead_of: "His voice was tinged with pride and regret.",
      write: "He said 'fine' the way a person does when the word is a door held shut.",
    },
    literaryFictionListLine: `"tinged with [emotion]", "bubbling with [emotion]", "bright with [emotion]"`,
  },
  {
    order: 503,
    pattern: "a mix of [X] and [Y] (feeling)",
    category: "emotional_telegraphs",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Show one clear dominant feeling and let the second arrive as contradiction in behavior.",
    replacementExample: {
      instead_of: "She felt a mix of excitement and dread.",
      write: "She was already smiling when her hands started packing the go-bag.",
    },
    literaryFictionListLine: `"a mix of [X] and [Y]" to describe a feeling`,
  },
  {
    order: 504,
    pattern: "velvet blanket of stars / sky / night",
    category: "descriptive_tics",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Describe night with light sources and limits: moon phase, a porch bulb, a neighbor's window.",
    replacementExample: {
      instead_of: "The night sky was a velvet blanket of stars.",
      write: "The Milky Way was a smear, but Mars hung alone over the barn like a small nail hole.",
    },
    literaryFictionListLine: `"velvet blanket of stars / sky / night"`,
  },
  {
    order: 505,
    pattern: "ethereal/golden/soft/warm/gentle glow",
    category: "descriptive_tics",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Name a single light source and one surface it hits; drop 'glow' unless the scene is about lamps.",
    replacementExample: {
      instead_of: "An ethereal golden glow suffused the room.",
      write: "The one working sconce had a 40-watt bulb; it buttered the crown molding, nothing more.",
    },
    literaryFictionListLine: `"ethereal glow", "golden glow", "soft glow", "warm glow", "gentle glow"`,
  },
  {
    order: 506,
    pattern: "pinprick of light",
    category: "descriptive_tics",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Name the object emitting light or the reason visibility exists — 'pinprick' is a postcard phrase.",
    replacementExample: {
      instead_of: "He saw a pinprick of light in the distance.",
      write: "A single window on the ridge, no curtains; someone was awake with the same insomnia.",
    },
    literaryFictionListLine: `"pinprick of light"`,
  },
  {
    order: 507,
    pattern: "bathed in [light/moonlight/sunlight]",
    category: "descriptive_tics",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Cut 'bathed'; use angle, color temperature, and what the light fails to reach.",
    replacementExample: {
      instead_of: "She was bathed in morning sunlight.",
      write: "The sun caught half her face; the other half was still the night kitchen.",
    },
    literaryFictionListLine: `"bathed in [light/moonlight/sunlight]"`,
  },
  {
    order: 508,
    pattern: "the air was tinged with / filled with / alive with",
    category: "descriptive_tics",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Put one smell, sound, or particulate the POV can name — the air is not a character.",
    replacementExample: {
      instead_of: "The air was thick with unspoken words.",
      write: "The laundry vent pumped damp heat; every sentence stuck halfway.",
    },
    literaryFictionListLine: `"the air was tinged with / filled with / alive with"`,
  },
  {
    order: 509,
    pattern: "a sense of [wonder/peace/resolve/purpose/belonging]",
    category: "emotional_telegraphs",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Show the behavior that would follow that feeling, not a label with 'a sense of.'",
    replacementExample: {
      instead_of: "He felt a sense of belonging for the first time.",
      write: "He took his shoes off in the hall without being asked, and no one flinched.",
    },
    literaryFictionListLine: `"a sense of [wonder/peace/resolve/purpose/belonging]"`,
  },
  {
    order: 510,
    pattern: "cosmic (lazy adjective)",
    category: "authorial_wisdom",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "If scale matters, be literal: orbit, season, map grid — 'cosmic' is nine times out of ten a vague intensifier.",
    replacementExample: {
      instead_of: "Their cosmic quest across the high seas…",
      write: "They had twelve nautical miles to clear before the radio died.",
    },
    literaryFictionListLine: `"cosmic" as a lazy adjective (cosmic adventure, cosmic journey, cosmic sea, cosmic capers)`,
  },
  {
    order: 511,
    pattern: "the universe seemed to [breathe / hold its breath / whisper / approve]",
    category: "gauzy_world_is_watching",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Keep the camera human-scale; no personified universe unless the genre is explicit mythic POV.",
    replacementExample: {
      instead_of: "The universe seemed to hold its breath with them.",
      write: "The crickets were late that year, and the streetlight buzz was the only steady sound.",
    },
    literaryFictionListLine: `"the universe seemed to [breathe / hold its breath / whisper / approve]"`,
  },
  {
    order: 512,
    pattern: "stars twinkled with approval / in agreement / with secrets",
    category: "gauzy_world_is_watching",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Stars are not a Greek chorus. Note weather, light pollution, or a named constellation, period.",
    replacementExample: {
      instead_of: "The stars twinkled in approval of their plan.",
      write: "Orion was already gone behind the oaks; they had the sky they deserved, not a verdict.",
    },
    literaryFictionListLine: `"stars twinkled with approval / in agreement / with secrets"`,
  },
  {
    order: 513,
    pattern: "infectious enthusiasm / boundless curiosity / unbridled joy",
    category: "blurb_boilerplate",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Show a single unforced gesture that implies energy; not three abstract intensifiers.",
    replacementExample: {
      instead_of: "She had boundless curiosity and infectious enthusiasm.",
      write: "She was on page forty while the rest of them were still on the handout, footnotes and all.",
    },
    literaryFictionListLine: `"infectious enthusiasm", "boundless curiosity", "unbridled joy"`,
  },
  {
    order: 514,
    pattern: "dramatic flourish",
    category: "descriptive_tics",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "Describe the physical motion or sound instead of the meta-label 'flourish.'",
    replacementExample: {
      instead_of: "He opened the case with a dramatic flourish.",
      write: "He flipped the latches in one stroke, the way a medic opens a field kit — click-click, not theatre.",
    },
    literaryFictionListLine: `"dramatic flourish"`,
  },
  {
    order: 515,
    pattern: "Chapter endings that are a gauzy promise of future adventure",
    category: "pinterest_endings",
    appliesTo: ["literary_fiction"],
    replacementGuidance: "End with friction still in the object world — a ticket, a door, a debt — not a tease about epic sequels.",
    replacementExample: {
      instead_of: "The real adventure, she sensed, was only just beginning…",
      write: "The car wouldn't start, and the ferry horn sounded twice — a schedule, not a promise.",
    },
    literaryFictionListLine: `Chapter endings that are a gauzy promise of future adventure`,
  },

  // ——— Literary non-fiction — BANNED (BUSINESS / SELF-HELP SLOP) ———
  {
    order: 400,
    pattern: "paradigm shift / at the end of the day / it's a journey / unlock your potential / game-changer / deep dive",
    category: "business_self_help_clichés",
    appliesTo: ["literary_nonfiction_business"],
    replacementGuidance:
      "Use plain work verbs and one scene from the reader's day job; replace each cliché with a testable action.",
    replacementExample: {
      instead_of: "We need a paradigm shift to unlock your team's potential and move forward on this deep dive journey.",
      write: "Run one pilot; measure three metrics for six weeks; keep or kill the process based on the log files.",
    },
    literaryNonFictionListLine: `"paradigm shift", "at the end of the day", "it's a journey", "move forward" / "moving forward", "unlock your potential", "game-changer", "deep dive", "leverage" (as verb, unless technical and earned), "circle back" (unless direct quoted speech in character)`,
  },
  {
    order: 401,
    pattern: "In today's fast-paced world",
    category: "business_self_help_clichés",
    appliesTo: ["literary_nonfiction_business"],
    replacementGuidance: "Name the year, the constraint, the speed that actually hurts — not 'fast-paced' throat-clearing.",
    replacementExample: {
      instead_of: "In today's fast-paced business environment, email never stops.",
      write: "In 2023 our median reply time to clients was 11 minutes, even on weekends; that was the baseline we had to name.",
    },
    literaryNonFictionListLine: `"In today's fast-paced world" or similar throat-clearing`,
  },
  {
    order: 402,
    pattern: "soft landing mutual affirmation ending",
    category: "pinterest_endings",
    appliesTo: ["literary_nonfiction_business"],
    replacementGuidance:
      "End with a tension (trade-off, open question, next experiment) — not a shared hug between author and reader.",
    replacementExample: {
      instead_of: "You have everything you need; go believe in your journey, together and apart.",
      write: "If you can only do one of the two exercises this week, do the one that costs money — the free one will wait.",
    },
    literaryNonFictionListLine: `Chapter endings that are a soft landing of mutual affirmation`,
  },
];
