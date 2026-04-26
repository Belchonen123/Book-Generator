"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { saveProfileAction } from "@/app/(dashboard)/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";
import {
  AtSign,
  Globe,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
  UserRound,
} from "@/lib/lucide-icons";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const BIO_MAX = 600;

const formSchema = z.object({
  fullName: z.string().max(120, "Display name is too long."),
  penName: z.string().max(120, "Pen name is too long."),
  bio: z.string().max(BIO_MAX, "Bio must be 600 characters or fewer."),
  location: z.string().max(120, "Location is too long."),
  website: z.string().max(200, "Website URL is too long."),
  twitterHandle: z.string().max(40, "Handle is too long."),
});

type FormValues = z.infer<typeof formSchema>;

export function ProfilePageClient() {
  const router = useRouter();
  const profile = useDashboardProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: profile.fullName ?? "",
      penName: profile.penName ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
      twitterHandle: profile.twitterHandle ?? "",
    },
  });

  const bioValue = watch("bio") ?? "";
  const bioCount = bioValue.length;

  const onSave = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const res = await saveProfileAction(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Profile saved.");
      reset(values);
      router.refresh();
    } finally {
      setSaving(false);
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
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) {
        toast.error("Avatar upload failed.");
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so Next/Image and the <img> in the header re-render.
      const publicUrlWithVersion = `${publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrlWithVersion })
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

  const tier = profile.subscriptionTier;
  const displayHeader =
    (profile.fullName?.trim() || profile.penName?.trim() || profile.email || "Your profile");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-gold">Profile</h1>
          <p className="mt-2 text-sm text-editorial-muted">
            How you appear inside ChapterAI and on the books you publish.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
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

      {/* Identity card — avatar + headline */}
      <section className="mt-8 rounded-xl border border-border/70 bg-card/40 p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-editorial-bg/80 text-editorial-muted transition hover:border-gold/50 hover:text-gold",
                avatarBusy && "pointer-events-none opacity-60",
              )}
              aria-label="Upload avatar"
            >
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <UserRound className="h-10 w-10" aria-hidden />
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
            <p className="text-center text-xs text-editorial-muted">
              <span className="inline-flex items-center gap-1">
                <Upload className="h-3 w-3" aria-hidden />
                Click to change
              </span>
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-xl text-editorial-cream">{displayHeader}</p>
            <p className="mt-1 truncate text-sm text-editorial-muted">{profile.email}</p>
            {profile.location ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-editorial-muted">
                <MapPin className="h-3 w-3" aria-hidden />
                {profile.location}
              </p>
            ) : null}
            {profile.bio ? (
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-editorial-cream/90">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Editable form */}
      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        <section className="rounded-xl border border-border/70 bg-card/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-editorial-muted">
            Identity
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-full-name">Display name</Label>
              <Input
                id="profile-full-name"
                className="mt-1.5"
                autoComplete="name"
                placeholder="Your name"
                {...register("fullName")}
              />
              {errors.fullName ? (
                <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>
              ) : (
                <p className="mt-1 text-xs text-editorial-muted">
                  Shown in navigation and dashboards.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="profile-pen-name">Pen name</Label>
              <Input
                id="profile-pen-name"
                className="mt-1.5"
                autoComplete="off"
                placeholder="Author name on covers"
                {...register("penName")}
              />
              {errors.penName ? (
                <p className="mt-1 text-xs text-destructive">{errors.penName.message}</p>
              ) : (
                <p className="mt-1 text-xs text-editorial-muted">
                  Used as the author name on exported books. Defaults to display name.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                className="mt-1.5 cursor-default bg-muted/30"
                readOnly
                tabIndex={-1}
                value={profile.email}
              />
              <p className="mt-1 text-xs text-editorial-muted">
                Email is managed in Supabase Auth.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-editorial-muted">
            About you
          </h2>
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="profile-bio">Bio</Label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  bioCount > BIO_MAX
                    ? "text-destructive"
                    : bioCount > BIO_MAX - 60
                      ? "text-amber-300/90"
                      : "text-editorial-muted",
                )}
              >
                {bioCount}/{BIO_MAX}
              </span>
            </div>
            <Textarea
              id="profile-bio"
              className="mt-1.5"
              rows={5}
              placeholder="A short biography readers will see. You can leave this blank."
              {...register("bio")}
            />
            {errors.bio ? (
              <p className="mt-1 text-xs text-destructive">{errors.bio.message}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-editorial-muted">
            Links
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-location">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  Location
                </span>
              </Label>
              <Input
                id="profile-location"
                className="mt-1.5"
                autoComplete="address-level2"
                placeholder="Brooklyn, NY"
                {...register("location")}
              />
              {errors.location ? (
                <p className="mt-1 text-xs text-destructive">{errors.location.message}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="profile-website">
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  Website
                </span>
              </Label>
              <Input
                id="profile-website"
                className="mt-1.5"
                type="url"
                autoComplete="url"
                inputMode="url"
                placeholder="https://yoursite.com"
                {...register("website")}
              />
              {errors.website ? (
                <p className="mt-1 text-xs text-destructive">{errors.website.message}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="profile-twitter">
                <span className="inline-flex items-center gap-1.5">
                  <AtSign className="h-3.5 w-3.5" aria-hidden />
                  X / Twitter handle
                </span>
              </Label>
              <Input
                id="profile-twitter"
                className="mt-1.5"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="@yourhandle"
                {...register("twitterHandle")}
              />
              {errors.twitterHandle ? (
                <p className="mt-1 text-xs text-destructive">{errors.twitterHandle.message}</p>
              ) : (
                <p className="mt-1 text-xs text-editorial-muted">
                  Paste a profile URL or just the handle — we&apos;ll clean it up.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/settings"
            className="text-xs uppercase tracking-wide text-editorial-muted underline-offset-4 hover:text-editorial-cream hover:underline"
          >
            Subscription & billing →
          </Link>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border"
              disabled={!isDirty || saving}
              onClick={() =>
                reset({
                  fullName: profile.fullName ?? "",
                  penName: profile.penName ?? "",
                  bio: profile.bio ?? "",
                  location: profile.location ?? "",
                  website: profile.website ?? "",
                  twitterHandle: profile.twitterHandle ?? "",
                })
              }
            >
              Discard
            </Button>
            <Button
              type="submit"
              className="bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
