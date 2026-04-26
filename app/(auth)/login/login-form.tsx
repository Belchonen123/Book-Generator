"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

function safeAppPath(path: string | null, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  return path;
}

function friendlyAuthMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first — we sent a link when you signed up.";
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to fetch")) {
    return "Cannot reach Supabase. Check your network/VPN and that NEXT_PUBLIC_SUPABASE_URL matches your project.";
  }
  return message.trim().length > 0 ? message : "Something went wrong. Please try again.";
}

/**
 * Message-only detection of the "email not confirmed" Supabase auth error.
 *
 * We intentionally do NOT read `.code` or `.status` off the AuthError here —
 * `@supabase/supabase-js` v2's error shape is not stable across minor versions
 * (some errors have `.code`, some don't, the type widens/narrows between
 * releases), and relying on it has burned us before. Instead we match against
 * the various message substrings the server surfaces across environments.
 */
function isEmailNotConfirmedError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("email not confirmed") ||
    m.includes("email_not_confirmed") ||
    m.includes("not confirmed")
  );
}

/**
 * Server Actions can occasionally resolve to `undefined` (transient Next.js
 * runtime hiccups, aborted RSC requests, etc.) or throw on the wire. Normalize
 * any outcome into the `{ ok, error? }` shape the UI expects so we never try
 * to read `.ok` off `undefined`.
 */
