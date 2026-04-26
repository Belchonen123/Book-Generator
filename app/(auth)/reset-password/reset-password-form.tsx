"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "@/lib/lucide-icons";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });
type Values = z.infer<typeof schema>;

type SessionState = "checking" | "ready" | "missing";

export function ResetPasswordForm() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      setSessionState(!error && data?.user ? "ready" : "missing");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (values: Values) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("same")
          ? "New password can't match the old one."
          : "We couldn't update your password. The reset link may have expired.",
      );
      return;
    }
    toast.success("Password updated.");
    router.replace("/dashboard");
  };

  if (sessionState === "checking") {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-card/80 p-8 text-center text-sm text-editorial-muted">
        <Loader2 className="h-4 w-4 animate-spin text-gold" aria-hidden />
        <span>Checking your reset link…</span>
      </div>
    );
  }

  if (sessionState === "missing") {
    return (
      <div className="rounded-xl border border-border bg-card/90 p-8 shadow-lg backdrop-blur-sm">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-semibold text-gold">Link expired</h1>
          <p className="mt-3 text-sm text-editorial-muted">
            This reset link is no longer valid. Request a fresh one and try again.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Button
            asChild
            className="w-full bg-gold text-editorial-bg hover:bg-gold/90"
          >
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
          <Link
            href="/login"
            className="text-center text-sm font-medium text-editorial-muted underline-offset-4 hover:text-editorial-cream hover:underline"
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
        <h1 className="font-serif text-3xl font-semibold text-gold">Choose a new password</h1>
        <p className="mt-2 text-sm text-editorial-muted">
          Pick something you&apos;ll remember — at least 8 characters.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
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
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirm)}
            {...register("confirm")}
          />
          {errors.confirm ? (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="w-full bg-gold text-editorial-bg hover:bg-gold/90"
          loading={isSubmitting}
        >
          {isSubmitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
