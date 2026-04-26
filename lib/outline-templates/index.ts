/**
 * Structural outline templates.
 *
 * Static library used by the "Apply structural template" flow on the
 * outline page. Each template produces a stack of beats that the
 * outline page appends as new chapter sections. No AI at this stage.
 *
 * Design notes:
 *   - `beats[]` is ordered. The template applier appends them in order,
 *     starting at (current_max_chapter_number + 1).
 *   - `bookTypes` restricts which templates appear for non-fiction
 *     books. Most classical story structures are fiction-only; the
 *     three-act and hero's journey templates are the only ones flagged
 *     for both.
 *   - `beats[].title` becomes the chapter title.
 *     `beats[].summary` becomes the chapter `outline_summary`
 *     (which the existing OutlineEditor pipes into description).
 *   - `chapterHint` is informational only (shown in the preview) —
 *     the actual chapter number is computed from the current outline.
 *
 * Sources:
 *   - Save the Cat!: Blake Snyder, "Save the Cat!" (2005).
 *   - Hero's Journey: Christopher Vogler, "The Writer's Journey" (3rd ed.).
 *   - Three-Act: Syd Field, "Screenplay"; Robert McKee, "Story".
 *   - Seven-Point: Dan Wells, "7-Point Story Structure" lectures.
 *   - Snowflake: Randy Ingermanson, advancedfictionwriting.com.
 *   - Romance: Gwen Hayes, "Romancing the Beat" (2016).
 *   - Cozy Mystery: assembled from Crawford Kilian / Ramona DeFelice
 *     Long's cozy mystery columns and editor checklists.
 *   - Kishotenketsu: classical Japanese / Chinese 起承転結 four-act form.
 */

import type { BookTypeDb } from "@/types/database.types";

export type OutlineTemplateId =
  | "save-the-cat"
  | "heros-journey"
  | "three-act"
  | "seven-point"
  | "snowflake"
  | "romance-beat-sheet"
  | "cozy-mystery"
  | "kishotenketsu";

export type OutlineTemplateBeat = {
  /** Chapter title the beat seeds. */
  title: string;
  /** Beat summary — becomes the chapter's outline summary / description. */
  summary: string;
  /**
   * Informational only. Where the beat typically lands in a short novel,
   * used for the modal preview. Not written to the DB.
   */
  chapterHint?: number;
};

export type OutlineTemplate = {
  id: OutlineTemplateId;
  name: string;
  /** Short tagline shown under the name in the modal. */
  description: string;
  /** Canonical source — shown as a small credit line in the preview. */
  source: string;
  /** Human-facing genre / format tags. */
  bestFor: ReadonlyArray<string>;
  /** Which book types the template is appropriate for. */
  bookTypes: ReadonlyArray<BookTypeDb>;
  beats: ReadonlyArray<OutlineTemplateBeat>;
};

/* ------------------------------------------------------------------ *
 * Save the Cat! (Blake Snyder, 2005) — 15 beats.                     *
 * ------------------------------------------------------------------ */
