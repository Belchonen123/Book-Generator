import { z } from "zod";

/** Normalize env strings: trim; treat blank as unset (undefined). */
function emptyToUndefined(v: unknown): unknown {
  if (v === undefined || v === null) {
    return undefined;
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return v;
}

/**
 * Normalize author-friendly app URL inputs.
 *
 * Accepts:
 *   - `https://chapterai.com`
 *   - `http://localhost:3010`
 *   - `localhost:3010`       → normalized to `http://localhost:3010`
 *   - `localhost`            → normalized to `http://localhost`
 *   - `127.0.0.1[:PORT]`     → normalized to `http://…`
 *
 * Anything that still fails `new URL()` is returned unchanged so zod surfaces a
 * structured validation error instead of crashing here.
 */
function normalizeAppUrl(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

/** zod field for `NEXT_PUBLIC_APP_URL` — required, URL-shaped, tolerant of common typos. */
const appUrlField = z.preprocess(
  (v) => normalizeAppUrl(emptyToUndefined(v)),
  z
    .string()
    .min(1, "NEXT_PUBLIC_APP_URL is required")
    .refine((s) => {
      try {
        // eslint-disable-next-line no-new
        new URL(s);
        return true;
      } catch {
        return false;
      }
    }, "NEXT_PUBLIC_APP_URL must be a valid URL (e.g. http://localhost:3010)"),
);

/**
 * Server-side environment variables. Validated once per process (see `getServerEnv`).
 * Skips validation when `NODE_ENV === "test"` so Vitest can run without a full .env.
 *
 * Only variables required for auth, routing, and basic SSR are mandatory. Keys needed for
 * AI, admin Supabase, or Stripe may be unset until those features are used.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required").url(),
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  ),
  NEXT_PUBLIC_APP_URL: appUrlField,
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  STRIPE_PRO_PRICE_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  /** Text-to-speech (ElevenLabs); optional — audiobook tools check at runtime. */
  ELEVENLABS_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatIssues(parsed: z.SafeParseError<unknown>): string[] {
  return parsed.error.errors.map(
    (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
  );
}

let cachedEnv: ServerEnv | null = null;

/** Throwing version — used by scripts / explicit validation. */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Environment validation failed — ${formatIssues(parsed).join("; ")}`,
    );
  }
  cachedEnv = parsed.data;
  return parsed.data;
}

/**
 * Non-throwing variant — used by `middleware.ts` so a missing env var does not
 * 500 every single request. Callers should log `errors` and continue; per-route
 * handlers already validate the specific env they need before using it.
 */
export function getServerEnvSafe(): {
  env: ServerEnv | null;
  errors: string[];
} {
  if (process.env.NODE_ENV === "test") {
    return { env: null, errors: [] };
  }
  if (cachedEnv) {
    return { env: cachedEnv, errors: [] };
  }
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    return { env: null, errors: formatIssues(parsed) };
  }
  cachedEnv = parsed.data;
  return { env: parsed.data, errors: [] };
}

/** Optional explicit check (e.g. scripts). App validates via `middleware.ts` on first request. */
export function validateServerEnv(): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  getServerEnv();
}
