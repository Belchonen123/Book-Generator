"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Loader2,
  Sparkles,
  Upload,
} from "@/lib/lucide-icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  deleteAccountAction,
  saveProfileSettingsAction,
  updateAskRewriteOnOutlineEditAction,
  updateAutoSlopScanAction,
  updateDisplayNameOnBlurAction,
} from "@/app/(dashboard)/dashboard/settings/actions";
import { redeemCouponAction } from "@/app/(dashboard)/dashboard/settings/coupon-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";
import { createClient } from "@/lib/supabase/client";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import { cn } from "@/lib/utils/cn";

const FREE_FEATURES = [
  "Up to 3 active books",
  "Up to 10 chapters per book",
  "Idea refinement chat",
  "Outline editor & approval flow",
  "Chapter streaming & editor",
] as const;

const PRO_FEATURES = [
  "Unlimited books",
  "Unlimited chapters",
  "Everything in Free",
  "Priority generation queue",
  "Remove “Published with ChapterAI” from exports (when enabled)",
] as const;

const profileSchema = z.object({
  fullName: z.string().max(120, "Display name is too long."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export type SettingsPageClientProps = {
  authEmail: string;
  initialFullName: string | null;
  initialAvatarUrl: string | null;
  subscriptionTier: "free" | "pro";
  /** `profiles.preferences.askRewriteOnOutlineEdit` — default true. */
  askRewriteOnOutlineEdit: boolean;
  /** `profiles.preferences.autoSlopScanGeneratedChapters` — default true. */
  autoSlopScanGeneratedChapters: boolean;
};

function formatRenewal(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "long",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function SettingsPageClient({
  authEmail,
  initialFullName,
  initialAvatarUrl,
  subscriptionTier,
  askRewriteOnOutlineEdit: initialAskRewriteOnOutline,
  autoSlopScanGeneratedChapters: initialAutoSlopScan,
}: SettingsPageClientProps) {
  const router = useRouter();
  const profile = useDashboardProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [renewsAt, setRenewsAt] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [askRewriteOnOutlineEdit, setAskRewriteOnOutlineEdit] = useState(
    initialAskRewriteOnOutline,
  );
  const [outlinePrefBusy, setOutlinePrefBusy] = useState(false);
  const [autoSlopScan, setAutoSlopScan] = useState(initialAutoSlopScan);
  const [slopPrefBusy, setSlopPrefBusy] = useState(false);

  const lastSavedName = useRef((initialFullName ?? "").trim());

  useEffect(() => {
    setAskRewriteOnOutlineEdit(initialAskRewriteOnOutline);
  }, [initialAskRewriteOnOutline]);

  useEffect(() => {
    setAutoSlopScan(initialAutoSlopScan);
  }, [initialAutoSlopScan]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: initialFullName ?? "" },
  });

  const displayAvatar = profile.avatarUrl ?? initialAvatarUrl;
  const tier = profile.subscriptionTier ?? subscriptionTier;

  useEffect(() => {
    if (tier !== "pro") {
      setRenewsAt(null);
      setCancelAtPeriodEnd(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/stripe/subscription-status");
        const data = (await res.json()) as {
          renewsAt?: string | null;
          cancelAtPeriodEnd?: boolean;
        };
        if (cancelled || !res.ok) return;
        setRenewsAt(data.renewsAt ?? null);
        setCancelAtPeriodEnd(Boolean(data.cancelAtPeriodEnd));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tier]);

  useEffect(() => {
    if (!deleteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteOpen]);

  const onDisplayNameBlur = useCallback(async () => {
    const v = getValues("fullName").trim();
    if (v === lastSavedName.current) return;
    const r = await updateDisplayNameOnBlurAction(v);
    if (r.ok) {
      lastSavedName.current = v;
      router.refresh();
    } else {
      toast.error(r.error ?? "Could not save display name.");
    }
  }, [getValues, router]);

  const onSaveProfile = handleSubmit(async (vals) => {
    const v = vals.fullName.trim();
    const r = await saveProfileSettingsAction(v);
    if (r.ok) {
      lastSavedName.current = v;
      toast.success("Profile saved.");
      router.refresh();
    } else {
      toast.error(r.error ?? "Could not save profile.");
    }
  });

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const okType =
      file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp";
    if (!okType) {
      toast.error("Please upload a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }
    setAvatarBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You need to be signed in.");
        return;
      }
      const ext =
        (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (upErr) {
        toast.error("Avatar upload failed.");
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (dbErr) {
        toast.error("Could not save avatar URL.");
        return;
      }
      toast.success("Avatar updated.");
      router.refresh();
    } finally {
      setAvatarBusy(false);
    }
  };

  const onUpgradeCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Checkout is temporarily unavailable.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not reach checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const onManagePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Billing portal unavailable.");
    } finally {
      setPortalLoading(false);
    }
  };

  const onRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponBusy(true);
    try {
      const result = await redeemCouponAction(couponCode);
      if (result.ok) {
        toast.success("Coupon applied! You now have Pro access.", {
          description: "Refreshing your account…",
        });
        setCouponCode("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  };

  const onToggleOutlineRewriteOffer = useCallback(
    async (next: boolean) => {
      if (outlinePrefBusy) return;
      setOutlinePrefBusy(true);
      try {
        const r = await updateAskRewriteOnOutlineEditAction(next);
        if (!r.ok) {
          toast.error(r.error ?? "Could not update preference.");
          return;
        }
        setAskRewriteOnOutlineEdit(next);
        router.refresh();
      } finally {
        setOutlinePrefBusy(false);
      }
    },
    [outlinePrefBusy, router],
  );

  const onToggleAutoSlopScan = useCallback(
    async (next: boolean) => {
      if (slopPrefBusy) return;
      setSlopPrefBusy(true);
      try {
        const r = await updateAutoSlopScanAction(next);
        if (!r.ok) {
          toast.error(r.error ?? "Could not update preference.");
          return;
        }
        setAutoSlopScan(next);
        router.refresh();
      } finally {
        setSlopPrefBusy(false);
      }
    },
    [slopPrefBusy, router],
  );

  const onConfirmDelete = async () => {
    if (deletePhrase !== "DELETE") {
      toast.error("Type DELETE to confirm.");
      return;
    }
    setDeleteBusy(true);
    try {
      const r = await deleteAccountAction(deletePhrase);
      if (!r.ok) {
        toast.error(r.error ?? "Could not delete account.");
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login?deleted=1");
    } finally {
      setDeleteBusy(false);
    }
  };

  const renewalLabel = formatRenewal(renewsAt);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-2xl font-semibold text-gold">Settings</h1>
      <p className="mt-2 text-sm text-editorial-muted">
        Manage your profile, subscription, and account.
      </p>

      {/* Section 1 — Profile */}
      <section className="mt-10 rounded-xl border border-border/70 bg-card/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-editorial-muted">
          Profile
        </h2>
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-editorial-bg/80 text-editorial-muted transition hover:border-gold/50 hover:text-gold",
                avatarBusy && "pointer-events-none opacity-60",
              )}
              aria-label="Upload avatar"
            >
              {displayAvatar ? (
                <Image src={displayAvatar} alt="" fill sizes="96px" className="object-cover" />
              ) : (
                <Upload className="h-8 w-8" aria-hidden />
              )}
              {avatarBusy ? (
                <span className="absolute inset-0 flex items-center justify-center bg-editorial-bg/70">
                  <Loader2 className="h-6 w-6 animate-spin text-gold" aria-hidden />
                </span>
              ) : null}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => void onAvatarPick(e)}
            />
            <p className="text-center text-xs text-editorial-muted">Click to upload</p>
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <Label htmlFor="settings-display-name">Display name</Label>
              <Input
                id="settings-display-name"
                className="mt-1.5"
                autoComplete="name"
                {...register("fullName", {
                  onBlur: () => void onDisplayNameBlur(),
                })}
              />
              {errors.fullName ? (
                <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                className="mt-1.5 cursor-default bg-muted/30"
                readOnly
                tabIndex={-1}
                value={authEmail}
              />
              <p className="mt-1 text-xs text-editorial-muted">Email is managed in Supabase Auth.</p>
            </div>
            <Button
              type="button"
              className="bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
              onClick={() => void onSaveProfile()}
            >
              Save changes
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border/70 bg-card/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-editorial-muted">
          Chapter editor
        </h2>
        <p className="mt-2 text-sm text-editorial-muted">
          When you change a chapter&apos;s outline in the details panel, you can
          be prompted to regenerate the chapter to match the new plan.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border border-border text-gold"
            checked={askRewriteOnOutlineEdit}
            disabled={outlinePrefBusy}
            onChange={(e) => void onToggleOutlineRewriteOffer(e.target.checked)}
            aria-label="Ask me to rewrite the chapter when I edit its outline"
          />
          <span className="text-sm text-editorial-cream">
            Ask me to rewrite the chapter when I edit its outline
            {outlinePrefBusy ? (
              <Loader2
                className="ml-2 inline h-3.5 w-3.5 animate-spin text-gold"
                aria-hidden
              />
            ) : null}
          </span>
        </label>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border border-border text-gold"
            checked={autoSlopScan}
            disabled={slopPrefBusy}
            onChange={(e) => void onToggleAutoSlopScan(e.target.checked)}
            aria-label="Auto-check generated chapters for AI-default phrases"
          />
          <span className="text-sm text-editorial-cream">
            Auto-check generated chapters for AI-default phrases
            {slopPrefBusy ? (
              <Loader2
                className="ml-2 inline h-3.5 w-3.5 animate-spin text-gold"
                aria-hidden
              />
            ) : null}
          </span>
        </label>
      </section>

      {/* Section 2 — Subscription */}
      <section className="mt-8 rounded-xl border border-border/70 bg-card/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-editorial-muted">
          Subscription
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-serif text-xl text-editorial-cream">Current plan</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
              tier === "pro" ? "bg-gold/20 text-gold" : "bg-muted text-editorial-muted",
            )}
          >
            {tier === "pro" ? (
              <>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Pro
              </>
            ) : (
              "Free"
            )}
          </span>
        </div>

        {tier === "pro" && renewalLabel ? (
          <p className="mt-2 text-sm text-editorial-muted">
            Renews on <span className="text-editorial-cream">{renewalLabel}</span>
            {cancelAtPeriodEnd ? (
              <span className="block text-amber-200/90">
                Your subscription is set to cancel at the end of this period.
              </span>
            ) : null}
          </p>
        ) : null}

        <ul className="mt-6 flex flex-col gap-2 text-sm text-editorial-cream">
          {(tier === "pro" ? PRO_FEATURES : FREE_FEATURES).map((line) => (
            <li key={line} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={2.5} aria-hidden />
              {line}
            </li>
          ))}
        </ul>

        {tier === "free" ? (
          <div className="mt-8 rounded-lg border border-gold/35 bg-gradient-to-b from-gold/10 to-transparent p-5">
            <p className="font-serif text-lg text-editorial-cream">Upgrade to Pro</p>
            <p className="mt-1 text-sm text-editorial-muted">
              Unlock unlimited books and chapters, priority generation, and more.
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-editorial-cream">
              {PRO_FEATURES.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {line}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-6 w-full bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
              disabled={checkoutLoading}
              onClick={() => void onUpgradeCheckout()}
            >
              {checkoutLoading ? "Redirecting…" : "Upgrade to Pro — $19/month"}
            </Button>

            {/* ── Coupon code ──────────────────────────────────────────── */}
            <div id="coupon" className="mt-6 border-t border-border/40 pt-5">
              <p className="text-sm font-medium text-editorial-cream">Have a coupon code?</p>
              <p className="mt-0.5 text-xs text-editorial-muted">
                Enter your code below to unlock Pro access instantly.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void onRedeemCoupon();
                  }}
                  placeholder="Enter coupon code"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={couponBusy}
                  className="flex-1"
                  aria-label="Coupon code"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={couponBusy || !couponCode.trim()}
                  onClick={() => void onRedeemCoupon()}
                  className="border-gold/40 text-editorial-cream hover:bg-card/80 disabled:opacity-50"
                >
                  {couponBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="mt-8 border-border text-editorial-cream hover:bg-muted/40"
            disabled={portalLoading}
            onClick={() => void onManagePortal()}
          >
            <CreditCard className="mr-2 h-4 w-4" aria-hidden />
            {portalLoading ? "Opening…" : "Manage subscription"}
          </Button>
        )}
      </section>

      {/* Section 3 — Prompt templates */}
      <section className="mt-8 rounded-xl border border-border/70 bg-card/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-editorial-muted">
          AI prompt templates
        </h2>
        <p className="mt-3 text-sm text-editorial-muted">
          See and edit the system prompts behind every AI command. Customize the
          voice, structure, and behavior of generation for your whole account —
          or override per project from Project settings.
        </p>
        <a
          href="/dashboard/settings/prompts"
          className="mt-4 inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-editorial-cream hover:bg-muted/40"
        >
          Manage prompt templates
        </a>
      </section>

      {/* Section 4 — Danger */}
      <section className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Danger zone
        </h2>
        <p className="mt-3 text-sm text-editorial-muted">
          Permanently delete your account, books, outlines, chapters, and profile. This cannot be
          undone.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          onClick={() => {
            setDeletePhrase("");
            setDeleteOpen(true);
          }}
        >
          Delete account
        </Button>
      </section>

      {deleteOpen ? (
        <div className={responsiveModalRoot("z-50")}>
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close dialog"
            disabled={deleteBusy}
            onClick={() => setDeleteOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className={responsiveModalPanel("max-w-md p-6")}
          >
            <h3 id="delete-account-title" className="font-serif text-lg text-editorial-cream">
              Delete your account?
            </h3>
            <p className="mt-2 text-sm text-editorial-muted">
              This removes all of your data. Type <strong className="text-editorial-cream">DELETE</strong>{" "}
              to confirm.
            </p>
            <Input
              className="mt-4"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-border"
                disabled={deleteBusy}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteBusy}
                onClick={() => void onConfirmDelete()}
              >
                {deleteBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  "Delete forever"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
