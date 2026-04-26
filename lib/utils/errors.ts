import { NextResponse } from "next/server";

/** Standard JSON error body for all API routes (client-safe). */
export type ApiErrorBody = {
  error: string;
  code: string;
};

export const ApiErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  UPGRADE_REQUIRED: "UPGRADE_REQUIRED",
  RATE_LIMITED: "RATE_LIMITED",
  CONFIGURATION: "CONFIGURATION",
  UPSTREAM: "UPSTREAM",
  INTERNAL: "INTERNAL",
  CHECKOUT_FAILED: "CHECKOUT_FAILED",
  WEBHOOK_INVALID: "WEBHOOK_INVALID",
  WEBHOOK_HANDLER: "WEBHOOK_HANDLER",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
} as const;

export type ApiErrorCodeType = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export function apiJsonError(
  error: string,
  code: ApiErrorCodeType | string,
  status: number,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error, code }, { status });
}

export type ApiRateLimitBody = ApiErrorBody & { resetAt: string };

export function apiJsonRateLimited(resetAt: Date): NextResponse<ApiRateLimitBody> {
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      code: ApiErrorCode.RATE_LIMITED,
      resetAt: resetAt.toISOString(),
    },
    { status: 429 },
  );
}

/**
 * Maps thrown values to a safe client message + stable code.
 * Never forwards raw Postgres, Supabase, or OpenAI text.
 */
export function mapUnknownToApiError(err: unknown): {
  message: string;
  code: ApiErrorCodeType;
} {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (
      msg.includes("openai") ||
      msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("too many requests")
    ) {
      return {
        message: "The AI service is busy. Please try again in a moment.",
        code: ApiErrorCode.RATE_LIMITED,
      };
    }

    if (
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("econnreset") ||
      msg.includes("timeout")
    ) {
      return {
        message: "We could not reach the service. Check your connection and try again.",
        code: ApiErrorCode.UPSTREAM,
      };
    }

    if (msg.includes("jwt") || msg.includes("auth") || msg.includes("session")) {
      return {
        message: "Your session could not be validated.",
        code: ApiErrorCode.UNAUTHORIZED,
      };
    }

    if (
      msg.includes("row level security") ||
      msg.includes("rls") ||
      msg.includes("violates foreign key") ||
      msg.includes("duplicate key") ||
      msg.includes("postgres") ||
      msg.includes("supabase")
    ) {
      return {
        message: "We could not complete that action. Please try again.",
        code: ApiErrorCode.INTERNAL,
      };
    }
  }

  return {
    message: "Something went wrong. Please try again.",
    code: ApiErrorCode.INTERNAL,
  };
}

export type LogServerErrorOptions = {
  /**
   * Use for user-visible / operational damage (e.g. chapter left stuck
   * `generating` after a failed status revert) so on-call can filter.
   */
  severity?: "critical" | "info";
  /** Optional structured fields (e.g. trim stats) for operational logs. */
  details?: Record<string, unknown>;
};

/** Log full error server-side; return nothing sensitive. */
export function logServerError(
  context: string,
  err: unknown,
  options?: LogServerErrorOptions,
): void {
  if (options?.severity === "info") {
    console.info(`[${context}]`, { ...options.details, err });
    return;
  }
  let detail: string;
  if (err instanceof Error) {
    detail = err.stack ?? err.message;
  } else if (err && typeof err === "object") {
    /* Plain objects (Supabase PostgrestError, diagnostic bags, etc.) stringify
     * to `"[object Object]"` via String(). JSON-stringify with a fallback so
     * we get actually-readable logs. */
    try {
      detail = JSON.stringify(err, Object.getOwnPropertyNames(err as object));
    } catch {
      detail = String(err);
    }
  } else {
    detail = String(err);
  }
  const prefix = options?.severity === "critical" ? "[CRITICAL] " : "";
  if (options?.details) {
    console.error(`${prefix}[${context}]`, detail, options.details);
  } else {
    console.error(`${prefix}[${context}]`, detail);
  }
}
