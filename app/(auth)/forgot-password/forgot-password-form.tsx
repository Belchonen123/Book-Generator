"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const sendResetEmail = async (email: string) => {
    const supabase = createClient();
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      (typeof window !== "undefined" ? window.location.origin : "");
    const redirectTo = base
      ? `${base}/callback?next=${encodeURIComponent("/reset-password")}`
      : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      // Intentionally do not surface whether the account exists; generic success shown below.
      toast.error("We couldn't send the email. Try again in a moment.");
      return false;
    }
    return true;
  };

  const onSubmit = async (values: Values) => {
    const ok = await sendResetEmail(values.email);
    if (ok) {
      setSent(true);
      toast.success("If an account exists, we sent a reset link.");
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card/90 p-8 shadow-lg backdrop-blur-sm">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-semibold text-gold">Check your email</h1>
          <p className="mt-3 text-sm text-editorial-muted">
            If an account exists for{" "}
            <span className="font-medium text-editorial-cream">{getValues("email")}</span>, we sent
            a link you can use to choose a new password.
          </p>
          <p className="mt-4 text-xs text-editorial-muted">
            The link expires in about an hour. If it doesn&apos;t arrive, check spam or{" "}
            <button
              type="button"
              className="font-medium text-gold underline-offset-4 hover:underline"
              onClick={() => setSent(false)}
            >
              try another email
            </button>
            .
          </p>
        </div>
        <div className="mt-8 text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-gold underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/90 p-8 shadow-lg backdrop-blur-sm">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-semibold text-gold">Reset your password</h1>
        <p className="mt-2 text-sm text-editorial-muted">
          Enter the email on your account and we&apos;ll send you a secure link to choose a new
          password.
        </p>
      </div>

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

        <Button
          type="submit"
          className="w-full bg-gold text-editorial-bg hover:bg-gold/90"
          loading={isSubmitting}
        >
          {isSubmitting ? "Sending…" : "Email me a reset link"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-editorial-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-gold underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
