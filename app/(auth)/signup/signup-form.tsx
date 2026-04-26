"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;
type EnsureProfileResult = {
  ok: boolean;
  error?: string;
  code?: string;
  hint?: string;
};

function friendlySignupMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("user already")) {
    return "An account with this email already exists.";
  }
  if (m.includes("password")) {
    return "Password does not meet requirements.";
  }
  // Surface Supabase errors (wrong URL/key, provider disabled, network, etc.)
  return message;
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionRecover = searchParams.get("recover") === "1";
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signOutBrokenSession = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/signup");
    router.refresh();
  };

  const onSubmit = async (values: SignupValues) => {
    const supabase = createClient();
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      (typeof window !== "undefined" ? window.location.origin : "");
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: base ? `${base}/callback` : undefined,
      },
    });

    if (error) {
      toast.error(friendlySignupMessage(error.message));
      return;
    }

    if (!data.user) {
      toast.error(
        "Signup did not create a user. Check Authentication → Providers → Email is enabled, and that your .env keys match this Supabase project.",
      );
      return;
    }

    if (data.session) {
      const safeEnsureProfileAfterSignIn = async (): Promise<EnsureProfileResult> => {
        const response = await fetch("/api/auth/ensure-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const ensured = (await response.json().catch(() => null)) as EnsureProfileResult | null;
        if (!response.ok || !ensured || typeof ensured.ok !== "boolean") {
          return {
            ok: false,
            error: ensured?.error ?? `Profile setup request failed (HTTP ${response.status}).`,
            code: ensured?.code,
            hint: ensured?.hint,
          };
        }
        return ensured;
      };
      await new Promise((r) => setTimeout(r, 100));
      let ensured = await safeEnsureProfileAfterSignIn();
      if (!ensured.ok && ensured.error?.includes("No session")) {
        await new Promise((r) => setTimeout(r, 200));
        ensured = await safeEnsureProfileAfterSignIn();
      }
      if (!ensured.ok) {
        toast.error(ensured.error ?? "Account created but profile setup failed.");
        window.location.assign("/login?recover=1");
        return;
      }
      toast.success("Account created.");
      window.location.assign("/dashboard");
      return;
    }

    setSubmittedEmail(values.email);
    setSubmitted(true);
    toast.success("Check your inbox to confirm your email.");
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-card/90 p-8 text-center shadow-lg backdrop-blur-sm">
        <h1 className="font-serif text-2xl font-semibold text-gold">
          Check your email
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-editorial-muted">
          We sent a confirmation link to{" "}
          <span className="font-medium text-editorial-cream">
            {submittedEmail}
          </span>
          . Open it to activate your account, then return here to sign in.
        </p>
        <Button
          asChild
          className="mt-8 w-full bg-gold text-editorial-bg hover:bg-gold/90"
        >
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/90 p-8 shadow-lg backdrop-blur-sm">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-semibold text-gold">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-editorial-muted">
          Start your first book in minutes
        </p>
      </div>

      {sessionRecover ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-editorial-cream"
        >
          <p className="font-medium text-gold">Signed in without a profile</p>
          <p className="mt-2 leading-relaxed text-editorial-muted">
            Sign out first if you want to register a different email, or go to sign in to retry
            after fixing your Supabase project.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full border-gold/50 text-editorial-cream hover:bg-card"
            onClick={() => void signOutBrokenSession()}
          >
            Sign out
          </Button>
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
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
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="w-full bg-gold text-editorial-bg hover:bg-gold/90"
          loading={isSubmitting}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-editorial-muted">
        Already have an account?{" "}
        <Link
          href={sessionRecover ? "/login?recover=1" : "/login"}
          className="font-medium text-gold underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
