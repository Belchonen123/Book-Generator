import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// When Upstash isn't configured (e.g. local dev without Redis), we skip
// distributed rate limiting and allow the request. This prevents a missing
// env var from taking down every AI route with `TypeError: Failed to parse
// URL from /pipeline`.
const rateLimitingEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

let warnedMissingEnv = false;
if (!rateLimitingEnabled && process.env.NODE_ENV !== "test") {
  // Warn once at module init so the reason is obvious in dev logs.
  if (!warnedMissingEnv) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
        "Rate limiting is DISABLED for this process.",
    );
    warnedMissingEnv = true;
  }
}

const redis = rateLimitingEnabled
  ? new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! })
  : null;

type RouteConfig = { tokens: number; window: "1 h"; prefix: string };

const ROUTE_CONFIG = {
  "refine-idea": { tokens: 30, window: "1 h", prefix: "rl:refine-idea" },
  "generate-chapter": { tokens: 20, window: "1 h", prefix: "rl:generate-chapter" },
  "generate-cover": { tokens: 10, window: "1 h", prefix: "rl:generate-cover" },
  "generate-book-metadata": {
    tokens: 20,
    window: "1 h",
    prefix: "rl:generate-book-metadata",
  },
  "generate-back-cover": {
    tokens: 20,
    window: "1 h",
    prefix: "rl:generate-back-cover",
  },
  "generate-about-author": {
    tokens: 20,
    window: "1 h",
    prefix: "rl:generate-about-author",
  },
  "generate-subtitle": {
    tokens: 40,
    window: "1 h",
    prefix: "rl:generate-subtitle",
  },
  "regenerate-idea-field": {
    tokens: 60,
    window: "1 h",
    prefix: "rl:regenerate-idea-field",
  },
  "chapter-assist": {
    tokens: 60,
    window: "1 h",
    prefix: "rl:chapter-assist",
  },
  /* Story-side chat panel. Conversational use cases fire more turns per
   * hour than one-shot assists, and each turn is relatively cheap
   * (gpt-4o-mini streaming), so we allow a higher cap. Title-gen calls
   * share this key since they're triggered by the same user action. */
  chat: {
    tokens: 120,
    window: "1 h",
    prefix: "rl:chat",
  },
  /* Slash-command inline actions are cheaper per call (tiny selections, short
   * completions) and therefore run hotter than the full-chapter assists. 100/h
   * lets a focused editing session breathe without exposing the key to abuse. */
  "inline-assist": {
    tokens: 100,
    window: "1 h",
    prefix: "rl:inline-assist",
  },
  /* Bubble-menu multi-alternative rewriter. Each call streams 2–3 rewrites
   * from one OpenAI completion — more expensive per call than slash commands
   * but still cheaper than a full chapter assist, so we sit between the two. */
  "inline-command": {
    tokens: 60,
    window: "1 h",
    prefix: "rl:inline-command",
  },
  "check-consistency": {
    tokens: 20,
    window: "1 h",
    prefix: "rl:check-consistency",
  },
  "rewrite-transitions": {
    tokens: 30,
    window: "1 h",
    prefix: "rl:rewrite-transitions",
  },
  /** Pro bulk "polish" after book-wide replace — expensive per-chapter API calls. */
  "polish-bulk": {
    tokens: 5,
    window: "1 h",
    prefix: "rl:polish-bulk",
  },
  "voice-to-chapter": {
    tokens: 10,
    window: "1 h",
    prefix: "rl:voice-to-chapter",
  },
  /** Pacing / scene-beat map; results are usually cached by content hash. */
  "analyze-beats": {
    tokens: 40,
    window: "1 h",
    prefix: "rl:analyze-beats",
  },
  /** Banned-phrase regex scan + optional cheap-model “deep” pass (Prompt 16). */
  "slop-scan": {
    tokens: 80,
    window: "1 h",
    prefix: "rl:slop-scan",
  },
  /* "Brainstorm anything" — each call streams ~10 short options. Cheap
   * per call, but authors often iterate in rapid bursts ("generate
   * more like these", "generate more", …), so the cap is generous. */
  brainstorm: {
    tokens: 100,
    window: "1 h",
    prefix: "rl:brainstorm",
  },
  /** Series codex "fill with AI" — one JSON object per request. */
  "suggest-codex-entry": {
    tokens: 40,
    window: "1 h",
    prefix: "rl:suggest-codex-entry",
  },
  "suggest-series-arc": {
    tokens: 40,
    window: "1 h",
    prefix: "rl:suggest-series-arc",
  },
  "suggest-series-beat": {
    tokens: 50,
    window: "1 h",
    prefix: "rl:suggest-series-beat",
  },
  /* Scene-beat blocks — each call streams ~200–700 words of prose. More
   * expensive than inline-command per call (longer output, full context
   * pack: codex + prior summaries + recent prose), so the cap is tighter
   * than brainstorm but still generous enough to draft a whole chapter
   * beat-by-beat in one sitting. */
  "scene-beat": {
    tokens: 60,
    window: "1 h",
    prefix: "rl:scene-beat",
  },
} satisfies Record<string, RouteConfig>;

const limiters: Record<string, Ratelimit> | null = redis
  ? Object.fromEntries(
      Object.entries(ROUTE_CONFIG).map(([key, cfg]) => [
        key,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
          prefix: cfg.prefix,
        }),
      ]),
    )
  : null;

export type RateLimitRouteKey = keyof typeof ROUTE_CONFIG;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export async function checkRateLimit(
  userId: string,
  route: RateLimitRouteKey,
): Promise<RateLimitResult> {
  // No Upstash configured: skip the check entirely.
  if (!limiters) {
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }

  try {
    const { success, remaining, reset } = await limiters[route]!.limit(userId);
    return {
      allowed: success,
      remaining,
      resetAt: new Date(reset),
    };
  } catch (err) {
    // Fail-open on transient Redis/network errors so a Redis blip doesn't
    // take down AI generation. The upstream provider (OpenAI/Anthropic) is
    // the ultimate rate limit backstop.
    console.error("[rate-limit] Redis check failed; allowing request.", err);
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}