async function safeEnsureProfile(): Promise<{
  ok: boolean;
  error?: string;
  code?: string;
  hint?: string;
}> {
  try {
    const response = await fetch("/api/auth/ensure-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; code?: string; hint?: string }
      | null;
    if (!response.ok || !result || typeof result.ok !== "boolean") {
      return {
        ok: false,
        error: result?.error ?? `Profile setup request failed (HTTP ${response.status}).`,
        code: result?.code,
        hint: result?.hint,
      };
    }
    return {
      ok: result.ok,
      error: result.error,
      code: result.code,
      hint: result.hint,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Sign-in server action failed: ${message}`,
    };
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionRecover = searchParams.get("recover") === "1";
  const recoverReason = searchParams.get("reason") ?? null;
  const recoverCode = searchParams.get("code") ?? null;
  const nextPath = safeAppPath(searchParams.get("next"), "/dashboard");
  const oauthError = searchParams.get("error");
  const errorToastShown = useRef(false);
  const deletedToastShown = useRef(false);

  const [oauthLoading, setOauthLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  useEffect(() => {
    if (!oauthError || errorToastShown.current) {
      return;
    }
    errorToastShown.current = true;
    if (oauthError === "config") {
      toast.error("Authentication is not configured correctly.");
    } else if (oauthError === "oauth") {
      toast.error("Google sign-in did not complete. Please try again.");
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("error");
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login");
  }, [oauthError, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("deleted") !== "1" || deletedToastShown.current) {
      return;
    }
    deletedToastShown.current = true;
    toast.success("Your account was deleted.");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("deleted");
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login");
  }, [router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setUnconfirmedEmail(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      if (isEmailNotConfirmedError(error.message)) {
        setUnconfirmedEmail(values.email);
      }
      toast.error(friendlyAuthMessage(error.message));
      return;
    }
    /* Brief pause so chunked auth cookies are committed before the server action runs. */
    await new Promise((r) => setTimeout(r, 100));
    let ensured = await safeEnsureProfile();
    if (!ensured.ok && ensured.error?.includes("No session")) {
      await new Promise((r) => setTimeout(r, 200));
      ensured = await safeEnsureProfile();
    }
    if (!ensured.ok) {
      const msg = ensured.error ?? "Could not finish sign-in.";
      toast.error(msg);
      const q = new URLSearchParams({
        recover: "1",
        reason: `profile_create_failed:${msg.slice(0, 120)}`,
      });
      if (ensured.code) {
        q.set("code", ensured.code);
      }
      window.location.assign(`/login?${q.toString()}`);
      return;
    }
    toast.success("Welcome back.");
    // Full navigation so middleware sees session cookies (client sign-in + App Router).
    window.location.assign(nextPath);
  };

  const resendConfirmation = async () => {
    if (!unconfirmedEmail) {
      return;
    }
    setResendStatus("sending");
    const supabase = createClient();
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail,
      options: {
        emailRedirectTo: base ? `${base}/callback` : undefined,
      },
    });
    setResendStatus("idle");
    if (error) {
      toast.error(friendlyAuthMessage(error.message));
      return;
    }
    setResendStatus("sent");
    toast.success("Confirmation email sent. Check your inbox.");
  };

  const signOutBrokenSession = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const [repairing, setRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const repairProfileAndContinue = async () => {
    setRepairing(true);
    setRepairError(null);
    try {
      await new Promise((r) => setTimeout(r, 100));
      let ensured = await safeEnsureProfile();
      if (!ensured.ok && ensured.error?.includes("No session")) {
        await new Promise((r) => setTimeout(r, 300));
        ensured = await safeEnsureProfile();
      }
      if (!ensured.ok) {
        const msg =
          ensured.error ??
          `Could not create your profile row.${ensured.code ? ` (code ${ensured.code})` : ""}${
            ensured.hint ? ` ${ensured.hint}` : ""
          }`;
        toast.error(msg);
        setRepairError(msg);
        return;
      }
      toast.success("Profile ready.");
      window.location.assign(nextPath);
    } finally {
      setRepairing(false);
    }
  };

  const signInWithGoogle = async () => {
    setOauthLoading(true);
    try {
      const supabase = createClient();
      const base =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${base}/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) {
        toast.error(friendlyAuthMessage(error.message));
      }
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/90 p-8 shadow-lg backdrop-blur-sm">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-semibold text-gold">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-editorial-muted">
          Sign in to continue writing with ChapterAI
        </p>
      </div>

      {sessionRecover ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-editorial-cream"
        >
          <p className="font-medium text-gold">Session needs a reset</p>
          <p className="mt-2 leading-relaxed text-editorial-muted">
            You&apos;re signed in, but your profile couldn&apos;t be loaded.
          </p>
          {recoverReason ? (
            <details className="mt-2 text-xs text-editorial-muted">
              <summary className="cursor-pointer text-editorial-cream">
                Technical details
              </summary>
              <div className="mt-1 space-y-1 font-mono">
                {recoverCode ? (
                  <div>
                    code: <span className="text-gold">{recoverCode}</span>
                  </div>
                ) : null}
                <div>
                  reason: <span className="text-editorial-cream">{recoverReason}</span>
                </div>
                <div className="mt-2 font-sans text-editorial-muted">
                  If code is <code>42703</code>, a migration is missing. Apply every
                  file in <code>supabase/migrations/</code> in order. If code is{" "}
                  <code>42P01</code>, the <code>profiles</code> table doesn&apos;t exist
                  — apply <code>001_create_profiles.sql</code>. If code is{" "}
                  <code>42501</code> or the reason mentions RLS, apply{" "}
                  <code>018_profiles_rls_explicit.sql</code>. If everything looks
                  applied, verify <code>NEXT_PUBLIC_SUPABASE_URL</code> points at the
                  same project you ran the migrations against.
                </div>
                <a
                  href="/api/health/profile"
                  target="_blank"
                  rel="noopener"
                  className="font-sans text-gold underline"
                >
                  Run diagnostics (opens JSON in a new tab)
                </a>
              </div>
            </details>
          ) : null}
          {repairError ? (
            <p className="mt-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {repairError}
            </p>
          ) : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full bg-gold text-editorial-bg hover:bg-gold/90 sm:flex-1"
              loading={repairing}
              onClick={() => void repairProfileAndContinue()}
            >
              {repairing ? "Repairing…" : "Repair and continue"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-gold/50 text-editorial-cream hover:bg-card sm:flex-1"
              disabled={repairing}
              onClick={() => void signOutBrokenSession()}
            >
              Sign out
            </Button>
          </div>
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="w-full bg-gold text-editorial-bg hover:bg-gold/90"
          loading={isSubmitting}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {unconfirmedEmail ? (
        <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-editorial-muted">
          <p className="text-editorial-cream">
            Click the link in your email to activate your account, then sign in
            again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full border-border"
            disabled={resendStatus === "sending" || resendStatus === "sent"}
            onClick={() => void resendConfirmation()}
          >
            {resendStatus === "sending"
              ? "Sending…"
              : resendStatus === "sent"
                ? "Email sent"
                : "Resend confirmation email"}
          </Button>
        </div>
      ) : null}

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-card px-2 text-editorial-muted">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-border text-editorial-cream hover:bg-secondary hover:text-editorial-cream"
        onClick={() => void signInWithGoogle()}
        disabled={isSubmitting}
        loading={oauthLoading}
      >
        {oauthLoading ? "Redirecting…" : "Continue with Google"}
      </Button>

      <p className="mt-8 text-center text-sm text-editorial-muted">
        No account yet?{" "}
        <Link
          href={sessionRecover ? "/signup?recover=1" : "/signup"}
          className="font-medium text-gold underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
