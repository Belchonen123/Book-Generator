import { NextResponse } from "next/server";
import {
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";

import { isOpenAIConfigError } from "./client";
import {
  apiJsonError,
  ApiErrorCode,
  logServerError,
  type ApiErrorBody,
  type ApiErrorCodeType,
} from "@/lib/utils/errors";

export type OpenAIRequestFailure = {
  message: string;
  code: ApiErrorCodeType;
  status: number;
};

export function classifyOpenAIRequestFailure(err: unknown): OpenAIRequestFailure | null {
  if (isOpenAIConfigError(err)) {
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
        "OpenAI rejected this API key. Confirm OPENAI_API_KEY in .env.local is active and can call the models you use.",
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
      message: "We could not reach OpenAI. Check your network, VPN, or firewall.",
      code: ApiErrorCode.UPSTREAM,
      status: 502,
    };
  }

  if (err instanceof APIError) {
    const st = err.status;
    if (st === 402) {
      return {
        message:
          "OpenAI reported a billing or quota problem. Add credits or review usage at platform.openai.com.",
        code: ApiErrorCode.CONFIGURATION,
        status: 503,
      };
    }
    if (st === 429) {
      return {
        message: "The AI service is busy. Please try again in a moment.",
        code: ApiErrorCode.RATE_LIMITED,
        status: 429,
      };
    }
    if (typeof st === "number" && st >= 400 && st < 500) {
      return {
        message:
          "OpenAI declined this request (model access, parameters, or account limits). Check server logs for details.",
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

export function openAIRequestFailureResponse(
  err: unknown,
  logContext: string,
  options?: { fallbackMessage?: string },
): NextResponse<ApiErrorBody> {
  const classified = classifyOpenAIRequestFailure(err);
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
