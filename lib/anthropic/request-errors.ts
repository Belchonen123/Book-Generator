import { NextResponse } from "next/server";
import {
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";

import {
  apiJsonError,
  ApiErrorCode,
  logServerError,
  type ApiErrorBody,
  type ApiErrorCodeType,
} from "@/lib/utils/errors";

export type AnthropicRequestFailure = {
  message: string;
  code: ApiErrorCodeType;
  status: number;
};

function isAnthropicConfigError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("ANTHROPIC_API_KEY");
}

export function classifyAnthropicRequestFailure(err: unknown): AnthropicRequestFailure | null {
  if (isAnthropicConfigError(err)) {
    return {
      message: "AI is not configured on this server.",
      code: ApiErrorCode.CONFIGURATION,
      status: 503,
    };
  }

  if (err instanceof RateLimitError) {
    return {
      message: "The AI service is busy. Please try again in a moment.",
      code: ApiErrorCode.RATE_LIMITED,
      status: 429,
    };
  }

  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
    return {
      message:
        "Anthropic rejected this API key. Confirm ANTHROPIC_API_KEY in .env.local is active.",
      code: ApiErrorCode.CONFIGURATION,
      status: 503,
    };
  }

  if (err instanceof APIConnectionTimeoutError) {
    return {
      message: "The AI service timed out. Try again in a moment.",
      code: ApiErrorCode.UPSTREAM,
      status: 504,
    };
  }

  if (err instanceof APIConnectionError) {
    return {
      message: "We could not reach Anthropic. Check your network, VPN, or firewall.",
      code: ApiErrorCode.UPSTREAM,
      status: 502,
    };
  }

  if (err instanceof APIError) {
    const st = err.status;
    if (st === 429) {
      return {
        message: "The AI service is busy. Please try again in a moment.",
        code: ApiErrorCode.RATE_LIMITED,
        status: 429,
      };
    }
    if (st === 401 || st === 403) {
      return {
        message:
          "Anthropic rejected this API key. Confirm ANTHROPIC_API_KEY in .env.local is active.",
        code: ApiErrorCode.CONFIGURATION,
        status: 503,
      };
    }
    if (typeof st === "number" && st >= 400 && st < 500) {
      return {
        message:
          "Claude could not run this request (model access or parameters). Check ANTHROPIC_TEXT_MODEL and your Anthropic console.",
        code: ApiErrorCode.CONFIGURATION,
        status: 503,
      };
    }
    if (typeof st === "number" && st >= 500) {
      return {
        message: "The writing assistant is temporarily unavailable.",
        code: ApiErrorCode.UPSTREAM,
        status: 502,
      };
    }
    return {
      message: "The writing assistant is temporarily unavailable.",
      code: ApiErrorCode.UPSTREAM,
      status: 502,
    };
  }

  return null;
}

const DEFAULT_FALLBACK = "The writing assistant is temporarily unavailable.";

export function anthropicRequestFailureResponse(
  err: unknown,
  logContext: string,
  options?: { fallbackMessage?: string },
): NextResponse<ApiErrorBody> {
  const classified = classifyAnthropicRequestFailure(err);
  logServerError(logContext, err);
  if (classified) {
    return apiJsonError(classified.message, classified.code, classified.status);
  }
  return apiJsonError(
    options?.fallbackMessage ?? DEFAULT_FALLBACK,
    ApiErrorCode.UPSTREAM,
    502,
  );
}