const SAVE_THE_CAT: OutlineTemplate = {
  id: "save-the-cat",
  name: "Save the Cat! (Blake Snyder)",
  description:
    "15-beat structure used in most Hollywood screenplays and many commercial novels.",
  source: "Blake Snyder, Save the Cat! (2005).",
  bestFor: ["thriller", "romance", "commercial fiction", "screenplay"],
  bookTypes: ["fiction"],
  beats: [
    {
      title: "Opening Image",
      summary:
        "A snapshot of the hero's world before the story starts. Set tone, mood, and the flaw the hero needs to overcome. ~1% in.",
      chapterHint: 1,
    },
    {
      title: "Theme Stated",
      summary:
        "Someone (usually not the hero) states the thematic question the story will test — in passing, easy to miss on a first read.",
      chapterHint: 1,
    },
    {
      title: "Set-Up",
      summary:
        "Introduce the hero, their world, the cast around them, and what they want. Plant everything the hero will need later. Pages 1–10%.",
      chapterHint: 2,
    },
    {
      title: "Catalyst",
      summary:
        "A single event that disrupts the hero's life — the telegram, the phone call, the knock at the door. ~10%.",
      chapterHint: 3,
    },
    {
      title: "Debate",
      summary:
        "The hero resists. Can I do this? Should I? The hero's reluctance lets the reader see the cost of saying yes. 10–20%.",
      chapterHint: 4,
    },
    {
      title: "Break Into Two",
      summary:
        "Hero makes an active choice and enters the new world of Act Two. No going back. ~20%.",
      chapterHint: 5,
    },
    {
      title: "B Story",
      summary:
        "A secondary story begins — usually the love story or mentor relationship that will carry the theme. Introduced early in Act Two.",
      chapterHint: 6,
    },
    {
      title: "Fun and Games",
      summary:
        "The 'promise of the premise' — this is why the reader picked up the book. Scenes that deliver the concept, light or dark depending on genre. 20–50%.",
      chapterHint: 7,
    },
    {
      title: "Midpoint",
      summary:
        "False victory or false defeat. Stakes are raised, the A story and B story cross. The hero thinks they understand what they're fighting for — they don't. ~50%.",
      chapterHint: 8,
    },
    {
      title: "Bad Guys Close In",
      summary:
        "External pressure mounts and internal doubts return. The team frays. Every safe place gets compromised. 50–75%.",
      chapterHint: 9,
    },
    {
      title: "All Is Lost",
      summary:
        "The lowest external point. Something dies (literally or symbolically) — the mentor, the relationship, the dream. ~75%.",
      chapterHint: 10,
    },
    {
      title: "Dark Night of the Soul",
      summary:
        "The hero sits with defeat. They grieve, doubt, consider quitting. The theme stated at the top is now staring them in the face. 75–80%.",
      chapterHint: 11,
    },
    {
      title: "Break Into Three",
      summary:
        "The B story delivers the final insight the hero needs. They realize what to do and act. ~80%.",
      chapterHint: 12,
    },
    {
      title: "Finale",
      summary:
        "Hero executes the new plan, confronts the antagonist, synthesizes A and B stories, and becomes the person the theme required. 80–99%.",
      chapterHint: 13,
    },
    {
      title: "Final Image",
      summary:
        "The opposite of the Opening Image. A concrete picture of how much the hero has changed. ~100%.",
      chapterHint: 14,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Hero's Journey (Vogler) — 12 stages.                               *
 * ------------------------------------------------------------------ */
const HEROS_JOURNEY: OutlineTemplate = {
  id: "heros-journey",
  name: "The Hero's Journey (Campbell / Vogler)",
  description:
    "Mythic 12-stage arc. Works for fantasy, sci-fi, literary coming-of-age, and memoir.",
  source: "Christopher Vogler, The Writer's Journey (3rd ed., 2007).",
  bestFor: ["fantasy", "sci-fi", "epic", "coming-of-age", "memoir"],
  bookTypes: ["fiction", "non_fiction"],
  beats: [
    {
      title: "Ordinary World",
      summary:
        "Show the hero in their everyday life. Plant the lack, the unresolved wound, or the itch that the adventure will answer.",
      chapterHint: 1,
    },
    {
      title: "Call to Adventure",
      summary:
        "A problem, challenge, or invitation disrupts the ordinary world. The status quo stops being tenable.",
      chapterHint: 2,
    },
    {
      title: "Refusal of the Call",
      summary:
        "The hero hesitates — out of fear, duty, skepticism, or comfort. The reader learns what the hero has to lose.",
      chapterHint: 3,
    },
    {
      title: "Meeting the Mentor",
      summary:
        "Guide, gift, or insight that lowers the hero's activation energy. Could be a character, an object, a memory.",
      chapterHint: 4,
    },
    {
      title: "Crossing the Threshold",
      summary:
        "The hero commits and enters the special world. Rules, stakes, and allies are new.",
      chapterHint: 5,
    },
    {
      title: "Tests, Allies, and Enemies",
      summary:
        "The hero learns the new world by trying and failing. Relationships solidify. First glimpse of the true antagonist.",
      chapterHint: 6,
    },
    {
      title: "Approach to the Inmost Cave",
      summary:
        "The hero and team prepare for the central ordeal. Recon, planning, inner doubt. Stakes become specific.",
      chapterHint: 7,
    },
    {
      title: "The Ordeal",
      summary:
        "Confrontation with the greatest fear or most powerful force. Symbolic death — the hero is tested to the bone.",
      chapterHint: 8,
    },
    {
      title: "The Reward",
      summary:
        "The hero seizes the prize — object, knowledge, bond. The cost of the ordeal echoes.",
      chapterHint: 9,
    },
    {
      title: "The Road Back",
      summary:
        "Consequences of the reward catch up. The hero must choose to return home, often pursued. The antagonist's final move.",
      chapterHint: 10,
    },
    {
      title: "Resurrection",
      summary:
        "Climactic test at the threshold between worlds. The hero proves the transformation from the Ordeal is permanent.",
      chapterHint: 11,
    },
    {
      title: "Return with the Elixir",
      summary:
        "Hero returns changed, bringing something that heals, teaches, or frees the ordinary world. Echoes the wound from stage 1.",
      chapterHint: 12,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Three-Act Structure — 9 beats.                                     *
 * ------------------------------------------------------------------ */
const THREE_ACT: OutlineTemplate = {
  id: "three-act",
  name: "Three-Act Structure",
  description:
    "Setup / Confrontation / Resolution. The default Hollywood + Western novel skeleton. A safe starting point for any genre.",
  source: "Syd Field, Screenplay (1979); Robert McKee, Story (1997).",
  bestFor: ["literary fiction", "thriller", "drama", "screenplay", "novel"],
  bookTypes: ["fiction", "non_fiction"],
  beats: [
    {
      title: "Setup",
      summary:
        "Establish the protagonist's normal, their unresolved need, the world they move in, and the tone of the story. Acts 1 runs ~25%.",
      chapterHint: 1,
    },
    {
      title: "Inciting Incident",
      summary:
        "The disruption that breaks the normal. A choice is now unavoidable. Happens late in Act 1, typically 10–15% in.",
      chapterHint: 2,
    },
    {
      title: "Plot Point 1",
      summary:
        "End of Act 1. The protagonist commits to a course of action and enters the arena of the central conflict. ~25%.",
      chapterHint: 3,
    },
    {
      title: "Pinch Point 1",
      summary:
        "Mid-Act 2 pressure from the antagonist. A direct reminder of the force the protagonist is up against. ~37%.",
      chapterHint: 4,
    },
    {
      title: "Midpoint",
      summary:
        "False win or false loss that shifts the protagonist from reactive to proactive — they stop surviving and start pursuing. ~50%.",
      chapterHint: 5,
    },
    {
      title: "Pinch Point 2",
      summary:
        "Second pressure burst. Resources thin, allies fracture, antagonist lands a blow that redefines stakes. ~62%.",
      chapterHint: 6,
    },
    {
      title: "Plot Point 2 / Crisis",
      summary:
        "End of Act 2. The protagonist is forced into the worst decision of the book — what are they willing to sacrifice? ~75%.",
      chapterHint: 7,
    },
    {
      title: "Climax",
      summary:
        "Final confrontation. External and internal arcs collide. The protagonist's choice answers the thematic question.",
      chapterHint: 8,
    },
    {
      title: "Resolution",
      summary:
        "New normal. Show — concretely — how the protagonist and world have changed. Close every promise the setup made.",
      chapterHint: 9,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Seven-Point Story Structure (Dan Wells) — 7 beats.                 *
 * ------------------------------------------------------------------ */
const SEVEN_POINT: OutlineTemplate = {
  id: "seven-point",
  name: "Seven-Point Story Structure (Dan Wells)",
  description:
    "Lean seven-beat skeleton designed to be plotted backwards from the resolution. Good for first-time plotters and tight genre work.",
  source: "Dan Wells, 7-Point Story Structure lectures (2010–2012).",
  bestFor: ["sci-fi", "fantasy", "YA", "middle-grade", "action"],
  bookTypes: ["fiction"],
  beats: [
    {
      title: "Hook",
      summary:
        "The protagonist's starting state — ideally the opposite of the Resolution. Plant their worldview and flaw up front.",
      chapterHint: 1,
    },
    {
      title: "Plot Turn 1",
      summary:
        "Something changes. The character is pulled into the conflict of the story with no easy way out. End of Act 1.",
      chapterHint: 3,
    },
    {
      title: "Pinch Point 1",
      summary:
        "Pressure from the antagonist forces the protagonist to act. Stakes and opposition are made concrete.",
      chapterHint: 5,
    },
    {
      title: "Midpoint",
      summary:
        "Protagonist shifts from reacting to acting. They realize they must be the one to solve the problem.",
      chapterHint: 7,
    },
    {
      title: "Pinch Point 2",
      summary:
        "Second and harder blow from the antagonist. Plans fall apart; the protagonist loses allies or advantages.",
      chapterHint: 9,
    },
    {
      title: "Plot Turn 2",
      summary:
        "The protagonist gets the final piece needed to succeed — insight, tool, ally. The climax is now possible.",
      chapterHint: 10,
    },
    {
      title: "Resolution",
      summary:
        "Payoff. The protagonist resolves the conflict and lands in the state the Hook set up as the opposite of.",
      chapterHint: 12,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Snowflake Method (Randy Ingermanson) — 8 beats.                    *
 * Ingermanson's method is 10 steps for *drafting*; for an outline we *
 * use the 'four-disasters' plot backbone that step 7 expands into.   *
 * ------------------------------------------------------------------ */
const SNOWFLAKE: OutlineTemplate = {
  id: "snowflake",
  name: "Snowflake Method (Randy Ingermanson)",
  description:
    "Three-act backbone expanded around three disasters. Good for plotters who like the structure rigid and the disasters specific.",
  source:
    "Randy Ingermanson, 'The Snowflake Method' (advancedfictionwriting.com).",
  bestFor: ["epic fantasy", "thriller", "mystery", "commercial fiction"],
  bookTypes: ["fiction"],
  beats: [
    {
      title: "Opening Scene",
      summary:
        "Drop the reader into a concrete moment that establishes who the protagonist is and what kind of story this is. Include a specific image, not summary.",
      chapterHint: 1,
    },
    {
      title: "Act 1: Setup",
      summary:
        "Introduce the cast, the world's rules, and what the protagonist wants at the start. End this stretch pointed at Disaster 1.",
      chapterHint: 2,
    },
    {
      title: "Disaster 1 (End of Act 1)",
      summary:
        "External event that makes the old life impossible. The protagonist is forced into the central situation. Caused by circumstance or antagonist, not a free choice.",
      chapterHint: 4,
    },
    {
      title: "Act 2a: Reaction",
      summary:
        "The protagonist reacts to Disaster 1. They learn the new world, try easy fixes, and meet the supporting cast.",
      chapterHint: 5,
    },
    {
      title: "Disaster 2 (Midpoint)",
      summary:
        "A reveal or reversal that forces the protagonist to stop reacting and start hunting. Often a partial victory that exposes the real problem.",
      chapterHint: 7,
    },
    {
      title: "Act 2b: Action",
      summary:
        "Protagonist pursues. They try harder solutions; the antagonist pushes back; allies diverge. Build toward Disaster 3.",
      chapterHint: 8,
    },
    {
      title: "Disaster 3 (End of Act 2)",
      summary:
        "Worst blow of the book. The protagonist is at rock bottom and sees that only a dangerous, personal sacrifice will work.",
      chapterHint: 10,
    },
    {
      title: "Act 3: Resolution",
      summary:
        "Protagonist commits to the hard choice, confronts the antagonist, and pays the price. Close every disaster's ripple.",
      chapterHint: 12,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Romance Beat Sheet (Gwen Hayes) — 10 beats.                        *
 * ------------------------------------------------------------------ */
const ROMANCE: OutlineTemplate = {
  id: "romance-beat-sheet",
  name: "Romance Beat Sheet (Gwen Hayes)",
  description:
    "Two-character relationship arc leading to an emotionally satisfying HEA. Works for contemporary, historical, and paranormal romance.",
  source: "Gwen Hayes, Romancing the Beat (2016).",
  bestFor: [
    "contemporary romance",
    "historical romance",
    "paranormal romance",
    "romcom",
  ],
  bookTypes: ["fiction"],
  beats: [
    {
      title: "Introduction of Heroine / Hero",
      summary:
        "Set up each lead's ordinary world separately. Show the emotional wound, the lie they believe, and what they think they want.",
      chapterHint: 1,
    },
    {
      title: "Meet",
      summary:
        "The leads collide on-page. Memorable, specific, genre-appropriate. Chemistry visible — but so is the conflict that will keep them apart.",
      chapterHint: 2,
    },
    {
      title: "No Way",
      summary:
        "Each lead internally rejects the possibility of a relationship — wrong person, wrong time, too risky. The reader learns the real cost of falling.",
      chapterHint: 3,
    },
    {
      title: "Adhesion",
      summary:
        "External force pins them together: shared project, forced proximity, common enemy. They can't walk away even though they want to.",
      chapterHint: 4,
    },
    {
      title: "Deepening Desire",
      summary:
        "Walls start to crack. Vulnerability, shared history, a moment of real seeing. Attraction becomes emotional as well as physical.",
      chapterHint: 6,
    },
    {
      title: "Maybe This Could Work (Midpoint)",
      summary:
        "A turning point where the leads drop the charade — kiss, confession, first night. The possibility of 'us' becomes real.",
      chapterHint: 8,
    },
    {
      title: "Deepening Conflict",
      summary:
        "The relationship tests their individual arcs. Old wounds and external obstacles apply pressure. They try to solve it the wrong way.",
      chapterHint: 10,
    },
    {
      title: "Dark Moment",
      summary:
        "The rupture. Worst fears confirmed; each lead is alone with their original lie. Usually both external (they part) and internal (they despair).",
      chapterHint: 12,
    },
    {
      title: "Grand Gesture",
      summary:
        "One lead risks something real and public to prove the change. Word-of-honor vulnerability, not just an apology.",
      chapterHint: 14,
    },
    {
      title: "Happily Ever After / HEA",
      summary:
        "Resolution scene. Both leads visibly healed, the relationship codified. Promise the genre made is kept.",
      chapterHint: 15,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Cozy Mystery Structure — 10 beats.                                 *
 * ------------------------------------------------------------------ */
const COZY_MYSTERY: OutlineTemplate = {
  id: "cozy-mystery",
  name: "Cozy Mystery Structure",
  description:
    "Amateur-sleuth mystery with a small community, a puzzle, and minimal on-page violence. Community-restored ending.",
  source:
    "Assembled from Ramona DeFelice Long's cozy-mystery columns and traditional whodunit editor checklists.",
  bestFor: ["cozy mystery", "amateur sleuth", "whodunit", "small-town"],
  bookTypes: ["fiction"],
  beats: [
    {
      title: "Sleuth's Status Quo",
      summary:
        "Introduce the amateur sleuth in their day job (baker, librarian, shopkeeper). Establish the community and the series-worthy charm.",
      chapterHint: 1,
    },
    {
      title: "Discovery of the Body",
      summary:
        "A corpse or clear crime surfaces early. On-page discovery is brief; the violence is not gratuitous but the stakes are now real.",
      chapterHint: 2,
    },
    {
      title: "Why Me? — Personal Stake",
      summary:
        "The sleuth has a reason they can't leave this one to the police: a friend is accused, the victim is connected, reputation is at risk.",
      chapterHint: 3,
    },
    {
      title: "Initial Suspects",
      summary:
        "Introduce 3–5 suspects with distinct motives, means, and opportunities. Each should have a secret unrelated to the murder that could confuse the trail.",
      chapterHint: 4,
    },
    {
      title: "First Red Herring",
      summary:
        "A clue points hard at the wrong suspect. The reader and sleuth should both be briefly convinced.",
      chapterHint: 5,
    },
    {
      title: "Midpoint Twist",
      summary:
        "Second body, confession, or major reveal recontextualizes the case. The sleuth's theory must change.",
      chapterHint: 7,
    },
    {
      title: "Amateur in Danger",
      summary:
        "The sleuth gets close enough to the truth that the killer applies pressure. The police push the sleuth to stand down.",
      chapterHint: 9,
    },
    {
      title: "The Crucial Clue",
      summary:
        "Sleuth spots the one detail the police missed — an item, a timeline gap, a slip of language. Everything clicks.",
      chapterHint: 10,
    },
    {
      title: "Confrontation with the Killer",
      summary:
        "Usually in a public or contained space (church, bake sale, inn). Killer monologues just enough; sleuth plus ally neutralize them without a gunfight.",
      chapterHint: 11,
    },
    {
      title: "Community Restored",
      summary:
        "Short resolution: the town exhales, the sleuth and their ongoing cast reset, a small hook seeds the next book in the series.",
      chapterHint: 12,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Kishōtenketsu (起承転結) — 4 beats.                                 *
 * ------------------------------------------------------------------ */
const KISHOTENKETSU: OutlineTemplate = {
  id: "kishotenketsu",
  name: "Kishōtenketsu (4-act, no central conflict required)",
  description:
    "Classical Japanese/Chinese four-act form. Conflict is optional; the drama comes from juxtaposition and reinterpretation.",
  source: "Classical 起承転結 (ki-shō-ten-ketsu).",
  bestFor: ["literary fiction", "slice-of-life", "quiet fiction", "folk tales"],
  bookTypes: ["fiction"],
  beats: [
    {
      title: "Ki (Introduction)",
      summary:
        "Establish the characters and situation plainly. No conflict required — the reader should understand the shape of the world.",
      chapterHint: 1,
    },
    {
      title: "Shō (Development)",
      summary:
        "Develop the situation set up in Ki. Deepen character, texture, relationships. The reader settles in.",
      chapterHint: 2,
    },
    {
      title: "Ten (Twist / Unexpected Element)",
      summary:
        "Introduce something surprising and seemingly unrelated — a new character, event, or perspective. The story pivots laterally.",
      chapterHint: 3,
    },
    {
      title: "Ketsu (Reconciliation / Conclusion)",
      summary:
        "Ki, Shō, and Ten cohere. The 'unrelated' twist recontextualizes the earlier acts. The reader sees the whole picture at once.",
      chapterHint: 4,
    },
  ],
};

export const OUTLINE_TEMPLATES: ReadonlyArray<OutlineTemplate> = [
  SAVE_THE_CAT,
  HEROS_JOURNEY,
  THREE_ACT,
  SEVEN_POINT,
  SNOWFLAKE,
  ROMANCE,
  COZY_MYSTERY,
  KISHOTENKETSU,
];

const TEMPLATES_BY_ID: Record<OutlineTemplateId, OutlineTemplate> =
  OUTLINE_TEMPLATES.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<OutlineTemplateId, OutlineTemplate>,
  );

export function getOutlineTemplate(
  id: OutlineTemplateId,
): OutlineTemplate | null {
  return TEMPLATES_BY_ID[id] ?? null;
}

export function isOutlineTemplateId(id: string): id is OutlineTemplateId {
  return id in TEMPLATES_BY_ID;
}

export function listTemplatesForBookType(
  bookType: BookTypeDb,
): ReadonlyArray<OutlineTemplate> {
  return OUTLINE_TEMPLATES.filter((t) => t.bookTypes.includes(bookType));
}
