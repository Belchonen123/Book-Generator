# ChapterAI Code Review Bundle

Generated: 2026-04-21 23:04:40 -04:00
Files: 224

Note: code blocks use tilde fences so triple backticks inside source (markdown strings, regex, etc.) don't break rendering.

## Table of Contents

- [.eslintrc.json](#eslintrc-json)
- [app/(auth)/auth-actions.ts](#app-auth-auth-actions-ts)
- [app/(auth)/callback/route.ts](#app-auth-callback-route-ts)
- [app/(auth)/forgot-password/forgot-password-form.tsx](#app-auth-forgot-password-forgot-password-form-tsx)
- [app/(auth)/forgot-password/page.tsx](#app-auth-forgot-password-page-tsx)
- [app/(auth)/layout.tsx](#app-auth-layout-tsx)
- [app/(auth)/login/login-form.tsx](#app-auth-login-login-form-tsx)
- [app/(auth)/login/page.tsx](#app-auth-login-page-tsx)
- [app/(auth)/reset-password/page.tsx](#app-auth-reset-password-page-tsx)
- [app/(auth)/reset-password/reset-password-form.tsx](#app-auth-reset-password-reset-password-form-tsx)
- [app/(auth)/signup/page.tsx](#app-auth-signup-page-tsx)
- [app/(auth)/signup/signup-form.tsx](#app-auth-signup-signup-form-tsx)
- [app/(dashboard)/dashboard/_components/dashboard-content.tsx](#app-dashboard-dashboard-components-dashboard-content-tsx)
- [app/(dashboard)/dashboard/actions.ts](#app-dashboard-dashboard-actions-ts)
- [app/(dashboard)/dashboard/loading.tsx](#app-dashboard-dashboard-loading-tsx)
- [app/(dashboard)/dashboard/page.tsx](#app-dashboard-dashboard-page-tsx)
- [app/(dashboard)/dashboard/settings/actions.ts](#app-dashboard-dashboard-settings-actions-ts)
- [app/(dashboard)/dashboard/settings/coupon-action.ts](#app-dashboard-dashboard-settings-coupon-action-ts)
- [app/(dashboard)/dashboard/settings/page.tsx](#app-dashboard-dashboard-settings-page-tsx)
- [app/(dashboard)/layout.tsx](#app-dashboard-layout-tsx)
- [app/(dashboard)/profile/actions.ts](#app-dashboard-profile-actions-ts)
- [app/(dashboard)/profile/page.tsx](#app-dashboard-profile-page-tsx)
- [app/(dashboard)/projects/[id]/_components/project-entry-content.tsx](#app-dashboard-projects-id-components-project-entry-content-tsx)
- [app/(dashboard)/projects/[id]/chapters/[chapterId]/_components/chapter-page-content.tsx](#app-dashboard-projects-id-chapters-chapterid-components-chapter-page-content-tsx)
- [app/(dashboard)/projects/[id]/chapters/[chapterId]/page.tsx](#app-dashboard-projects-id-chapters-chapterid-page-tsx)
- [app/(dashboard)/projects/[id]/chapters/reorder-action.ts](#app-dashboard-projects-id-chapters-reorder-action-ts)
- [app/(dashboard)/projects/[id]/cover/_components/cover-page-content.tsx](#app-dashboard-projects-id-cover-components-cover-page-content-tsx)
- [app/(dashboard)/projects/[id]/cover/page.tsx](#app-dashboard-projects-id-cover-page-tsx)
- [app/(dashboard)/projects/[id]/error.tsx](#app-dashboard-projects-id-error-tsx)
- [app/(dashboard)/projects/[id]/export/_components/export-page-content.tsx](#app-dashboard-projects-id-export-components-export-page-content-tsx)
- [app/(dashboard)/projects/[id]/export/page.tsx](#app-dashboard-projects-id-export-page-tsx)
- [app/(dashboard)/projects/[id]/idea/_components/idea-page-content.tsx](#app-dashboard-projects-id-idea-components-idea-page-content-tsx)
- [app/(dashboard)/projects/[id]/idea/actions.ts](#app-dashboard-projects-id-idea-actions-ts)
- [app/(dashboard)/projects/[id]/idea/page.tsx](#app-dashboard-projects-id-idea-page-tsx)
- [app/(dashboard)/projects/[id]/layout.tsx](#app-dashboard-projects-id-layout-tsx)
- [app/(dashboard)/projects/[id]/loading.tsx](#app-dashboard-projects-id-loading-tsx)
- [app/(dashboard)/projects/[id]/outline/_components/outline-page-content.tsx](#app-dashboard-projects-id-outline-components-outline-page-content-tsx)
- [app/(dashboard)/projects/[id]/outline/actions.ts](#app-dashboard-projects-id-outline-actions-ts)
- [app/(dashboard)/projects/[id]/outline/page.tsx](#app-dashboard-projects-id-outline-page-tsx)
- [app/(dashboard)/projects/[id]/page.tsx](#app-dashboard-projects-id-page-tsx)
- [app/(dashboard)/settings/page.tsx](#app-dashboard-settings-page-tsx)
- [app/api/admin/stats/route.ts](#app-api-admin-stats-route-ts)
- [app/api/ai/chapter-assist/route.ts](#app-api-ai-chapter-assist-route-ts)
- [app/api/ai/expand-outline/route.ts](#app-api-ai-expand-outline-route-ts)
- [app/api/ai/generate-about-author/route.ts](#app-api-ai-generate-about-author-route-ts)
- [app/api/ai/generate-back-cover/route.ts](#app-api-ai-generate-back-cover-route-ts)
- [app/api/ai/generate-book-metadata/route.ts](#app-api-ai-generate-book-metadata-route-ts)
- [app/api/ai/generate-chapter/route.ts](#app-api-ai-generate-chapter-route-ts)
- [app/api/ai/generate-cover/route.ts](#app-api-ai-generate-cover-route-ts)
- [app/api/ai/generate-outline/route.ts](#app-api-ai-generate-outline-route-ts)
- [app/api/ai/generate-subtitle/route.ts](#app-api-ai-generate-subtitle-route-ts)
- [app/api/ai/refine-idea/route.ts](#app-api-ai-refine-idea-route-ts)
- [app/api/compile-book/route.ts](#app-api-compile-book-route-ts)
- [app/api/export-kdp-pack/route.ts](#app-api-export-kdp-pack-route-ts)
- [app/api/stripe/create-checkout/route.ts](#app-api-stripe-create-checkout-route-ts)
- [app/api/stripe/portal/route.ts](#app-api-stripe-portal-route-ts)
- [app/api/stripe/subscription-status/route.ts](#app-api-stripe-subscription-status-route-ts)
- [app/api/webhooks/stripe/route.ts](#app-api-webhooks-stripe-route-ts)
- [app/error.tsx](#app-error-tsx)
- [app/global-error.tsx](#app-global-error-tsx)
- [app/globals.css](#app-globals-css)
- [app/layout.tsx](#app-layout-tsx)
- [app/not-found.tsx](#app-not-found-tsx)
- [app/page.tsx](#app-page-tsx)
- [app/robots.ts](#app-robots-ts)
- [app/sitemap.ts](#app-sitemap-ts)
- [components.json](#components-json)
- [components/book/AboutAuthorPanel.tsx](#components-book-aboutauthorpanel-tsx)
- [components/book/BackCoverCopyPanel.tsx](#components-book-backcovercopypanel-tsx)
- [components/book/BookMetadataPanel.tsx](#components-book-bookmetadatapanel-tsx)
- [components/book/ChapterEditor.tsx](#components-book-chaptereditor-tsx)
- [components/book/chapter-editor/assist-prompt-panel.tsx](#components-book-chapter-editor-assist-prompt-panel-tsx)
- [components/book/chapter-editor/bubble-menu.tsx](#components-book-chapter-editor-bubble-menu-tsx)
- [components/book/chapter-editor/ChapterEditor.tsx](#components-book-chapter-editor-chaptereditor-tsx)
- [components/book/chapter-editor/chapter-sidebar.tsx](#components-book-chapter-editor-chapter-sidebar-tsx)
- [components/book/chapter-editor/find-replace-panel.tsx](#components-book-chapter-editor-find-replace-panel-tsx)
- [components/book/chapter-editor/hooks/use-chapter-realtime.ts](#components-book-chapter-editor-hooks-use-chapter-realtime-ts)
- [components/book/chapter-editor/hooks/use-find-matches.ts](#components-book-chapter-editor-hooks-use-find-matches-ts)
- [components/book/chapter-editor/link-popover.tsx](#components-book-chapter-editor-link-popover-tsx)
- [components/book/chapter-editor/markdown.ts](#components-book-chapter-editor-markdown-ts)
- [components/book/chapter-editor/outline-panel.tsx](#components-book-chapter-editor-outline-panel-tsx)
- [components/book/chapter-editor/pending-state.tsx](#components-book-chapter-editor-pending-state-tsx)
- [components/book/chapter-editor/save-indicator.tsx](#components-book-chapter-editor-save-indicator-tsx)
- [components/book/chapter-editor/shortcut-cheatsheet.tsx](#components-book-chapter-editor-shortcut-cheatsheet-tsx)
- [components/book/chapter-editor/toolbar.tsx](#components-book-chapter-editor-toolbar-tsx)
- [components/book/chapter-editor/types.ts](#components-book-chapter-editor-types-ts)
- [components/book/chapter-editor/word-target.tsx](#components-book-chapter-editor-word-target-tsx)
- [components/book/CoverGenerator.tsx](#components-book-covergenerator-tsx)
- [components/book/dashboard-client.tsx](#components-book-dashboard-client-tsx)
- [components/book/ExampleBookModal.tsx](#components-book-examplebookmodal-tsx)
- [components/book/export/ExportBookSummaryCard.tsx](#components-book-export-exportbooksummarycard-tsx)
- [components/book/export/ExportChapterChecklist.tsx](#components-book-export-exportchapterchecklist-tsx)
- [components/book/export/ExportConfetti.tsx](#components-book-export-exportconfetti-tsx)
- [components/book/export/export-download-utils.ts](#components-book-export-export-download-utils-ts)
- [components/book/export/ExportKDPSection.tsx](#components-book-export-exportkdpsection-tsx)
- [components/book/export/export-types.ts](#components-book-export-export-types-ts)
- [components/book/export/TrimSizeSelector.tsx](#components-book-export-trimsizeselector-tsx)
- [components/book/export/useExportDownloads.ts](#components-book-export-useexportdownloads-ts)
- [components/book/ExportPanel.tsx](#components-book-exportpanel-tsx)
- [components/book/heavy-panels.tsx](#components-book-heavy-panels-tsx)
- [components/book/IdeaChat.tsx](#components-book-ideachat-tsx)
- [components/book/OnboardingModal.tsx](#components-book-onboardingmodal-tsx)
- [components/book/OutlineEditor.tsx](#components-book-outlineeditor-tsx)
- [components/book/ProgressStepper.tsx](#components-book-progressstepper-tsx)
- [components/book/ProjectCard.tsx](#components-book-projectcard-tsx)
- [components/book/ProjectProgressStepper.tsx](#components-book-projectprogressstepper-tsx)
- [components/landing/genre-cycle.tsx](#components-landing-genre-cycle-tsx)
- [components/landing/landing-features.tsx](#components-landing-landing-features-tsx)
- [components/landing/landing-footer.tsx](#components-landing-landing-footer-tsx)
- [components/landing/landing-hero.tsx](#components-landing-landing-hero-tsx)
- [components/landing/landing-how.tsx](#components-landing-landing-how-tsx)
- [components/landing/landing-json-ld.tsx](#components-landing-landing-json-ld-tsx)
- [components/landing/landing-nav.tsx](#components-landing-landing-nav-tsx)
- [components/landing/landing-pricing.tsx](#components-landing-landing-pricing-tsx)
- [components/landing/pro-checkout-button.tsx](#components-landing-pro-checkout-button-tsx)
- [components/layout/dashboard-chrome.tsx](#components-layout-dashboard-chrome-tsx)
- [components/layout/dashboard-inner.tsx](#components-layout-dashboard-inner-tsx)
- [components/layout/dashboard-profile-context.tsx](#components-layout-dashboard-profile-context-tsx)
- [components/layout/free-tier-banner.tsx](#components-layout-free-tier-banner-tsx)
- [components/layout/Header.tsx](#components-layout-header-tsx)
- [components/layout/payment-issue-banner.tsx](#components-layout-payment-issue-banner-tsx)
- [components/layout/project-book-context.tsx](#components-layout-project-book-context-tsx)
- [components/layout/Sidebar.tsx](#components-layout-sidebar-tsx)
- [components/layout/skeletons.tsx](#components-layout-skeletons-tsx)
- [components/profile/profile-page-client.tsx](#components-profile-profile-page-client-tsx)
- [components/providers/navigation-progress-bar.tsx](#components-providers-navigation-progress-bar-tsx)
- [components/providers/offline-service-worker.tsx](#components-providers-offline-service-worker-tsx)
- [components/providers/page-transition.tsx](#components-providers-page-transition-tsx)
- [components/providers/root-app-chrome.tsx](#components-providers-root-app-chrome-tsx)
- [components/settings/settings-page-client.tsx](#components-settings-settings-page-client-tsx)
- [components/subscription/ProUpgradeModal.tsx](#components-subscription-proupgrademodal-tsx)
- [components/ui/back-to-top.tsx](#components-ui-back-to-top-tsx)
- [components/ui/button.tsx](#components-ui-button-tsx)
- [components/ui/input.tsx](#components-ui-input-tsx)
- [components/ui/label.tsx](#components-ui-label-tsx)
- [components/ui/page-loader.tsx](#components-ui-page-loader-tsx)
- [components/ui/textarea.tsx](#components-ui-textarea-tsx)
- [hooks/useBook.ts](#hooks-usebook-ts)
- [hooks/useChapter.ts](#hooks-usechapter-ts)
- [hooks/useRealtime.ts](#hooks-userealtime-ts)
- [lib/anthropic/client.ts](#lib-anthropic-client-ts)
- [lib/anthropic/message-attempts.ts](#lib-anthropic-message-attempts-ts)
- [lib/anthropic/text-model.ts](#lib-anthropic-text-model-ts)
- [lib/api/book-access.ts](#lib-api-book-access-ts)
- [lib/book/project-entry.ts](#lib-book-project-entry-ts)
- [lib/book/workflow.ts](#lib-book-workflow-ts)
- [lib/coupon/validate.ts](#lib-coupon-validate-ts)
- [lib/dashboard/greeting.ts](#lib-dashboard-greeting-ts)
- [lib/dashboard/pagination.ts](#lib-dashboard-pagination-ts)
- [lib/docx/compiler.ts](#lib-docx-compiler-ts)
- [lib/docx/trim-sizes.ts](#lib-docx-trim-sizes-ts)
- [lib/kdp/build-kdp-pack-zip.ts](#lib-kdp-build-kdp-pack-zip-ts)
- [lib/kdp/format-listing-markdown.ts](#lib-kdp-format-listing-markdown-ts)
- [lib/kdp/generate-kdp-listing.ts](#lib-kdp-generate-kdp-listing-ts)
- [lib/kdp/outline-summary.ts](#lib-kdp-outline-summary-ts)
- [lib/kdp/walkthrough-markdown.ts](#lib-kdp-walkthrough-markdown-ts)
- [lib/lucide-icons.ts](#lib-lucide-icons-ts)
- [lib/openai/brief-context.ts](#lib-openai-brief-context-ts)
- [lib/openai/client.ts](#lib-openai-client-ts)
- [lib/openai/generate-character-bible.ts](#lib-openai-generate-character-bible-ts)
- [lib/openai/prompts.ts](#lib-openai-prompts-ts)
- [lib/seo/constants.ts](#lib-seo-constants-ts)
- [lib/seo/site-url.ts](#lib-seo-site-url-ts)
- [lib/stripe/client.ts](#lib-stripe-client-ts)
- [lib/subscription/limits.ts](#lib-subscription-limits-ts)
- [lib/supabase/admin.ts](#lib-supabase-admin-ts)
- [lib/supabase/client.ts](#lib-supabase-client-ts)
- [lib/supabase/ensure-profile-row.ts](#lib-supabase-ensure-profile-row-ts)
- [lib/supabase/middleware.ts](#lib-supabase-middleware-ts)
- [lib/supabase/select-columns.ts](#lib-supabase-select-columns-ts)
- [lib/supabase/server.ts](#lib-supabase-server-ts)
- [lib/ui/responsive-modal.ts](#lib-ui-responsive-modal-ts)
- [lib/utils/analytics.ts](#lib-utils-analytics-ts)
- [lib/utils/cn.ts](#lib-utils-cn-ts)
- [lib/utils/env.ts](#lib-utils-env-ts)
- [lib/utils/errors.ts](#lib-utils-errors-ts)
- [lib/utils/format.ts](#lib-utils-format-ts)
- [lib/utils/rate-limit.ts](#lib-utils-rate-limit-ts)
- [lib/utils/sanitize.ts](#lib-utils-sanitize-ts)
- [lib/utils/schemas.ts](#lib-utils-schemas-ts)
- [middleware.ts](#middleware-ts)
- [next.config.mjs](#next-config-mjs)
- [next-env.d.ts](#next-env-d-ts)
- [package.json](#package-json)
- [postcss.config.js](#postcss-config-js)
- [scripts/bundle-for-review.mjs](#scripts-bundle-for-review-mjs)
- [stores/global-progress-store.ts](#stores-global-progress-store-ts)
- [stores/project-sidebar-store.ts](#stores-project-sidebar-store-ts)
- [supabase/migrations/001_create_profiles.sql](#supabase-migrations-001-create-profiles-sql)
- [supabase/migrations/002_create_books.sql](#supabase-migrations-002-create-books-sql)
- [supabase/migrations/003_create_outlines.sql](#supabase-migrations-003-create-outlines-sql)
- [supabase/migrations/004_create_chapters.sql](#supabase-migrations-004-create-chapters-sql)
- [supabase/migrations/005_create_api_usage.sql](#supabase-migrations-005-create-api-usage-sql)
- [supabase/migrations/006_enable_rls.sql](#supabase-migrations-006-enable-rls-sql)
- [supabase/migrations/007_create_triggers.sql](#supabase-migrations-007-create-triggers-sql)
- [supabase/migrations/008_enable_realtime.sql](#supabase-migrations-008-enable-realtime-sql)
- [supabase/migrations/009_create_storage.sql](#supabase-migrations-009-create-storage-sql)
- [supabase/migrations/010_fix_profiles_trigger_rls.sql](#supabase-migrations-010-fix-profiles-trigger-rls-sql)
- [supabase/migrations/011_add_onboarding_flag.sql](#supabase-migrations-011-add-onboarding-flag-sql)
- [supabase/migrations/012_storage_avatars.sql](#supabase-migrations-012-storage-avatars-sql)
- [supabase/migrations/013_create_book_events.sql](#supabase-migrations-013-create-book-events-sql)
- [supabase/migrations/014_add_character_bible.sql](#supabase-migrations-014-add-character-bible-sql)
- [supabase/migrations/015_book_type.sql](#supabase-migrations-015-book-type-sql)
- [supabase/migrations/016_book_metadata.sql](#supabase-migrations-016-book-metadata-sql)
- [supabase/migrations/017_payment_failed.sql](#supabase-migrations-017-payment-failed-sql)
- [supabase/migrations/018_profiles_rls_explicit.sql](#supabase-migrations-018-profiles-rls-explicit-sql)
- [supabase/migrations/019_chapter_author_notes.sql](#supabase-migrations-019-chapter-author-notes-sql)
- [supabase/migrations/020_profile_author_fields.sql](#supabase-migrations-020-profile-author-fields-sql)
- [supabase/migrations/021_book_about_author.sql](#supabase-migrations-021-book-about-author-sql)
- [supabase/migrations/021_chapter_word_target.sql](#supabase-migrations-021-chapter-word-target-sql)
- [tailwind.config.js](#tailwind-config-js)
- [tests/components/ProgressStepper.test.tsx](#tests-components-progressstepper-test-tsx)
- [tests/components/ProjectCard.test.tsx](#tests-components-projectcard-test-tsx)
- [tests/setup.ts](#tests-setup-ts)
- [tests/unit/compiler.test.ts](#tests-unit-compiler-test-ts)
- [tests/unit/format.test.ts](#tests-unit-format-test-ts)
- [tests/unit/prompts.test.ts](#tests-unit-prompts-test-ts)
- [tests/unit/sanitize.test.ts](#tests-unit-sanitize-test-ts)
- [tests/unit/schemas.test.ts](#tests-unit-schemas-test-ts)
- [tsconfig.json](#tsconfig-json)
- [types/book.types.ts](#types-book-types-ts)
- [types/database.types.ts](#types-database-types-ts)
- [types/lucide-esm-icons.d.ts](#types-lucide-esm-icons-d-ts)
- [vitest.config.ts](#vitest-config-ts)

---

## .eslintrc.json

~~~json
{
  "root": true,
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": ["@typescript-eslint"],
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "out/",
    "coverage/",
    "next-env.d.ts"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ]
  },
  "overrides": [
    {
      "files": ["tests/**/*", "**/*.test.ts", "**/*.test.tsx", "vitest.config.ts"],
      "rules": {
        "react/display-name": "off"
      }
    }
  ]
}
~~~

## app/(auth)/auth-actions.ts

~~~ts
"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";

/**
 * Ensures `public.profiles` has a row for the current session user.
 * Call after browser `signInWithPassword` / signup so the dashboard layout can load the profile
 * even when the DB trigger or backfill was never applied.
 */
export async function ensureProfileAfterSignIn(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        error:
          "No session on the server yet. Wait a second and try again, or hard-refresh. If this persists, check Site URL / cookies for localhost.",
      };
    }

    const result = await ensureProfileRowForUser(supabase, user);

    if (!result.ok) {
      return {
        ok: false,
        error: `${result.error} â€” open Supabase â†’ Table Editor â†’ profiles and confirm RLS allows your user to insert/update their row. Run SQL migrations through 018_profiles_rls_explicit.sql.`,
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/login");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `ensureProfileAfterSignIn failed: ${message}`,
    };
  }
}
~~~

## app/(auth)/callback/route.ts

~~~ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";

function safeInternalPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeInternalPath(
    requestUrl.searchParams.get("next"),
    "/dashboard",
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.redirect(
      new URL("/login?error=config", requestUrl.origin),
    );
  }

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await ensureProfileRowForUser(supabase, user);
      }
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
}
~~~

## app/(auth)/forgot-password/forgot-password-form.tsx

~~~tsx
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
          {isSubmitting ? "Sendingâ€¦" : "Email me a reset link"}
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
~~~

## app/(auth)/forgot-password/page.tsx

~~~tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { ForgotPasswordForm } from "./forgot-password-form";

const DESC =
  "Reset your ChapterAI password â€” we'll email a secure link to set a new one.";

export const metadata: Metadata = {
  title: "Reset password",
  description: DESC,
  alternates: {
    canonical: "/forgot-password",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Reset password | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/forgot-password`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reset password | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card/80 p-8 text-center text-editorial-muted">
          Loadingâ€¦
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
~~~

## app/(auth)/layout.tsx

~~~tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-editorial-bg px-4 py-12">
      <div className="mx-auto w-full max-w-md">{children}</div>
      <p className="mt-10 text-center font-serif text-xs tracking-wide text-editorial-muted">
        ChapterAI
      </p>
    </div>
  );
}
~~~

## app/(auth)/login/login-form.tsx

~~~tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ensureProfileAfterSignIn } from "@/app/(auth)/auth-actions";
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
    return "Confirm your email first â€” we sent a link when you signed up.";
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to fetch")) {
    return "Cannot reach Supabase. Check your network/VPN and that NEXT_PUBLIC_SUPABASE_URL matches your project.";
  }
  return message.trim().length > 0 ? message : "Something went wrong. Please try again.";
}

function isEmailNotConfirmedError(
  message: string,
  code: string | undefined,
): boolean {
  return (
    code === "email_not_confirmed" ||
    message.toLowerCase().includes("email not confirmed")
  );
}

/**
 * Server Actions can occasionally resolve to `undefined` (transient Next.js
 * runtime hiccups, aborted RSC requests, etc.) or throw on the wire. Normalize
 * any outcome into the `{ ok, error? }` shape the UI expects so we never try
 * to read `.ok` off `undefined`.
 */
async function safeEnsureProfile(): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await ensureProfileAfterSignIn();
    if (!result || typeof result !== "object" || typeof result.ok !== "boolean") {
      return {
        ok: false,
        error:
          "Sign-in server action returned no response. Retry, or hard-refresh if it keeps happening.",
      };
    }
    return result;
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
      if (isEmailNotConfirmedError(error.message, error.code)) {
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
      toast.error(ensured.error ?? "Could not finish sign-in.");
      window.location.assign("/login?recover=1");
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

  const repairProfileAndContinue = async () => {
    setRepairing(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      let ensured = await safeEnsureProfile();
      if (!ensured.ok && ensured.error?.includes("No session")) {
        await new Promise((r) => setTimeout(r, 300));
        ensured = await safeEnsureProfile();
      }
      if (!ensured.ok) {
        toast.error(ensured.error ?? "Could not create your profile row.");
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
            You&apos;re signed in, but we couldn&apos;t load your profile (check Supabase
            migrations and that this app points at the same project). Sign out and sign in again,
            or create an account if you&apos;re new.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full bg-gold text-editorial-bg hover:bg-gold/90 sm:flex-1"
              loading={repairing}
              onClick={() => void repairProfileAndContinue()}
            >
              {repairing ? "Repairingâ€¦" : "Repair and continue"}
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
          {isSubmitting ? "Signing inâ€¦" : "Sign in"}
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
              ? "Sendingâ€¦"
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
        {oauthLoading ? "Redirectingâ€¦" : "Continue with Google"}
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
~~~

## app/(auth)/login/page.tsx

~~~tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { LoginForm } from "./login-form";

const DESC =
  "Sign in to ChapterAI to continue writing, generate chapters with AI, and export your book for Amazon KDP.";

export const metadata: Metadata = {
  title: "Sign in",
  description: DESC,
  alternates: {
    canonical: "/login",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Sign in | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/login`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign in | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card/80 p-8 text-center text-editorial-muted">
          Loadingâ€¦
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
~~~

## app/(auth)/reset-password/page.tsx

~~~tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { ResetPasswordForm } from "./reset-password-form";

const DESC = "Choose a new password for your ChapterAI account.";

export const metadata: Metadata = {
  title: "Set new password",
  description: DESC,
  alternates: {
    canonical: "/reset-password",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Set new password | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/reset-password`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Set new password | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card/80 p-8 text-center text-editorial-muted">
          Loadingâ€¦
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
~~~

## app/(auth)/reset-password/reset-password-form.tsx

~~~tsx
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
        <span>Checking your reset linkâ€¦</span>
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
          Pick something you&apos;ll remember â€” at least 8 characters.
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
          {isSubmitting ? "Savingâ€¦" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
~~~

## app/(auth)/signup/page.tsx

~~~tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { SignupForm } from "./signup-form";

const DESC =
  "Create a free ChapterAI account to plan your book, refine ideas with AI, and draft chapters for Kindle Direct Publishing.";

export const metadata: Metadata = {
  title: "Create account",
  description: DESC,
  alternates: {
    canonical: "/signup",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Create account | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/signup`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create account | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card/80 p-8 text-center text-editorial-muted">
          Loadingâ€¦
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
~~~

## app/(auth)/signup/signup-form.tsx

~~~tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ensureProfileAfterSignIn } from "@/app/(auth)/auth-actions";
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
        "Signup did not create a user. Check Authentication â†’ Providers â†’ Email is enabled, and that your .env keys match this Supabase project.",
      );
      return;
    }

    if (data.session) {
      await new Promise((r) => setTimeout(r, 100));
      let ensured = await ensureProfileAfterSignIn();
      if (!ensured.ok && ensured.error?.includes("No session")) {
        await new Promise((r) => setTimeout(r, 200));
        ensured = await ensureProfileAfterSignIn();
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
          {isSubmitting ? "Creating accountâ€¦" : "Create account"}
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
~~~

## app/(dashboard)/dashboard/_components/dashboard-content.tsx

~~~tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardClient } from "@/components/book/dashboard-client";
import { DashboardGridSkeleton } from "@/components/layout/skeletons";
import { greetingFirstName } from "@/lib/dashboard/greeting";
import { DASHBOARD_BOOKS_PAGE_SIZE } from "@/lib/dashboard/pagination";
import { createClient } from "@/lib/supabase/server";
import { FREE_BOOK_LIMIT } from "@/lib/subscription/limits";
import type { DashboardBook } from "@/types/book.types";

export async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name, email, has_seen_onboarding")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  const booksPageQuery = supabase
    .from("books")
    .select("id, title, genre, status, word_count, chapter_count, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(0, DASHBOARD_BOOKS_PAGE_SIZE - 1);

  const booksCountQuery = supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const booksStatsQuery = supabase
    .from("books")
    .select("word_count, status")
    .eq("user_id", user.id);

  const chapterEventsQuery = supabase
    .from("book_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("event_type", "chapter_generated");

  const [
    { data: booksRaw, error: booksError },
    { count: totalBookCount, error: countError },
    { data: statsRows, error: statsRowsError },
    { count: chaptersGenerated, error: eventsError },
  ] = await Promise.all([booksPageQuery, booksCountQuery, booksStatsQuery, chapterEventsQuery]);

  const books: DashboardBook[] =
    booksError || !booksRaw
      ? []
      : booksRaw.map((b) => ({
          id: b.id,
          title: b.title,
          genre: b.genre,
          status: b.status,
          word_count: b.word_count,
          chapter_count: b.chapter_count,
          updated_at: b.updated_at,
        }));

  const totalBooks = countError ? books.length : (totalBookCount ?? 0);
  const hasMoreBooks = !booksError && booksRaw.length === DASHBOARD_BOOKS_PAGE_SIZE;

  const safeStatsRows = statsRowsError || !statsRows ? [] : statsRows;
  const totalWordsWritten = safeStatsRows.reduce((acc, b) => acc + (b.word_count ?? 0), 0);
  const booksCompleted = safeStatsRows.filter((b) => b.status === "complete").length;
  const chaptersGeneratedCount =
    !eventsError && typeof chaptersGenerated === "number" ? chaptersGenerated : 0;

  const firstName = greetingFirstName(profile.full_name, profile.email);

  return (
    <>
      {booksError ? (
        <div
          role="alert"
          className="mx-auto max-w-6xl border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-editorial-cream sm:px-6"
        >
          <p className="font-medium text-destructive-foreground">Could not load your library</p>
          <p className="mt-1 text-editorial-muted">
            {booksError.message} â€” check Supabase RLS and that you are on the correct project.
          </p>
        </div>
      ) : null}
      <Suspense fallback={<DashboardGridSkeleton />}>
        <DashboardClient
          books={books}
          hasMoreBooks={hasMoreBooks}
          subscriptionTier={profile.subscription_tier}
          bookCount={totalBooks}
          freeBookLimit={FREE_BOOK_LIMIT}
          hasSeenOnboarding={profile.has_seen_onboarding ?? false}
          greetingName={firstName}
          stats={{
            totalBooks,
            totalWordsWritten,
            chaptersGenerated: chaptersGeneratedCount,
            booksCompleted,
          }}
        />
      </Suspense>
    </>
  );
}
~~~

## app/(dashboard)/dashboard/actions.ts

~~~ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DASHBOARD_BOOKS_PAGE_SIZE } from "@/lib/dashboard/pagination";
import { createClient } from "@/lib/supabase/server";
import { FREE_BOOK_LIMIT } from "@/lib/subscription/limits";
import { trackEvent } from "@/lib/utils/analytics";
import type { DashboardBook } from "@/types/book.types";

const DASHBOARD_BOOK_LIST_COLUMNS =
  "id, title, genre, status, word_count, chapter_count, updated_at" as const;

export async function createBookAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/dashboard?error=profile");
  }

  if (profile.subscription_tier === "free") {
    const { count, error: countError } = await supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!countError && (count ?? 0) >= FREE_BOOK_LIMIT) {
      redirect("/dashboard?error=limit");
    }
  }

  const { data: book, error: insertError } = await supabase
    .from("books")
    .insert({
      user_id: user.id,
      title: "Untitled Book",
      status: "idea",
    })
    .select("id")
    .single();

  if (insertError || !book) {
    redirect("/dashboard?error=create");
  }

  await trackEvent(user.id, "book_created", book.id);
  revalidatePath("/dashboard");
  redirect(`/projects/${book.id}`);
}

export async function renameBookAction(
  bookId: string,
  newTitle: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = newTitle.trim();
  if (!trimmed) {
    return { ok: false, error: "Title cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("books")
    .update({ title: trimmed })
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Could not rename this book." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${bookId}`);
  return { ok: true };
}

export async function deleteBookAction(
  bookId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Could not delete this book." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function loadMoreDashboardBooksAction(
  offset: number,
): Promise<{ books: DashboardBook[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { books: [], hasMore: false };
  }

  const { data: rows, error } = await supabase
    .from("books")
    .select(DASHBOARD_BOOK_LIST_COLUMNS)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + DASHBOARD_BOOKS_PAGE_SIZE - 1);

  if (error || !rows) {
    return { books: [], hasMore: false };
  }

  const books: DashboardBook[] = rows.map((b) => ({
    id: b.id,
    title: b.title,
    genre: b.genre,
    status: b.status,
    word_count: b.word_count,
    chapter_count: b.chapter_count,
    updated_at: b.updated_at,
  }));

  return {
    books,
    hasMore: rows.length === DASHBOARD_BOOKS_PAGE_SIZE,
  };
}

export async function recordBookDownloadAction(bookId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  await trackEvent(user.id, "book_downloaded", bookId);
}

export async function completeOnboardingAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ has_seen_onboarding: true })
    .eq("id", user.id);

  if (error) {
    return { ok: false };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
~~~

## app/(dashboard)/dashboard/loading.tsx

~~~tsx
import { DashboardGridSkeleton } from "@/components/layout/skeletons";

export default function DashboardLoading() {
  return <DashboardGridSkeleton />;
}
~~~

## app/(dashboard)/dashboard/page.tsx

~~~tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardGridSkeleton } from "@/components/layout/skeletons";
import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { DashboardContent } from "./_components/dashboard-content";

const DESC =
  "Manage your manuscripts, start new books, and open projects to write with ChapterAI.";

export const metadata: Metadata = {
  title: "Your Books",
  description: DESC,
  alternates: {
    canonical: "/dashboard",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your Books | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/dashboard`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Books | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardGridSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
~~~

## app/(dashboard)/dashboard/settings/actions.ts

~~~ts
"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const DISPLAY_NAME_MAX = 120;

async function purgeStoragePrefix(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string,
): Promise<void> {
  const { data: items } = await admin.storage.from(bucket).list(prefix, { limit: 500 });
  if (!items?.length) return;

  for (const item of items) {
    const path = `${prefix}/${item.name}`;
    const { data: nested } = await admin.storage.from(bucket).list(path, { limit: 500 });
    if (nested && nested.length > 0) {
      await purgeStoragePrefix(admin, bucket, path);
    } else {
      await admin.storage.from(bucket).remove([path]);
    }
  }
}

async function purgeUserStoragePrefixes(userId: string): Promise<void> {
  const admin = createAdminClient();
  for (const bucket of ["covers", "exports", "avatars"] as const) {
    try {
      await purgeStoragePrefix(admin, bucket, userId);
    } catch {
      /* best-effort cleanup */
    }
  }
}

export async function updateDisplayNameOnBlurAction(
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = fullName.trim().slice(0, DISPLAY_NAME_MAX);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed.length > 0 ? trimmed : null })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not update display name." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/profile");
  return { ok: true };
}

export async function saveProfileSettingsAction(
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  return updateDisplayNameOnBlurAction(fullName);
}

export async function deleteAccountAction(
  confirmation: string,
): Promise<{ ok: boolean; error?: string }> {
  if (confirmation !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const userId = user.id;

  try {
    try {
      await purgeUserStoragePrefixes(userId);
    } catch {
      /* continue â€” auth removal is authoritative */
    }

    const admin = createAdminClient();
    const { error: delAuthError } = await admin.auth.admin.deleteUser(userId);

    if (delAuthError) {
      return { ok: false, error: "Could not delete your account. Contact support." };
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Account deletion is temporarily unavailable." };
  }
}
~~~

## app/(dashboard)/dashboard/settings/coupon-action.ts

~~~ts
"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidCoupon } from "@/lib/coupon/validate";

export type RedeemCouponResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validate a coupon code and, if valid, upgrade the signed-in user to Pro.
 * Uses the admin client to bypass RLS so the tier update always lands.
 */
export async function redeemCouponAction(
  rawCode: string,
): Promise<RedeemCouponResult> {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "You must be signed in to redeem a coupon." };
  }

  // Already pro?
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier === "pro") {
    return { ok: false, error: "Your account is already on the Pro plan." };
  }

  // Validate coupon
  if (!rawCode.trim()) {
    return { ok: false, error: "Enter a coupon code." };
  }
  if (!isValidCoupon(rawCode)) {
    return { ok: false, error: "That coupon code is not valid." };
  }

  // Upgrade via admin client (bypasses RLS)
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({ subscription_tier: "pro" })
    .eq("id", user.id);

  if (updateError) {
    console.error("[redeemCouponAction]", updateError);
    return { ok: false, error: "Could not apply the coupon. Please try again." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true };
}
~~~

## app/(dashboard)/dashboard/settings/page.tsx

~~~tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, subscription_tier")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  const tier = profile.subscription_tier === "pro" ? "pro" : "free";

  return (
    <SettingsPageClient
      authEmail={user.email ?? ""}
      initialFullName={profile.full_name}
      initialAvatarUrl={profile.avatar_url}
      subscriptionTier={tier}
    />
  );
}
~~~

## app/(dashboard)/layout.tsx

~~~tsx
import { redirect } from "next/navigation";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { DashboardProfileValue } from "@/components/layout/dashboard-profile-context";
import { DashboardInner } from "@/components/layout/dashboard-inner";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import type { Database } from "@/types/database.types";

const FULL_PROFILE_COLUMNS =
  "id, email, full_name, avatar_url, bio, pen_name, website, location, twitter_handle, subscription_tier, payment_failed_at, payment_failure_reason" as const;

const MINIMAL_PROFILE_COLUMNS =
  "id, email, full_name, avatar_url, bio, pen_name, website, location, twitter_handle, subscription_tier" as const;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  pen_name: string | null;
  website: string | null;
  location: string | null;
  twitter_handle: string | null;
  subscription_tier: Database["public"]["Tables"]["profiles"]["Row"]["subscription_tier"];
  payment_failed_at?: string | null;
  payment_failure_reason?: string | null;
};

/**
 * `42703` = undefined_column. If the payment-failure columns haven't been added
 * yet (migration `017_payment_failed.sql` not applied), fall back to a SELECT
 * that omits them so the app still works. The banner just won't render.
 */
function isMissingPaymentColumn(error: PostgrestError | null): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  const msg = error.message?.toLowerCase() ?? "";
  return (
    msg.includes("payment_failed_at") || msg.includes("payment_failure_reason")
  );
}

async function loadProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<
  | { ok: true; profile: ProfileRow }
  | { ok: false; missing: true }
  | { ok: false; missing: false; error: PostgrestError }
> {
  const full = await supabase
    .from("profiles")
    .select(FULL_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (!full.error) {
    if (!full.data) return { ok: false, missing: true };
    return { ok: true, profile: full.data as ProfileRow };
  }

  if (isMissingPaymentColumn(full.error)) {
    // eslint-disable-next-line no-console
    console.warn(
      "[dashboard-layout] profiles.payment_failed_at/payment_failure_reason are missing on the database. " +
        "Apply supabase/migrations/017_payment_failed.sql. Falling back to minimal select.",
    );
    const minimal = await supabase
      .from("profiles")
      .select(MINIMAL_PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (minimal.error) {
      return { ok: false, missing: false, error: minimal.error };
    }
    if (!minimal.data) return { ok: false, missing: true };
    return { ok: true, profile: minimal.data as ProfileRow };
  }

  return { ok: false, missing: false, error: full.error };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let loaded = await loadProfile(supabase, user.id);

  if (!loaded.ok && !loaded.missing) {
    // eslint-disable-next-line no-console
    console.error("[dashboard-layout] profile SELECT failed", {
      userId: user.id,
      code: loaded.error.code,
      message: loaded.error.message,
      details: loaded.error.details,
      hint: loaded.error.hint,
    });
    redirect("/login?recover=1");
  }

  if (!loaded.ok && loaded.missing) {
    const ensured = await ensureProfileRowForUser(supabase, user);
    if (!ensured.ok) {
      // eslint-disable-next-line no-console
      console.error(
        "[dashboard-layout] ensureProfileRowForUser failed:",
        ensured.error,
      );
      redirect("/login?recover=1");
    }
    loaded = await loadProfile(supabase, user.id);
    if (!loaded.ok) {
      // eslint-disable-next-line no-console
      console.error(
        "[dashboard-layout] profile still unreadable after ensure",
        loaded.missing
          ? { missing: true }
          : {
              code: loaded.error.code,
              message: loaded.error.message,
              details: loaded.error.details,
              hint: loaded.error.hint,
            },
      );
      redirect("/login?recover=1");
    }
  }

  const profile = loaded.profile;

  const profileValue: DashboardProfileValue = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    bio: profile.bio ?? null,
    penName: profile.pen_name ?? null,
    website: profile.website ?? null,
    location: profile.location ?? null,
    twitterHandle: profile.twitter_handle ?? null,
    subscriptionTier: profile.subscription_tier,
    paymentFailedAt: profile.payment_failed_at ?? null,
    paymentFailureReason: profile.payment_failure_reason ?? null,
  };

  return (
    <DashboardInner profile={profileValue}>{children}</DashboardInner>
  );
}
~~~

## app/(dashboard)/profile/actions.ts

~~~ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const LIMITS = {
  fullName: 120,
  penName: 120,
  bio: 600,
  location: 120,
  website: 200,
  twitterHandle: 32,
} as const;

// Normalised-on-submit: we strip leading "@" and any URL wrappers so the DB
// stores a clean handle regardless of how the user types it.
function normaliseTwitterHandle(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "")
    .replace(/^@+/, "")
    .split(/[?/]/)[0]
    .trim();
  return stripped;
}

function normaliseWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const profileSchema = z.object({
  fullName: z.string().max(LIMITS.fullName, "Display name is too long."),
  penName: z.string().max(LIMITS.penName, "Pen name is too long."),
  bio: z.string().max(LIMITS.bio, "Bio must be 600 characters or fewer."),
  location: z.string().max(LIMITS.location, "Location is too long."),
  website: z.string().max(LIMITS.website, "Website URL is too long."),
  twitterHandle: z
    .string()
    .max(LIMITS.twitterHandle + 40, "Handle is too long.") // slack for pasted URLs pre-normalise
    .refine(
      (v) => {
        const h = normaliseTwitterHandle(v);
        return h.length === 0 || /^[A-Za-z0-9_]{1,32}$/.test(h);
      },
      { message: "Handle can only contain letters, numbers, and underscores." },
    ),
});

export type ProfileFormInput = z.input<typeof profileSchema>;

function nullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t.length === 0 ? null : t;
}

export async function saveProfileAction(
  input: ProfileFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid profile data." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const websiteRaw = parsed.data.website.trim();
  const website = websiteRaw.length === 0 ? null : normaliseWebsite(websiteRaw);
  if (website && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(website)) {
    return { ok: false, error: "Website must be a valid URL." };
  }

  const handleNormalised = normaliseTwitterHandle(parsed.data.twitterHandle);
  const twitterHandle = handleNormalised.length === 0 ? null : handleNormalised;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: nullIfEmpty(parsed.data.fullName),
      pen_name: nullIfEmpty(parsed.data.penName),
      bio: nullIfEmpty(parsed.data.bio),
      location: nullIfEmpty(parsed.data.location),
      website,
      twitter_handle: twitterHandle,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
~~~

## app/(dashboard)/profile/page.tsx

~~~tsx
import type { Metadata } from "next";

import { ProfilePageClient } from "@/components/profile/profile-page-client";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
~~~

## app/(dashboard)/projects/[id]/_components/project-entry-content.tsx

~~~tsx
import { notFound, redirect } from "next/navigation";

import { IdeaChat } from "@/components/book/IdeaChat";
import { resolveChapterEntryId } from "@/lib/book/project-entry";
import { createClient } from "@/lib/supabase/server";
import type { BookStatusDb } from "@/types/database.types";

export async function ProjectEntryContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("id, user_id, status, title, idea_conversation, refined_idea, book_type")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  const status = book.status as BookStatusDb;

  if (status === "idea" || status === "refining") {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <IdeaChat
          bookId={book.id}
          bookTitle={book.title}
          initialConversation={book.idea_conversation}
          initialRefinedIdea={book.refined_idea}
          initialBookType={book.book_type ?? "fiction"}
        />
      </div>
    );
  }

  if (status === "outlining") {
    redirect(`/projects/${book.id}/outline`);
  }

  if (status === "writing" || status === "editing") {
    const chapterId = await resolveChapterEntryId(supabase, book.id);
    if (!chapterId) {
      redirect(`/projects/${book.id}/outline`);
    }
    redirect(`/projects/${book.id}/chapters/${chapterId}`);
  }

  if (status === "cover") {
    redirect(`/projects/${book.id}/cover`);
  }

  if (status === "complete") {
    redirect(`/projects/${book.id}/export`);
  }

  redirect(`/projects/${book.id}/outline`);
}
~~~

## app/(dashboard)/projects/[id]/chapters/[chapterId]/_components/chapter-page-content.tsx

~~~tsx
import { notFound, redirect } from "next/navigation";

import { ChapterEditor } from "@/components/book/ChapterEditor";
import { createClient } from "@/lib/supabase/server";

export async function ChapterPageContent({
  bookId,
  chapterId,
}: {
  bookId: string;
  chapterId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, subtitle, user_id")
    .eq("id", bookId)
    .single();

  if (bookError || !book || book.user_id !== user.id) {
    notFound();
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select(
      "id, book_id, chapter_number, title, status, word_count, content, outline_summary, author_notes, target_word_count",
    )
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .single();

  if (chapterError || !chapter) {
    notFound();
  }

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, status, word_count")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true });

  return (
    <ChapterEditor
      bookId={book.id}
      bookTitle={book.title}
      bookSubtitle={book.subtitle}
      initialChapters={chapters ?? []}
      chapter={chapter}
      subscriptionTier={profile.subscription_tier}
    />
  );
}
~~~

## app/(dashboard)/projects/[id]/chapters/[chapterId]/page.tsx

~~~tsx
import { Suspense } from "react";

import { ProjectWorkspaceSkeleton } from "@/components/layout/skeletons";

import { ChapterPageContent } from "./_components/chapter-page-content";

export default function ChapterPage({
  params,
}: {
  params: { id: string; chapterId: string };
}) {
  return (
    <Suspense fallback={<ProjectWorkspaceSkeleton />}>
      <ChapterPageContent bookId={params.id} chapterId={params.chapterId} />
    </Suspense>
  );
}
~~~

## app/(dashboard)/projects/[id]/chapters/reorder-action.ts

~~~ts
"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Reorder chapters during the writing phase.
 *
 * Accepts an array of chapter ids in the user's desired new order and rewrites
 * `chapter_number` on each so they match the array index (1-based).
 *
 * Because `chapters` has a `UNIQUE (book_id, chapter_number)` constraint
 * (migration 004), we do a two-pass update: first pass sets each chapter's
 * chapter_number to a negative, temporary value to avoid collisions; second
 * pass sets the real target numbers.
 *
 * The RLS `USING (auth.uid() = user_id)` on the `chapters` table + a join
 * check here guarantees only the owner can rewrite these rows.
 */
export async function reorderChaptersAction(
  bookId: string,
  orderedChapterIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!bookId || orderedChapterIds.length === 0) {
    return { ok: false, error: "No chapters supplied." };
  }

  const seen = new Set<string>();
  for (const id of orderedChapterIds) {
    if (typeof id !== "string" || !id) return { ok: false, error: "Invalid chapter id." };
    if (seen.has(id)) return { ok: false, error: "Duplicate chapter id in request." };
    seen.add(id);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Confirm book ownership explicitly (defence-in-depth on top of RLS).
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, user_id")
    .eq("id", bookId)
    .single();
  if (bookError || !book || book.user_id !== user.id) {
    return { ok: false, error: "Book not found." };
  }

  // Confirm every id we were given belongs to this book AND that the caller
  // supplied *all* chapters (partial reorders would leave gaps/collisions).
  const { data: existing, error: listError } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId);
  if (listError || !existing) {
    return { ok: false, error: "Could not load chapters." };
  }
  if (existing.length !== orderedChapterIds.length) {
    return { ok: false, error: "Chapter list is out of sync â€” refresh and try again." };
  }
  const existingIds = new Set(existing.map((c) => c.id));
  for (const id of orderedChapterIds) {
    if (!existingIds.has(id)) {
      return { ok: false, error: "Unknown chapter id in request." };
    }
  }

  // Pass 1: push every chapter into the negative range so the unique
  // constraint on (book_id, chapter_number) never fires while we shuffle.
  for (let i = 0; i < orderedChapterIds.length; i++) {
    const id = orderedChapterIds[i]!;
    const tempNumber = -(i + 1);
    const { error } = await supabase
      .from("chapters")
      .update({ chapter_number: tempNumber })
      .eq("id", id)
      .eq("book_id", bookId);
    if (error) {
      return { ok: false, error: "Reorder failed mid-flight. Refresh and retry." };
    }
  }

  // Pass 2: assign final positive numbers.
  for (let i = 0; i < orderedChapterIds.length; i++) {
    const id = orderedChapterIds[i]!;
    const finalNumber = i + 1;
    const { error } = await supabase
      .from("chapters")
      .update({ chapter_number: finalNumber })
      .eq("id", id)
      .eq("book_id", bookId);
    if (error) {
      return { ok: false, error: "Reorder finalisation failed. Refresh and retry." };
    }
  }

  revalidatePath(`/projects/${bookId}`);
  revalidatePath(`/projects/${bookId}/export`);
  return { ok: true };
}
~~~

## app/(dashboard)/projects/[id]/cover/_components/cover-page-content.tsx

~~~tsx
import { notFound, redirect } from "next/navigation";

import { AboutAuthorPanel } from "@/components/book/AboutAuthorPanel";
import { BackCoverCopyPanel } from "@/components/book/BackCoverCopyPanel";
import { BookMetadataPanel } from "@/components/book/BookMetadataPanel";
import { CoverGeneratorLazy } from "@/components/book/heavy-panels";
import { createClient } from "@/lib/supabase/server";

export async function CoverPageContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [bookResult, profileResult] = await Promise.all([
    supabase
      .from("books")
      .select(
        "id, title, subtitle, author_display_name, genre, refined_idea, tone, cover_url, cover_prompt, back_cover_copy, about_author",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, bio, pen_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const { data: book, error } = bookResult;
  if (error || !book) {
    notFound();
  }

  const profile = profileResult.data ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-w-0">
          <CoverGeneratorLazy
            bookId={book.id}
            bookTitle={book.title}
            genre={book.genre}
            refinedIdea={book.refined_idea}
            tone={book.tone}
            initialCoverUrl={book.cover_url}
            initialCoverPrompt={book.cover_prompt}
          />
        </div>

        <aside className="min-w-0 space-y-6">
          <BookMetadataPanel
            bookId={book.id}
            initialTitle={book.title}
            initialSubtitle={book.subtitle}
            initialAuthorDisplayName={book.author_display_name}
          />
          <BackCoverCopyPanel
            bookId={book.id}
            initialBlurb={book.back_cover_copy}
          />
          <AboutAuthorPanel
            bookId={book.id}
            initialAboutAuthor={book.about_author}
            profileBio={profile?.bio ?? null}
            profilePenName={profile?.pen_name ?? null}
            profileFullName={profile?.full_name ?? null}
            profileAvatarUrl={profile?.avatar_url ?? null}
          />
        </aside>
      </div>
    </div>
  );
}
~~~

## app/(dashboard)/projects/[id]/cover/page.tsx

~~~tsx
import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { CoverPageContent } from "./_components/cover-page-content";

export default function CoverPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <CoverPageContent bookId={params.id} />
    </Suspense>
  );
}
~~~

## app/(dashboard)/projects/[id]/error.tsx

~~~tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[project-error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-serif text-2xl text-gold">This project hit a snag</p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-editorial-muted">
        Refresh the page or return to your dashboard. If the problem continues, try again in a few
        minutes.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
          onClick={() => reset()}
        >
          Try again
        </Button>
        <Button type="button" variant="outline" className="border-gold/40 text-editorial-cream" asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
~~~

## app/(dashboard)/projects/[id]/export/_components/export-page-content.tsx

~~~tsx
import { notFound, redirect } from "next/navigation";

import { ExportPanelLazy } from "@/components/book/heavy-panels";
import { createClient } from "@/lib/supabase/server";

export async function ExportPageContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, user_id, title, genre, word_count, chapter_count, cover_url")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const { data: chapters, error: chError } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, status")
    .eq("book_id", book.id)
    .order("chapter_number", { ascending: true });

  const chapterRows = chError ? [] : (chapters ?? []);

  return (
    <ExportPanelLazy
      bookId={book.id}
      title={book.title}
      genre={book.genre}
      wordCount={book.word_count}
      chapterCount={book.chapter_count}
      coverUrl={book.cover_url}
      chapters={chapterRows}
    />
  );
}
~~~

## app/(dashboard)/projects/[id]/export/page.tsx

~~~tsx
import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { ExportPageContent } from "./_components/export-page-content";

export default function ExportPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <ExportPageContent bookId={params.id} />
    </Suspense>
  );
}
~~~

## app/(dashboard)/projects/[id]/idea/_components/idea-page-content.tsx

~~~tsx
import { notFound, redirect } from "next/navigation";

import { IdeaChat } from "@/components/book/IdeaChat";
import { createClient } from "@/lib/supabase/server";

/**
 * Dedicated idea-phase route. Always renders the IdeaChat regardless of book
 * status so authors can revisit / tweak the premise even after they've moved
 * on to outline, chapters, cover, or export.
 *
 * The "auto-resume" behavior that redirects users from `/projects/[id]` to the
 * furthest step they've reached lives in `project-entry-content.tsx` and is
 * intentionally NOT duplicated here.
 */
export async function IdeaPageContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("id, user_id, title, idea_conversation, refined_idea, book_type")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <IdeaChat
        bookId={book.id}
        bookTitle={book.title}
        initialConversation={book.idea_conversation}
        initialRefinedIdea={book.refined_idea}
        initialBookType={book.book_type ?? "fiction"}
      />
    </div>
  );
}
~~~

## app/(dashboard)/projects/[id]/idea/actions.ts

~~~ts
"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { BookTypeDb } from "@/types/database.types";

/**
 * Persists the author's fiction / non-fiction choice to `books.book_type`.
 * Called from the idea page's BookTypeSelector so downstream prompts
 * (chapter generation in particular) branch correctly.
 */
export async function updateBookTypeAction(
  bookId: string,
  bookType: BookTypeDb,
): Promise<{ ok: boolean; error?: string }> {
  if (bookType !== "fiction" && bookType !== "non_fiction") {
    return { ok: false, error: "Invalid book type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("books")
    .update({ book_type: bookType })
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Could not save book type." };
  }

  revalidatePath(`/projects/${bookId}`);
  revalidatePath(`/projects/${bookId}/idea`);
  revalidatePath(`/projects/${bookId}/outline`);
  return { ok: true };
}
~~~

## app/(dashboard)/projects/[id]/idea/page.tsx

~~~tsx
import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { IdeaPageContent } from "./_components/idea-page-content";

export default function IdeaPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <IdeaPageContent bookId={params.id} />
    </Suspense>
  );
}
~~~

## app/(dashboard)/projects/[id]/layout.tsx

~~~tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectProgressStepper } from "@/components/book/ProjectProgressStepper";
import { ProjectBookProvider } from "@/components/layout/project-book-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      title: "Project",
      robots: { index: false, follow: false },
    };
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("title")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    return {
      title: "Project",
      robots: { index: false, follow: false },
    };
  }

  const rawTitle = book.title?.trim() || "Untitled";
  const safeTitle =
    rawTitle.length > 70 ? `${rawTitle.slice(0, 67).trimEnd()}â€¦` : rawTitle;
  const writingTitle = `Writing: ${safeTitle}`;
  const desc = `Continue â€œ${safeTitle}â€ in ChapterAI â€” outline, draft chapters, cover, and export.`;

  const path = `/projects/${params.id}`;
  const base = siteUrlString();

  return {
    title: writingTitle,
    description: desc,
    alternates: {
      canonical: path,
    },
    robots: { index: false, follow: false },
    openGraph: {
      title: `${writingTitle} | ChapterAI`,
      description: desc,
      url: `${base}${path}`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${writingTitle} | ChapterAI`,
      description: desc,
      images: [`${metadataBaseUrl().origin}/og-image.png`],
    },
  };
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("id, title, status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  const { data: firstChapter } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", params.id)
    .order("chapter_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <ProjectBookProvider
      value={{
        bookId: book.id,
        bookTitle: book.title?.trim() || "Untitled",
        bookStatus: book.status,
        firstChapterId: firstChapter?.id ?? null,
      }}
    >
      <div className="flex min-h-screen w-full flex-col bg-editorial-bg">
        <ProjectProgressStepper bookStatus={book.status} />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </ProjectBookProvider>
  );
}
~~~

## app/(dashboard)/projects/[id]/loading.tsx

~~~tsx
import { ProjectWorkspaceSkeleton } from "@/components/layout/skeletons";

export default function ProjectLoading() {
  return <ProjectWorkspaceSkeleton />;
}
~~~

## app/(dashboard)/projects/[id]/outline/_components/outline-page-content.tsx

~~~tsx
import { notFound, redirect } from "next/navigation";

import { OutlineEditorLazy } from "@/components/book/heavy-panels";
import { createClient } from "@/lib/supabase/server";

export async function OutlinePageContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, book_type")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const { data: outline } = await supabase
    .from("outlines")
    .select("id, book_id, sections, approved")
    .eq("book_id", book.id)
    .maybeSingle();

  return (
    <OutlineEditorLazy
      bookId={book.id}
      bookTitle={book.title}
      bookType={book.book_type}
      initialOutline={outline}
    />
  );
}
~~~

## app/(dashboard)/projects/[id]/outline/actions.ts

~~~ts
"use server";

import { generateCharacterBiblePayload } from "@/lib/openai/generate-character-bible";
import { createClient } from "@/lib/supabase/server";
import type { BookTypeDb, Json } from "@/types/database.types";
import { trackEvent } from "@/lib/utils/analytics";
import { logServerError } from "@/lib/utils/errors";

export type ApproveOutlineResult =
  | { ok: true; firstChapterId: string }
  | { ok: false; error: string };

export async function approveOutline(bookId: string): Promise<ApproveOutlineResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Unauthorized" };
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, book_type, genre, tone, refined_idea, raw_idea")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    return { ok: false, error: "Book not found." };
  }

  const { error: outlineUpdateError } = await supabase
    .from("outlines")
    .update({ approved: true })
    .eq("book_id", bookId);

  if (outlineUpdateError) {
    return { ok: false, error: "Could not approve outline." };
  }

  const { error: bookStatusError } = await supabase
    .from("books")
    .update({ status: "writing" })
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (bookStatusError) {
    return { ok: false, error: "Could not update book status." };
  }

  const { data: firstChapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (chapterError || !firstChapter) {
    return { ok: false, error: "No chapters found. Generate an outline first." };
  }

  const { data: outlineRow, error: outlineReadError } = await supabase
    .from("outlines")
    .select("sections")
    .eq("book_id", bookId)
    .single();

  if (outlineReadError) {
    logServerError("approveOutline.outline-read", outlineReadError);
  } else if (outlineRow) {
    const brief =
      book.refined_idea?.trim() ||
      book.raw_idea?.trim() ||
      (book.title?.trim() && book.title.trim() !== "Untitled Book"
        ? `Working title: ${book.title.trim()}`
        : "");

    const bibleResult = await generateCharacterBiblePayload({
      bookTitle: book.title ?? "Untitled",
      bookType: book.book_type as BookTypeDb,
      genre: book.genre,
      tone: book.tone,
      brief: brief || "(No stored brief.)",
      outlineSections: outlineRow.sections,
    });

    if (bibleResult) {
      const { error: bibleUpdateError } = await supabase
        .from("books")
        .update({ character_bible: bibleResult.payload as unknown as Json })
        .eq("id", bookId)
        .eq("user_id", user.id);

      if (bibleUpdateError) {
        logServerError("approveOutline.character-bible-update", bibleUpdateError);
      } else {
        await supabase.from("api_usage").insert({
          user_id: user.id,
          route: "approve-outline:character-bible",
          tokens_used: bibleResult.tokensUsed,
          model: "gpt-4o-mini",
        });
      }
    } else {
      logServerError(
        "approveOutline.character-bible",
        new Error("generation returned null"),
      );
    }
  }

  await trackEvent(user.id, "outline_approved", bookId);
  return { ok: true, firstChapterId: firstChapter.id };
}
~~~

## app/(dashboard)/projects/[id]/outline/page.tsx

~~~tsx
import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { OutlinePageContent } from "./_components/outline-page-content";

export default function OutlinePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <OutlinePageContent bookId={params.id} />
    </Suspense>
  );
}
~~~

## app/(dashboard)/projects/[id]/page.tsx

~~~tsx
import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";

import { ProjectEntryContent } from "./_components/project-entry-content";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <ProjectEntryContent bookId={params.id} />
    </Suspense>
  );
}
~~~

## app/(dashboard)/settings/page.tsx

~~~tsx
import { redirect } from "next/navigation";

/** Canonical settings live under `/dashboard/settings` (same layout). */
export default function SettingsAliasPage() {
  redirect("/dashboard/settings");
}
~~~

## app/api/admin/stats/route.ts

~~~ts
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return apiJsonError(
      "Admin access is not configured (set ADMIN_EMAIL).",
      ApiErrorCode.CONFIGURATION,
      503,
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    if (user.email.trim().toLowerCase() !== adminEmail) {
      return apiJsonError("Forbidden.", ApiErrorCode.FORBIDDEN, 403);
    }

    const admin = createAdminClient();

    const { count: totalUsers, error: usersError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (usersError) {
      logServerError("admin-stats.profiles-count", usersError);
      return apiJsonError("Could not load stats.", ApiErrorCode.INTERNAL, 500);
    }

    const { data: booksRows, error: booksError } = await admin.from("books").select("word_count");

    if (booksError) {
      logServerError("admin-stats.books", booksError);
      return apiJsonError("Could not load stats.", ApiErrorCode.INTERNAL, 500);
    }

    const rows = booksRows ?? [];
    const totalBooks = rows.length;
    const totalWords = rows.reduce((acc, r) => acc + (r.word_count ?? 0), 0);

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const { data: dauRows, error: dauError } = await admin
      .from("book_events")
      .select("user_id")
      .gte("created_at", start.toISOString());

    if (dauError) {
      logServerError("admin-stats.dau", dauError);
      return apiJsonError("Could not load stats.", ApiErrorCode.INTERNAL, 500);
    }

    const dailyActiveUsers = new Set((dauRows ?? []).map((r) => r.user_id)).size;

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      totalBooks,
      totalWords,
      dailyActiveUsers,
      asOf: new Date().toISOString(),
    });
  } catch (e) {
    logServerError("admin-stats", e);
    return apiJsonError("Could not load stats.", ApiErrorCode.INTERNAL, 500);
  }
}
~~~

## app/api/ai/chapter-assist/route.ts

~~~ts
import { NextResponse } from "next/server";

import { openai } from "@/lib/openai/client";
import {
  getChapterContinueSystemPrompt,
  getChapterProofreadSystemPrompt,
  getChapterRewriteSystemPrompt,
  getChapterShortenSystemPrompt,
} from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { ChapterAssistRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";

function toneInstruction(tone: "formal" | "casual" | "dramatic"): string {
  switch (tone) {
    case "formal":
      return "Rewrite in a more formal, precise register suitable for serious nonfiction or literary prose. Keep meaning and facts.";
    case "casual":
      return "Rewrite in a warmer, more conversational voice while staying clear and professional. Keep meaning.";
    case "dramatic":
      return "Rewrite with slightly more tension, rhythm, and dramatic emphasis (without melodrama). Keep plot and meaning.";
    default:
      return "Rewrite with improved clarity.";
  }
}

/** Extract a tail excerpt from prior chapters to ground `continue` without exploding the prompt budget. */
function buildContinueContext(
  priorChapters: {
    chapter_number: number;
    title: string;
    content: string | null;
  }[],
): string {
  if (priorChapters.length === 0) return "";
  const pieces: string[] = [];
  for (const c of priorChapters) {
    const body = c.content?.trim();
    if (!body) continue;
    const excerpt = body.length > 800 ? `â€¦${body.slice(-800)}` : body;
    pieces.push(`### Chapter ${c.chapter_number}: ${sanitizeText(c.title)}\n${sanitizeText(excerpt)}`);
  }
  return pieces.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = ChapterAssistRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const body = parsed.data;
    const { bookId, chapterId } = body;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, title, genre, tone")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return apiJsonError("Profile not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select(
        "id, book_id, title, chapter_number, content, target_word_count",
      )
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (
      profile.subscription_tier === "free" &&
      chapter.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
    ) {
      return apiJsonError(
        `Free plan includes AI assist for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro for chapters ${FREE_MAX_CHAPTERS_PER_BOOK + 1}+.`,
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    let system: string;
    let userPrompt: string;

    if (body.action === "continue") {
      const currentContent = chapter.content?.trim() ?? "";
      if (!currentContent) {
        return apiJsonError(
          "Write (or generate) the first paragraph before continuing.",
          ApiErrorCode.VALIDATION_ERROR,
          400,
        );
      }
      const { data: priorRows } = await supabase
        .from("chapters")
        .select("chapter_number, title, content")
        .eq("book_id", bookId)
        .lt("chapter_number", chapter.chapter_number)
        .in("status", ["draft", "edited", "approved"])
        .order("chapter_number", { ascending: true });

      const priorContext = buildContinueContext(priorRows ?? []);
      const target = chapter.target_word_count ?? 2_500;
      system = getChapterContinueSystemPrompt(
        chapter.chapter_number,
        sanitizeText(chapter.title),
        book.genre,
        book.tone,
        target,
      );
      const tail =
        currentContent.length > 4_000
          ? `â€¦${currentContent.slice(-4_000)}`
          : currentContent;
      userPrompt =
        `Book: ${sanitizeText(book.title)}\n\n` +
        (priorContext ? `## Prior chapter excerpts (end of each)\n${priorContext}\n\n` : "") +
        `## Current chapter text so far\n${sanitizeText(tail)}\n\n` +
        `Draft the next paragraphs now. Do not repeat the existing text.`;
    } else {
      const selected = sanitizeText(body.selectedText);
      if (!selected.trim()) {
        return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
      }

      if (body.action === "expand") {
        const authorInstruction = body.prompt ? sanitizeText(body.prompt).slice(0, 2_000) : "";
        system =
          `You are a skilled editor. Expand the author's selected passage with richer sensory detail, motivation, or clarity as fits the context. Stay consistent with genre (${book.genre ?? "general"}) and tone (${book.tone ?? "unspecified"}).` +
          (authorInstruction
            ? ` Follow the author's specific instruction when expanding, while keeping the passage's meaning and voice intact.`
            : "") +
          ` Return ONLY the expanded replacement text â€” no preamble or quotes.`;
        userPrompt =
          `Chapter: ${sanitizeText(chapter.title)}\n\n` +
          (authorInstruction ? `Author instruction:\n${authorInstruction}\n\n` : "") +
          `Passage to expand:\n\n${selected}`;
      } else if (body.action === "rewrite") {
        const instruction = sanitizeText(body.prompt).slice(0, 2_000);
        system = getChapterRewriteSystemPrompt(book.genre, book.tone);
        userPrompt =
          `Chapter: ${sanitizeText(chapter.title)}\n\n` +
          `Author instruction:\n${instruction}\n\n` +
          `Passage to rewrite:\n\n${selected}`;
      } else if (body.action === "shorten") {
        system = getChapterShortenSystemPrompt(book.genre, book.tone);
        userPrompt = `Chapter: ${sanitizeText(chapter.title)}\n\nPassage to shorten:\n\n${selected}`;
      } else if (body.action === "proofread") {
        system = getChapterProofreadSystemPrompt();
        userPrompt = `Chapter: ${sanitizeText(chapter.title)}\n\nPassage to proofread:\n\n${selected}`;
      } else {
        system = `You are a skilled line editor. ${toneInstruction(body.tone)} Return ONLY the rewritten passage â€” no preamble or quotes.`;
        userPrompt = `Chapter: ${sanitizeText(chapter.title)}\n\nBook: ${sanitizeText(book.title)}\n\nPassage to rewrite:\n\n${selected}`;
      }
    }

    let text: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: body.action === "proofread" ? 0.2 : 0.65,
        max_tokens: 4096,
      });
      text = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      logServerError("chapter-assist.openai", e);
      return apiJsonError(
        "The assistant is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    if (!text) {
      return apiJsonError(
        "The assistant returned an empty response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        502,
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    logServerError("chapter-assist", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/expand-outline/route.ts

~~~ts
import { NextResponse } from "next/server";

import { openai } from "@/lib/openai/client";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { ExpandOutlineRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = ExpandOutlineRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, title, genre, tone, refined_idea")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return apiJsonError("Profile not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, book_id, title, chapter_number, outline_summary")
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (
      profile.subscription_tier === "free" &&
      chapter.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
    ) {
      return apiJsonError(
        `Free plan includes AI outline tools for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro for chapters ${FREE_MAX_CHAPTERS_PER_BOOK + 1}+.`,
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    // Gather minimal surrounding context: the immediately previous/next
    // chapters help the model expand consistently without blowing up cost.
    const { data: neighbors } = await supabase
      .from("chapters")
      .select("chapter_number, title, outline_summary")
      .eq("book_id", bookId)
      .in("chapter_number", [chapter.chapter_number - 1, chapter.chapter_number + 1])
      .order("chapter_number", { ascending: true });

    const prior = neighbors?.find((n) => n.chapter_number === chapter.chapter_number - 1);
    const next = neighbors?.find((n) => n.chapter_number === chapter.chapter_number + 1);

    const existingOutline = sanitizeText(chapter.outline_summary ?? "").trim();
    const authorInstruction = parsed.data.prompt
      ? sanitizeText(parsed.data.prompt).slice(0, 2_000).trim()
      : "";

    const system =
      "You are a bestselling author and developmental editor helping expand a single chapter's outline into a richer, more actionable beat sheet. " +
      "Keep the outline focused on THIS chapter only (no scene-by-scene prose, no dialogue, no new plotting for other chapters). " +
      "Produce a clear, author-facing outline: 4â€“8 bullet points covering scene beats, emotional turns, key reveals, character moments, and setting details â€” whatever best fits the genre. " +
      "Preserve everything the existing outline already commits to; deepen and add only what serves it. " +
      "Do not break continuity with adjacent chapters. Return ONLY the expanded outline text â€” no preamble or headings.";

    const contextLines: string[] = [
      `Book: ${sanitizeText(book.title || "Untitled")}`,
      book.genre ? `Genre: ${sanitizeText(book.genre)}` : null,
      book.tone ? `Tone: ${sanitizeText(book.tone)}` : null,
      book.refined_idea ? `Premise: ${sanitizeText(book.refined_idea).slice(0, 2_000)}` : null,
      "",
      `Chapter ${chapter.chapter_number}: ${sanitizeText(chapter.title || "Untitled")}`,
      `Current outline:\n${existingOutline || "(none yet â€” create one from scratch for this chapter)"}`,
    ].filter((l): l is string => l !== null);

    if (prior?.outline_summary?.trim()) {
      contextLines.push(
        "",
        `Previous chapter (${prior.chapter_number}: ${sanitizeText(prior.title || "Untitled")}) outline:\n${sanitizeText(prior.outline_summary).slice(0, 1_500)}`,
      );
    }
    if (next?.outline_summary?.trim()) {
      contextLines.push(
        "",
        `Next chapter (${next.chapter_number}: ${sanitizeText(next.title || "Untitled")}) outline:\n${sanitizeText(next.outline_summary).slice(0, 1_500)}`,
      );
    }
    if (authorInstruction) {
      contextLines.push("", `Author direction for this expansion:\n${authorInstruction}`);
    }

    const userPrompt = contextLines.join("\n");

    let text: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 1_200,
      });
      text = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      logServerError("expand-outline.openai", e);
      return apiJsonError(
        "The outline assistant is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    if (!text) {
      return apiJsonError(
        "The assistant returned an empty response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        502,
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    logServerError("expand-outline", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/generate-about-author/route.ts

~~~ts
import { NextResponse } from "next/server";

import { openai } from "@/lib/openai/client";
import { buildBriefContext } from "@/lib/openai/brief-context";
import { getAboutAuthorPrompt } from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { AboutAuthorRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ABOUT_CHARS = 1500;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = AboutAuthorRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "generate-about-author");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, genre, tone, refined_idea, author_display_name")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, bio, pen_name, location, website, twitter_handle")
      .eq("id", user.id)
      .maybeSingle();

    const title = sanitizeText(book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "");
    const tone = sanitizeText(book.tone?.trim() || "");
    const briefContext = buildBriefContext(book.refined_idea, title, genre);

    const systemPrompt = getAboutAuthorPrompt({
      bookTitle: title,
      genre,
      tone,
      authorDisplayName: sanitizeText(book.author_display_name?.trim() || ""),
      fullName: sanitizeText(profile?.full_name?.trim() || ""),
      penName: sanitizeText(profile?.pen_name?.trim() || ""),
      profileBio: sanitizeText(profile?.bio?.trim() || ""),
      location: sanitizeText(profile?.location?.trim() || ""),
      website: sanitizeText(profile?.website?.trim() || ""),
      twitterHandle: sanitizeText(profile?.twitter_handle?.trim() || ""),
      briefContext,
    });

    let paragraph: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Write the About the Author paragraph now. Plain prose, one paragraph, 60â€“110 words, no markdown.",
          },
        ],
        temperature: 0.6,
        max_tokens: 400,
      });
      paragraph = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      logServerError("generate-about-author.openai", e);
      return apiJsonError(
        "The assistant is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    if (!paragraph) {
      return apiJsonError(
        "The model returned an empty bio.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const cleaned = sanitizeText(paragraph).slice(0, MAX_ABOUT_CHARS);

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-about-author",
      tokens_used: Math.ceil((systemPrompt.length + cleaned.length) / 4),
      model: "gpt-4o",
    });

    return NextResponse.json({ aboutAuthor: cleaned });
  } catch (e) {
    logServerError("generate-about-author", e);
    const devDetail =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? `: ${e.message}`
        : "";
    return apiJsonError(
      `Something went wrong. Please try again.${devDetail}`,
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/generate-back-cover/route.ts

~~~ts
import { NextResponse } from "next/server";

import { openai } from "@/lib/openai/client";
import { buildBriefContext, buildOutlineDigest } from "@/lib/openai/brief-context";
import { getBackCoverPrompt } from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { BackCoverRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BLURB_CHARS = 3000;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = BackCoverRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "generate-back-cover");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, book_type, genre, tone, target_audience, refined_idea")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const bookType = (book.book_type ?? "fiction") as BookTypeDb;
    const title = sanitizeText(book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "");
    const tone = sanitizeText(book.tone?.trim() || "");
    const audience = sanitizeText(book.target_audience?.trim() || "");
    const briefContext = buildBriefContext(book.refined_idea, title, genre);

    const { data: outline } = await supabase
      .from("outlines")
      .select("sections")
      .eq("book_id", bookId)
      .maybeSingle();

    const outlineDigest = buildOutlineDigest(outline?.sections ?? null);

    const systemPrompt = getBackCoverPrompt(
      bookType,
      title,
      genre,
      tone,
      audience,
      briefContext,
      outlineDigest,
    );

    let blurb: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Write the back cover blurb now. Prose only, 150â€“200 words, no headings, no markdown.",
          },
        ],
        temperature: 0.75,
        max_tokens: 600,
      });
      blurb = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      logServerError("generate-back-cover.openai", e);
      return apiJsonError(
        "The assistant is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    if (!blurb) {
      return apiJsonError(
        "The model returned an empty blurb.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const cleaned = sanitizeText(blurb).slice(0, MAX_BLURB_CHARS);

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-back-cover",
      tokens_used: Math.ceil((systemPrompt.length + cleaned.length) / 4),
      model: "gpt-4o",
    });

    return NextResponse.json({ blurb: cleaned });
  } catch (e) {
    logServerError("generate-back-cover", e);
    const devDetail =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? `: ${e.message}`
        : "";
    return apiJsonError(
      `Something went wrong. Please try again.${devDetail}`,
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/generate-book-metadata/route.ts

~~~ts
import { NextResponse } from "next/server";

import { openai } from "@/lib/openai/client";
import { buildBriefContext } from "@/lib/openai/brief-context";
import { getBookMetadataPrompt } from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { BookMetadataRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const METADATA_REGEX = /<METADATA>([\s\S]*?)<\/METADATA>/i;

type MetadataResult = {
  title: string;
  subtitle: string;
  author_tagline: string;
};

function extractMetadata(raw: string): MetadataResult | null {
  const match = raw.match(METADATA_REGEX);
  const blob = match?.[1]?.trim() ?? raw.trim();
  try {
    const parsed = JSON.parse(blob) as Partial<MetadataResult>;
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const subtitle = typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : "";
    const tagline =
      typeof parsed.author_tagline === "string" ? parsed.author_tagline.trim() : "";
    if (!title && !subtitle && !tagline) return null;
    return {
      title: sanitizeText(title).slice(0, 160),
      subtitle: sanitizeText(subtitle).slice(0, 240),
      author_tagline: sanitizeText(tagline).slice(0, 160),
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = BookMetadataRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "generate-book-metadata");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, genre, tone, refined_idea")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const title = sanitizeText(book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "");
    const tone = sanitizeText(book.tone?.trim() || "");
    const briefContext = buildBriefContext(book.refined_idea, title, genre);

    const systemPrompt = getBookMetadataPrompt(title, genre, tone, briefContext);

    let completionText: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Return only the <METADATA>{â€¦}</METADATA> block with valid JSON. Nothing else.",
          },
        ],
        temperature: 0.75,
        max_tokens: 500,
      });
      completionText = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      logServerError("generate-book-metadata.openai", e);
      return apiJsonError(
        "The assistant is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    if (!completionText) {
      return apiJsonError(
        "The model returned an empty response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const result = extractMetadata(completionText);
    if (!result) {
      return apiJsonError(
        "Could not parse metadata from the model response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-book-metadata",
      tokens_used: Math.ceil((systemPrompt.length + completionText.length) / 4),
      model: "gpt-4o",
    });

    return NextResponse.json(result);
  } catch (e) {
    logServerError("generate-book-metadata", e);
    const devDetail =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? `: ${e.message}`
        : "";
    return apiJsonError(
      `Something went wrong. Please try again.${devDetail}`,
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/generate-chapter/route.ts

~~~ts
import { OpenAIStream, StreamingTextResponse } from "ai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { CompletionUsage } from "openai/resources/completions";
import type { Stream } from "openai/streaming";
import { openai } from "@/lib/openai/client";
import { getChapterSystemPrompt } from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { ChapterRequestSchema } from "@/lib/utils/schemas";
import { trackEvent } from "@/lib/utils/analytics";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function inferChapterTargetWords(genre: string | null): number {
  if (!genre) return 2500;
  const g = genre.toLowerCase();
  const nonfictionHints = [
    "nonfiction",
    "non-fiction",
    "memoir",
    "biography",
    "self-help",
    "business",
    "history",
    "essay",
    "reference",
    "technical",
    "how-to",
    "how to",
    "guide",
    "philosophy",
    "science",
    "cookbook",
    "travel",
    "journalism",
    "textbook",
  ];
  const fictionHints = [
    "fiction",
    "novel",
    "fantasy",
    "sci-fi",
    "scifi",
    "science fiction",
    "romance",
    "thriller",
    "mystery",
    "horror",
    "literary",
    "young adult",
    "ya ",
    "drama",
    "adventure",
    "speculative",
    "magic",
    "paranormal",
    "historical fiction",
    "crime",
    "urban fantasy",
    "dystopian",
  ];
  if (nonfictionHints.some((h) => g.includes(h))) return 2000;
  if (fictionHints.some((h) => g.includes(h))) return 3000;
  return 2500;
}

function buildBookContext(params: {
  title: string;
  genre: string | null;
  tone: string | null;
  refinedIdea: string | null;
  chapterOutline: string | null;
  chapterTitle: string;
  authorNotes: string | null;
}): string {
  const title = sanitizeText(params.title.trim() || "Untitled");
  const genre = params.genre ? sanitizeText(params.genre) : null;
  const tone = params.tone ? sanitizeText(params.tone) : null;
  const refined = params.refinedIdea?.trim()
    ? sanitizeText(params.refinedIdea.trim())
    : null;
  const chapterTitle = sanitizeText(params.chapterTitle.trim() || "Untitled");
  const outlineRaw =
    params.chapterOutline?.trim() ||
    "No outline summary supplied; infer from book context.";
  const outline = sanitizeText(outlineRaw);
  // Author-provided steering notes override or refine outline intent. Cap
  // size so a single chapter's notes can't dominate the prompt budget.
  const authorNotes = params.authorNotes?.trim()
    ? sanitizeText(params.authorNotes.trim()).slice(0, 4_000)
    : null;
  const lines = [
    `Book title: ${title}`,
    genre ? `Genre: ${genre}` : null,
    tone ? `Tone: ${tone}` : null,
    refined ? `Refined brief / positioning:\n${refined}` : null,
    "",
    `Current chapter: ${chapterTitle}`,
    `Chapter outline (follow closely):\n${outline}`,
    authorNotes
      ? `\nAuthor steering notes (these take precedence when they conflict with the outline; obey them unless they violate the book's tone or continuity):\n${authorNotes}`
      : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function summarizePriorChapter(row: {
  title: string;
  outline_summary: string | null;
  content: string | null;
}): string {
  const title = sanitizeText(row.title.trim() || "Untitled");
  const outline = row.outline_summary?.trim();
  if (outline) {
    return `### ${title}\n${sanitizeText(outline)}`;
  }
  const body = row.content?.trim();
  if (body) {
    const excerpt = sanitizeText(body.slice(0, 1200));
    return `### ${title}\nSummary (excerpt from manuscript): ${excerpt}${body.length > 1200 ? "â€¦" : ""}`;
  }
  return `### ${title}\n(No outline or draft text on file.)`;
}

async function* streamWithUsageCapture(
  stream: Stream<ChatCompletionChunk>,
  onUsage: (usage: CompletionUsage) => void,
): AsyncIterable<ChatCompletionChunk> {
  for await (const chunk of stream) {
    if (chunk.usage) {
      onUsage(chunk.usage);
    }
    yield chunk;
  }
}

async function* guardedChapterStream(
  completionStream: Stream<ChatCompletionChunk>,
  onUsage: (usage: CompletionUsage) => void,
  onStreamError: () => Promise<void>,
): AsyncIterable<ChatCompletionChunk> {
  try {
    yield* streamWithUsageCapture(completionStream, onUsage);
  } catch {
    await onStreamError();
    throw new Error("Stream interrupted.");
  }
}

export async function POST(request: Request) {
  let chapterIdForRevert: string | null = null;
  let bookIdForRevert: string | null = null;
  let shouldRevertOnStreamError = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = ChapterRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterId } = parsed.data;
    chapterIdForRevert = chapterId;
    bookIdForRevert = bookId;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "generate-chapter");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, title, genre, tone, refined_idea, book_type")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return apiJsonError("Profile not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select(
        "id, book_id, title, outline_summary, author_notes, chapter_number, status, target_word_count",
      )
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (
      profile.subscription_tier === "free" &&
      chapter.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
    ) {
      return apiJsonError(
        `Free plan includes AI generation for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro to generate chapter ${chapter.chapter_number} and beyond.`,
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    const { data: priorRows, error: priorError } = await supabase
      .from("chapters")
      .select("chapter_number, title, outline_summary, content, status")
      .eq("book_id", bookId)
      .lt("chapter_number", chapter.chapter_number)
      .in("status", ["draft", "edited", "approved"])
      .order("chapter_number", { ascending: true });

    if (priorError) {
      logServerError("generate-chapter.prior-chapters", priorError);
      return apiJsonError(
        "Could not load prior chapters.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    const priorSummaries = (priorRows ?? []).map(summarizePriorChapter);

    // Prefer the author-set per-chapter target, fall back to the genre default.
    const targetWords =
      chapter.target_word_count && chapter.target_word_count > 0
        ? chapter.target_word_count
        : inferChapterTargetWords(book.genre);
    const bookContext = buildBookContext({
      title: book.title,
      genre: book.genre,
      tone: book.tone,
      refinedIdea: book.refined_idea,
      chapterOutline: chapter.outline_summary,
      chapterTitle: chapter.title,
      authorNotes: chapter.author_notes,
    });

    const bookType = (book.book_type ?? "fiction") as BookTypeDb;

    const systemPrompt = getChapterSystemPrompt(
      chapter.chapter_number,
      chapter.title,
      targetWords,
      bookContext,
      priorSummaries,
      bookType,
    );

    const userMessage = `Write the complete chapter now. Target approximately ${targetWords} words.`;

    const { error: statusError } = await supabase
      .from("chapters")
      .update({ status: "generating" })
      .eq("id", chapterId)
      .eq("book_id", bookId);

    if (statusError) {
      logServerError("generate-chapter.status-update", statusError);
      return apiJsonError(
        "Could not start generation.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    shouldRevertOnStreamError = true;

    let lastUsage: CompletionUsage | undefined;

    let completionStream: Stream<ChatCompletionChunk>;
    try {
      completionStream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0.75,
      });
    } catch {
      const sb = await createClient();
      await sb
        .from("chapters")
        .update({ status: "pending" })
        .eq("id", chapterId)
        .eq("book_id", bookId);
      shouldRevertOnStreamError = false;
      return apiJsonError(
        "The writing assistant is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const revertChapterPending = async () => {
      if (!chapterIdForRevert || !bookIdForRevert) return;
      const sb = await createClient();
      await sb
        .from("chapters")
        .update({ status: "pending" })
        .eq("id", chapterIdForRevert)
        .eq("book_id", bookIdForRevert);
    };

    const stream = OpenAIStream(
      guardedChapterStream(completionStream, (u) => {
        lastUsage = u;
      }, revertChapterPending) as never,
      {
        onFinal: async (completion) => {
          shouldRevertOnStreamError = false;
          try {
            const sb = await createClient();
            const trimmed = completion.trim();
            if (!trimmed) {
              await sb
                .from("chapters")
                .update({ status: "pending" })
                .eq("id", chapterId)
                .eq("book_id", bookId);
              return;
            }

            const words = countWords(trimmed);

            const { data: freshChapter, error: freshErr } = await sb
              .from("chapters")
              .select("generation_count")
              .eq("id", chapterId)
              .eq("book_id", bookId)
              .single();

            if (freshErr || !freshChapter) {
              await sb
                .from("chapters")
                .update({ status: "pending" })
                .eq("id", chapterId)
                .eq("book_id", bookId);
              return;
            }

            const nextGen = (freshChapter.generation_count ?? 0) + 1;

            const { error: chapterUpdateError } = await sb
              .from("chapters")
              .update({
                content: trimmed,
                status: "draft",
                word_count: words,
                generation_count: nextGen,
              })
              .eq("id", chapterId)
              .eq("book_id", bookId);

            if (chapterUpdateError) {
              await sb
                .from("chapters")
                .update({ status: "pending" })
                .eq("id", chapterId)
                .eq("book_id", bookId);
              return;
            }

            const { data: allChapters, error: sumError } = await sb
              .from("chapters")
              .select("word_count")
              .eq("book_id", bookId);

            if (!sumError && allChapters) {
              const totalWords = allChapters.reduce(
                (acc, row) => acc + (row.word_count ?? 0),
                0,
              );
              await sb
                .from("books")
                .update({ word_count: totalWords })
                .eq("id", bookId)
                .eq("user_id", user.id);
            }

            const tokensUsed =
              lastUsage?.total_tokens ??
              estimateTokensFromText(systemPrompt) +
                estimateTokensFromText(userMessage) +
                estimateTokensFromText(trimmed);

            await sb.from("api_usage").insert({
              user_id: user.id,
              route: "/api/ai/generate-chapter",
              tokens_used: tokensUsed,
              model: "gpt-4o",
            });

            await trackEvent(user.id, "chapter_generated", bookId, {
              chapterId,
              words,
            });
          } catch {
            /* Stream already delivered */
          }
        },
      }
    );

    return new StreamingTextResponse(stream, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    logServerError("generate-chapter", e);
    if (shouldRevertOnStreamError && chapterIdForRevert && bookIdForRevert) {
      try {
        const sb = await createClient();
        await sb
          .from("chapters")
          .update({ status: "pending" })
          .eq("id", chapterIdForRevert)
          .eq("book_id", bookIdForRevert);
      } catch {
        /* best effort */
      }
    }
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/generate-cover/route.ts

~~~ts
import { NextResponse } from "next/server";

import { openai } from "@/lib/openai/client";
import { getCoverPromptSystemPrompt } from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { CoverRequestSchema } from "@/lib/utils/schemas";
import { trackEvent } from "@/lib/utils/analytics";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DALLE_MAX_PROMPT = 4000;

function premiseForCover(refinedIdea: string | null): string {
  if (!refinedIdea?.trim()) {
    return "A commercially viable book with broad reader appeal.";
  }
  try {
    const o = JSON.parse(refinedIdea) as Record<string, unknown>;
    const p = o.core_premise ?? o.premise ?? o.title ?? o.suggested_title;
    if (typeof p === "string" && p.trim()) {
      return sanitizeText(p.trim().slice(0, 1500));
    }
  } catch {
    /* use raw text */
  }
  return sanitizeText(refinedIdea.trim().slice(0, 1500));
}

function clampPrompt(text: string): string {
  const t = text.trim();
  if (t.length <= DALLE_MAX_PROMPT) return t;
  return t.slice(0, DALLE_MAX_PROMPT);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = CoverRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, customPrompt: rawCustom } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "generate-cover");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const customPrompt =
      rawCustom !== undefined ? sanitizeText(rawCustom) : undefined;
    if (rawCustom !== undefined && !customPrompt?.trim()) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, subtitle, author_display_name, genre, refined_idea, tone",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const title = sanitizeText(book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "General fiction");
    const tone = sanitizeText(book.tone?.trim() || "Engaging and readable");
    const premise = premiseForCover(book.refined_idea);
    const subtitle = book.subtitle?.trim() ? sanitizeText(book.subtitle.trim()) : "";
    const authorDisplayName = book.author_display_name?.trim()
      ? sanitizeText(book.author_display_name.trim())
      : "";

    let imagePrompt: string;
    if (customPrompt !== undefined) {
      imagePrompt = clampPrompt(customPrompt);
    } else {
      const systemPrompt = getCoverPromptSystemPrompt(
        title,
        genre,
        premise,
        tone,
        subtitle,
        authorDisplayName,
      );
      let metaText: string;
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                "Write the single DALL-E 3 image prompt only. No quotes, no preamble, no markdown.",
            },
          ],
          temperature: 0.75,
          max_tokens: 1200,
        });
        metaText = completion.choices[0]?.message?.content?.trim() ?? "";
      } catch (e) {
        logServerError("generate-cover.meta-prompt", e);
        return apiJsonError(
          "Could not prepare the cover prompt. Try again.",
          ApiErrorCode.UPSTREAM,
          502,
        );
      }
      if (!metaText) {
        return apiJsonError(
          "The model returned an empty cover prompt.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }
      imagePrompt = clampPrompt(metaText.replace(/^["']|["']$/g, ""));
    }

    /* Reinforce KDP-style flat artwork + required text for every request (including custom prompts). */
    const textRequirements: string[] = [
      `the title "${title}" rendered as the largest, dominant typography`,
    ];
    if (subtitle) {
      textRequirements.push(
        `the subtitle "${subtitle}" in smaller type directly below the title`,
      );
    }
    if (authorDisplayName) {
      textRequirements.push(
        `the author by-line "${authorDisplayName}" in the smallest type, placed where author names traditionally sit on a book cover`,
      );
    }
    const textSentence = `The image MUST include ${textRequirements.join(
      ", and ",
    )}, all spelled exactly as written and clearly legible. Do not add any other text (no taglines, reviews, series labels, logos, or barcodes).`;

    imagePrompt = clampPrompt(
      `${imagePrompt.trim()} ${textSentence} Flat 2D full-bleed front-cover artwork only â€” the entire image IS the cover. No 3D book, no paperback or hardcover mockup, no spine, no back cover, no device, no hands, no bookshelf, no photograph of a physical book.`,
    );

    let imageUrlRemote: string;
    let revisedFromApi: string | undefined;
    try {
      const img = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1792",
        quality: "hd",
        /* "natural" tends to reduce glossy illustrative mockup / product-shot looks vs vivid */
        style: "natural",
      });
      const first = img.data?.[0];
      imageUrlRemote = first?.url ?? "";
      revisedFromApi = first?.revised_prompt ?? undefined;
    } catch (e) {
      logServerError("generate-cover.dalle", e);
      return apiJsonError(
        "Image generation failed. Try a different prompt or try again later.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    if (!imageUrlRemote) {
      return apiJsonError(
        "Image generation did not return a usable URL.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        502,
      );
    }

    let imageBuffer: ArrayBuffer;
    try {
      const imgRes = await fetch(imageUrlRemote);
      if (!imgRes.ok) {
        return apiJsonError(
          "Could not download generated image.",
          ApiErrorCode.UPSTREAM,
          502,
        );
      }
      imageBuffer = await imgRes.arrayBuffer();
    } catch (e) {
      logServerError("generate-cover.fetch-image", e);
      return apiJsonError(
        "Could not download generated image.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const storagePath = `${user.id}/${bookId}/cover.png`;

    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(storagePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      logServerError("generate-cover.storage-upload", uploadError);
      return apiJsonError(
        "Could not upload cover to storage.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("covers").getPublicUrl(storagePath);

    const storedPrompt = revisedFromApi?.trim() || imagePrompt;

    const { error: updateError } = await supabase
      .from("books")
      .update({
        cover_url: publicUrl,
        cover_prompt: storedPrompt,
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    if (updateError) {
      logServerError("generate-cover.book-update", updateError);
      return apiJsonError(
        "Could not save cover metadata.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-cover",
      tokens_used: Math.ceil((imagePrompt.length + 500) / 4),
      model: "dall-e-3",
    });

    await trackEvent(user.id, "cover_generated", bookId);

    return NextResponse.json({
      coverUrl: publicUrl,
      prompt: storedPrompt,
    });
  } catch (e) {
    logServerError("generate-cover", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/generate-outline/route.ts

~~~ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { openai } from "@/lib/openai/client";
import { getOutlineSystemPrompt } from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { OutlineRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const chapterSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
});

const outlineResponseSchema = z.object({
  chapters: z.array(chapterSchema).min(1).max(40),
});

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = t.match(fence);
  if (m?.[1]) return m[1].trim();
  return t;
}

function normalizeSections(
  chapters: z.infer<typeof outlineResponseSchema>["chapters"],
): { number: number; title: string; description: string }[] {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  return sorted.map((c, index) => ({
    number: index + 1,
    title: c.title.trim(),
    description: c.description.trim(),
  }));
}

type RefinedBriefShape = {
  title?: unknown;
  suggested_title?: unknown;
  subtitle?: unknown;
  genre?: unknown;
  target_audience?: unknown;
  audience?: unknown;
  core_premise?: unknown;
  premise?: unknown;
  tone?: unknown;
  tone_and_style?: unknown;
  key_themes?: unknown;
  themes?: unknown;
};

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

function extractBookColumnsFromRefined(jsonStr: string): {
  title: string | null;
  subtitle: string | null;
  genre: string | null;
  target_audience: string | null;
  tone: string | null;
} {
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { title: null, subtitle: null, genre: null, target_audience: null, tone: null };
    }
    const b = parsed as RefinedBriefShape;
    return {
      title: pickString(b.title, b.suggested_title),
      subtitle: pickString(b.subtitle),
      genre: pickString(b.genre),
      target_audience: pickString(b.target_audience, b.audience),
      tone: pickString(b.tone, b.tone_and_style),
    };
  } catch {
    return { title: null, subtitle: null, genre: null, target_audience: null, tone: null };
  }
}

function renderConversationTranscript(
  conversation: { role: "user" | "assistant"; content: string }[] | undefined,
): string {
  if (!conversation || conversation.length === 0) return "";
  return conversation
    .map((m) => {
      const speaker = m.role === "user" ? "Author" : "Editor";
      return `${speaker}: ${sanitizeText(m.content).trim()}`;
    })
    .filter((line) => line.length > `Author: `.length)
    .join("\n\n");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = OutlineRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const {
      bookId,
      rawIdea: rawIdeaIn,
      refinedIdeaOverride: refinedIn,
      conversation: conversationIn,
    } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rawIdea = rawIdeaIn !== undefined ? sanitizeText(rawIdeaIn) : undefined;
    const refinedIdeaOverride =
      refinedIn !== undefined ? sanitizeText(refinedIn) : undefined;

    if (rawIdea !== undefined && rawIdea.trim().length > 0) {
      const { error: rawUpdateError } = await supabase
        .from("books")
        .update({ raw_idea: rawIdea.trim() })
        .eq("id", bookId)
        .eq("user_id", user.id);
      if (rawUpdateError) {
        logServerError("generate-outline.raw-idea", rawUpdateError);
        return apiJsonError("Could not save concept.", ApiErrorCode.INTERNAL, 500);
      }
    }

    if (
      refinedIdeaOverride !== undefined &&
      refinedIdeaOverride.trim().length > 0
    ) {
      const trimmedRefined = refinedIdeaOverride.trim();
      const cols = extractBookColumnsFromRefined(trimmedRefined);
      const refinedUpdate: {
        refined_idea: string;
        status: "refining";
        title?: string;
        subtitle?: string | null;
        genre?: string | null;
        target_audience?: string | null;
        tone?: string | null;
      } = {
        refined_idea: trimmedRefined,
        status: "refining",
      };
      if (cols.title) refinedUpdate.title = cols.title;
      if (cols.subtitle !== null) refinedUpdate.subtitle = cols.subtitle;
      if (cols.genre !== null) refinedUpdate.genre = cols.genre;
      if (cols.target_audience !== null) refinedUpdate.target_audience = cols.target_audience;
      if (cols.tone !== null) refinedUpdate.tone = cols.tone;

      const { error: refinedUpdateError } = await supabase
        .from("books")
        .update(refinedUpdate)
        .eq("id", bookId)
        .eq("user_id", user.id);
      if (refinedUpdateError) {
        logServerError("generate-outline.refined-idea", refinedUpdateError);
        return apiJsonError("Could not save refined idea.", ApiErrorCode.INTERNAL, 500);
      }
    }

    const { data: bookFresh, error: refetchError } = await supabase
      .from("books")
      .select("refined_idea, raw_idea, title")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (refetchError || !bookFresh) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const briefRaw =
      bookFresh.refined_idea?.trim() ||
      bookFresh.raw_idea?.trim() ||
      (bookFresh.title?.trim() && bookFresh.title.trim() !== "Untitled Book"
        ? `Working title: ${bookFresh.title.trim()}`
        : "");
    const brief = sanitizeText(briefRaw);

    if (!brief) {
      return apiJsonError(
        "Add a refined idea or paste a concept before generating an outline.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const systemPrompt = getOutlineSystemPrompt();
    const transcript = renderConversationTranscript(conversationIn);
    const transcriptBlock =
      transcript.length > 0
        ? `\n\n## Full refinement chat transcript (for extra nuance; the brief above is authoritative)\n${transcript}`
        : "";
    const userContent = `Book brief (structured JSON and/or prose):\n${brief}${transcriptBlock}`;

    let completionText: string;
    let tokensUsed = 0;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const usage = completion.usage;
      tokensUsed =
        usage?.total_tokens ??
        Math.ceil((systemPrompt.length + userContent.length) / 4);

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        return apiJsonError(
          "The model returned an empty outline.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          502,
        );
      }
      completionText = stripJsonFence(raw);
    } catch (err: unknown) {
      logServerError("generate-outline.openai", err);
      return apiJsonError(
        "The outline generator is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    let parsedOutline: z.infer<typeof outlineResponseSchema>;
    try {
      const obj = JSON.parse(completionText) as unknown;
      const zResult = outlineResponseSchema.safeParse(obj);
      if (!zResult.success) {
        logServerError("generate-outline.parse-zod", zResult.error);
        return apiJsonError(
          "Could not parse outline from the model.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }
      parsedOutline = zResult.data;
    } catch {
      return apiJsonError(
        "Could not parse outline JSON from the model.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const sections = normalizeSections(parsedOutline.chapters);
    const sectionsJson = sections as unknown as Json;

    const { data: upserted, error: upsertError } = await supabase
      .from("outlines")
      .upsert(
        {
          book_id: bookId,
          sections: sectionsJson,
          approved: false,
        },
        { onConflict: "book_id" },
      )
      .select("id, sections")
      .single();

    if (upsertError || !upserted) {
      logServerError("generate-outline.upsert", upsertError);
      return apiJsonError("Could not save outline.", ApiErrorCode.INTERNAL, 500);
    }

    const { error: deleteChaptersError } = await supabase
      .from("chapters")
      .delete()
      .eq("book_id", bookId);

    if (deleteChaptersError) {
      logServerError("generate-outline.delete-chapters", deleteChaptersError);
      return apiJsonError("Could not reset chapters.", ApiErrorCode.INTERNAL, 500);
    }

    const chapterRows = sections.map((s) => ({
      book_id: bookId,
      chapter_number: s.number,
      title: s.title,
      outline_summary: s.description,
      status: "pending" as const,
    }));

    const { error: insertChaptersError } = await supabase.from("chapters").insert(chapterRows);

    if (insertChaptersError) {
      logServerError("generate-outline.insert-chapters", insertChaptersError);
      return apiJsonError("Could not create chapter rows.", ApiErrorCode.INTERNAL, 500);
    }

    const { error: bookUpdateError } = await supabase
      .from("books")
      .update({
        status: "outlining",
        chapter_count: sections.length,
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    if (bookUpdateError) {
      logServerError("generate-outline.book-update", bookUpdateError);
      return apiJsonError("Could not update book.", ApiErrorCode.INTERNAL, 500);
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-outline",
      tokens_used: tokensUsed,
      model: "gpt-4o",
    });

    return NextResponse.json({
      ok: true,
      outlineId: upserted.id,
      sections,
    });
  } catch (e) {
    logServerError("generate-outline", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/generate-subtitle/route.ts

~~~ts
import { NextResponse } from "next/server";

import { openai } from "@/lib/openai/client";
import { getSubtitlePrompt } from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { sanitizeText } from "@/lib/utils/sanitize";
import { SubtitleRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Upper bound so the model can't return a paragraph dressed up as a subtitle. */
const MAX_SUBTITLE_CHARS = 140;

function cleanSubtitle(raw: string): string {
  if (!raw) return "";
  // Take the first non-empty line â€” the model occasionally prefixes with
  // "Subtitle:" or wraps the output in quotes; strip both.
  const firstLine = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "";

  let out = firstLine.replace(/^["'â€œâ€â€˜â€™]+|["'â€œâ€â€˜â€™]+$/g, "").trim();
  out = out.replace(/^subtitle\s*[:\-â€”]\s*/i, "");
  out = sanitizeText(out);
  // Collapse internal whitespace and drop any trailing sentence-ending
  // punctuation so the field reads like a real retail subtitle.
  out = out.replace(/\s+/g, " ").replace(/[.!?,;:]+$/g, "").trim();
  return out.slice(0, MAX_SUBTITLE_CHARS);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = SubtitleRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, brief } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "generate-subtitle");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const systemPrompt = getSubtitlePrompt({
      title: sanitizeText(brief.title),
      genre: brief.genre ? sanitizeText(brief.genre) : null,
      tone: brief.tone ? sanitizeText(brief.tone) : null,
      audience: brief.audience ? sanitizeText(brief.audience) : null,
      premise: brief.premise ? sanitizeText(brief.premise) : null,
      themes: brief.themes ? sanitizeText(brief.themes) : null,
    });

    let completionText: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Write the subtitle. Reply with a single line, no quotes, no prefix.",
          },
        ],
        temperature: 0.8,
        max_tokens: 80,
      });
      completionText = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      logServerError("generate-subtitle.openai", e);
      return apiJsonError(
        "The assistant is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const subtitle = cleanSubtitle(completionText);
    if (!subtitle) {
      return apiJsonError(
        "The model returned an empty subtitle. Try again.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-subtitle",
      tokens_used: Math.ceil((systemPrompt.length + completionText.length) / 4),
      model: "gpt-4o",
    });

    return NextResponse.json({ subtitle });
  } catch (e) {
    logServerError("generate-subtitle", e);
    const devDetail =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? `: ${e.message}`
        : "";
    return apiJsonError(
      `Something went wrong. Please try again.${devDetail}`,
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/ai/refine-idea/route.ts

~~~ts
import { OpenAIStream, StreamingTextResponse } from "ai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { CompletionUsage } from "openai/resources/completions";
import type { Stream } from "openai/streaming";
import { openai } from "@/lib/openai/client";
import { getIdeaRefinementSystemPrompt } from "@/lib/openai/prompts";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { RefinementRequestSchema } from "@/lib/utils/schemas";
import { trackEvent } from "@/lib/utils/analytics";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

const REFINED_IDEA_REGEX = /<REFINED_IDEA>([\s\S]*?)<\/REFINED_IDEA>/i;

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

async function* streamWithUsageCapture(
  stream: Stream<ChatCompletionChunk>,
  onUsage: (usage: CompletionUsage) => void,
): AsyncIterable<ChatCompletionChunk> {
  for await (const chunk of stream) {
    if (chunk.usage) {
      onUsage(chunk.usage);
    }
    yield chunk;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = RefinementRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, messages, userMessage: rawUserMessage } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "refine-idea");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const userMessage = sanitizeText(rawUserMessage);
    if (!userMessage.trim()) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }
    const history = [
      ...messages.map((m) => ({
        role: m.role,
        content: sanitizeText(m.content),
      })),
      { role: "user" as const, content: userMessage },
    ];

    const systemPrompt = getIdeaRefinementSystemPrompt();
    const openaiMessages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    let lastUsage: CompletionUsage | undefined;

    let completionStream: Stream<ChatCompletionChunk>;
    try {
      completionStream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: openaiMessages,
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0.7,
      });
    } catch (err: unknown) {
      logServerError("refine-idea.openai", err);
      return apiJsonError(
        "The writing assistant is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const wrapped = streamWithUsageCapture(completionStream, (u) => {
      lastUsage = u;
    });

    /* `ai` OpenAIStream expects a slightly older ChatCompletionChunk shape than openai@4 â€” runtime is compatible. */
    const stream = OpenAIStream(wrapped as never, {
      onFinal: async (completion) => {
        try {
          const sb = await createClient();
          const assistantMessage = {
            role: "assistant" as const,
            content: completion,
          };
          const nextConversation = [...history, assistantMessage];

          const match = completion.match(REFINED_IDEA_REGEX);
          let refinedPayload: string | null = null;
          if (match?.[1]) {
            const inner = match[1].trim();
            try {
              const parsedJson = JSON.parse(inner) as unknown;
              refinedPayload = JSON.stringify(parsedJson);
            } catch {
              refinedPayload = null;
            }
          }

          const update: {
            idea_conversation: Json;
            refined_idea?: string | null;
            status?: "refining";
          } = {
            idea_conversation: nextConversation as unknown as Json,
          };

          if (refinedPayload) {
            update.refined_idea = refinedPayload;
            update.status = "refining";
          }

          const { error: updateError } = await sb
            .from("books")
            .update(update)
            .eq("id", bookId)
            .eq("user_id", user.id);

          if (updateError) {
            return;
          }

          const tokensUsed =
            lastUsage?.total_tokens ??
            estimateTokensFromText(systemPrompt) +
              estimateTokensFromText(
                history.map((m) => m.content).join("\n"),
              ) +
              estimateTokensFromText(completion);

          await sb.from("api_usage").insert({
            user_id: user.id,
            route: "/api/ai/refine-idea",
            tokens_used: tokensUsed,
            model: "gpt-4o",
          });

          if (refinedPayload) {
            await trackEvent(user.id, "idea_refined", bookId, {
              hasStructuredRefinement: true,
            });
          }
        } catch {
          /* Response already streamed; swallow post-stream errors */
        }
      },
    });

    return new StreamingTextResponse(stream, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    logServerError("refine-idea", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/compile-book/route.ts

~~~ts
import { NextResponse } from "next/server";

import { compileBookToDocx } from "@/lib/docx/compiler";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { CompileRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function downloadBasename(title: string | null | undefined): string {
  const raw = (title ?? "book").trim().slice(0, 80);
  const ascii = raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  const base = ascii.length > 0 ? ascii : "book";
  return `${base}.docx`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = CompileRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, trimSize } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, title")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    let docxBuffer: Buffer;
    try {
      docxBuffer = await compileBookToDocx(bookId, user.id, { trimSize });
    } catch (e) {
      logServerError("compile-book.compilation", e);
      const message = e instanceof Error ? e.message : "";
      if (message.includes("not found") || message.includes("access denied")) {
        return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
      }
      return apiJsonError(
        "We could not compile your manuscript.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    await trackEvent(user.id, "book_compiled", bookId);

    const filename = downloadBasename(book.title);
    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logServerError("compile-book", err);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/export-kdp-pack/route.ts

~~~ts
import { NextResponse } from "next/server";

import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { buildKdpPackZip } from "@/lib/kdp/build-kdp-pack-zip";
import { formatKdpListingMarkdown } from "@/lib/kdp/format-listing-markdown";
import {
  type KdpBookContext,
  generateKdpListingPayload,
} from "@/lib/kdp/generate-kdp-listing";
import { summarizeOutlineSections } from "@/lib/kdp/outline-summary";
import { getStaticKdpWalkthroughMarkdown } from "@/lib/kdp/walkthrough-markdown";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { KdpPackRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function zipBasename(title: string | null | undefined): string {
  const raw = (title ?? "book").trim().slice(0, 72);
  const ascii = raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  const base = ascii.length > 0 ? ascii : "book";
  return `${base}-KDP-Pack.zip`;
}

const README = `ChapterAI â€” KDP listing pack
=============================

This ZIP contains:

1. README.txt (this file)
2. KDP-Listing-Metadata.md â€” AI-assisted title/subtitle ideas, description, 7 keywords,
   About the author (2 sentences), back-of-book copy for paperback, and category hints.
3. KDP-Signup-Publish-Walkthrough.md â€” step-by-step KDP signup and publishing checklist.

Your manuscript (.docx) is downloaded separately from the Export page ("Compile & Download Book").

Edit all listing copy before publishing. You are responsible for accuracy and compliance with Amazon KDP.

https://kdp.amazon.com
`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = KdpPackRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, genre, target_audience, tone, raw_idea, refined_idea, word_count, chapter_count",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const [{ data: profile }, { data: outline }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("outlines").select("sections").eq("book_id", bookId).maybeSingle(),
    ]);

    const authorDisplayName =
      profile?.full_name?.trim() ||
      profile?.email?.split("@")[0]?.trim() ||
      "the author";

    const title = book.title?.trim() || "Untitled";
    const genre = book.genre?.trim() || "General fiction";

    const ctx: KdpBookContext = {
      title,
      genre,
      refinedIdea: book.refined_idea,
      rawIdea: book.raw_idea,
      targetAudience: book.target_audience,
      tone: book.tone,
      wordCount: book.word_count,
      chapterCount: book.chapter_count,
      outlineSummary: summarizeOutlineSections(outline?.sections ?? []),
      authorDisplayName,
    };

    let listingPayload;
    try {
      listingPayload = await generateKdpListingPayload(ctx);
    } catch (err) {
      logServerError("export-kdp-pack.openai", err);
      return apiJsonError(
        "Could not generate KDP listing copy. Check your OpenAI configuration and try again.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const listingMd = formatKdpListingMarkdown(title, listingPayload);
    const walkthroughMd = getStaticKdpWalkthroughMarkdown();

    let zipBuffer: Buffer;
    try {
      zipBuffer = await buildKdpPackZip([
        { path: "README.txt", content: README },
        { path: "KDP-Listing-Metadata.md", content: listingMd },
        { path: "KDP-Signup-Publish-Walkthrough.md", content: walkthroughMd },
      ]);
    } catch (err) {
      logServerError("export-kdp-pack.zip", err);
      return apiJsonError(
        "Could not build the download package.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    try {
      await supabase
        .from("books")
        .update({ kdp_instructions: listingMd })
        .eq("id", bookId)
        .eq("user_id", user.id);
    } catch (err) {
      logServerError("export-kdp-pack.kdp_instructions", err);
    }

    await trackEvent(user.id, "kdp_pack_downloaded", bookId);

    const filename = zipBasename(book.title);
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logServerError("export-kdp-pack", err);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/stripe/create-checkout/route.ts

~~~ts
import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import { apiJsonError, ApiErrorCode } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

function priceId(): string | null {
  return (
    process.env.STRIPE_PRO_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ??
    null
  );
}

function appOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return raw && raw.length > 0 ? raw : null;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    const pid = priceId();
    const origin = appOrigin();
    if (!pid || !origin) {
      return apiJsonError(
        "Checkout is not configured yet.",
        ApiErrorCode.CONFIGURATION,
        503,
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return apiJsonError("Profile not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: pid, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/dashboard`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : {
            customer_email: profile.email?.trim() || user.email || undefined,
          }),
    });

    if (!session.url) {
      return apiJsonError(
        "Could not start checkout.",
        ApiErrorCode.CHECKOUT_FAILED,
        500,
      );
    }

    await trackEvent(user.id, "upgrade_clicked", null, { checkout: "pro" });

    return NextResponse.json({ url: session.url });
  } catch {
    return apiJsonError(
      "Could not start checkout.",
      ApiErrorCode.CHECKOUT_FAILED,
      500,
    );
  }
}
~~~

## app/api/stripe/portal/route.ts

~~~ts
import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

function appOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return raw && raw.length > 0 ? raw : null;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return apiJsonError(
        "No billing account on file. Subscribe first.",
        ApiErrorCode.NOT_FOUND,
        400,
      );
    }

    const origin = appOrigin();
    if (!origin) {
      return apiJsonError(
        "App URL is not configured.",
        ApiErrorCode.CONFIGURATION,
        503,
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return apiJsonError(
      "Could not open billing portal.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/stripe/subscription-status/route.ts

~~~ts
import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return apiJsonError("Profile not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (profile.subscription_tier !== "pro" || !profile.stripe_customer_id) {
      return NextResponse.json({
        tier: profile.subscription_tier,
        renewsAt: null as string | null,
        cancelAtPeriodEnd: false,
      });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return apiJsonError(
        "Billing is not configured yet.",
        ApiErrorCode.CONFIGURATION,
        503,
      );
    }

    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 10,
    });

    const active = subs.data.find(
      (s) => s.status === "active" || s.status === "trialing" || s.status === "past_due",
    );

    if (!active) {
      return NextResponse.json({
        tier: profile.subscription_tier,
        renewsAt: null as string | null,
        cancelAtPeriodEnd: false,
      });
    }

    const renewsAt = new Date(active.current_period_end * 1000).toISOString();

    return NextResponse.json({
      tier: "pro" as const,
      renewsAt,
      cancelAtPeriodEnd: active.cancel_at_period_end,
    });
  } catch (e) {
    logServerError("subscription-status", e);
    return apiJsonError(
      "Could not load subscription details.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## app/api/webhooks/stripe/route.ts

~~~ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEventAdmin } from "@/lib/utils/analytics";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import type { SubscriptionTierDb } from "@/types/database.types";

export const dynamic = "force-dynamic";

/** Stripe webhook: no end-user session â€” uses {@link createAdminClient} for profile updates only. */

function tierFromSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionTierDb {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "paused"
  ) {
    return "pro";
  }
  return "free";
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id ?? session.client_reference_id ?? null;
  if (!userId) {
    return;
  }

  const cust = session.customer;
  if (!cust) {
    return;
  }
  if (typeof cust === "object" && "deleted" in cust && cust.deleted) {
    return;
  }
  const customerId = typeof cust === "string" ? cust : cust.id;

  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  if (!paid) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "pro",
      stripe_customer_id: customerId,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Profile update failed: ${error.message}`);
  }

  await trackEventAdmin(userId, "subscription_started", null, {
    customerId,
    sessionId: session.id,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_tier: "free" })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Profile downgrade failed: ${error.message}`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const tier = tierFromSubscriptionStatus(subscription.status);

  const supabase = createAdminClient();

  const patch: {
    subscription_tier: SubscriptionTierDb;
    payment_failed_at?: string | null;
    payment_failure_reason?: string | null;
  } = { subscription_tier: tier };

  // A healthy status clears any stale "payment failed" flag so the dashboard banner drops.
  if (subscription.status === "active" || subscription.status === "trialing") {
    patch.payment_failed_at = null;
    patch.payment_failure_reason = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Profile sync failed: ${error.message}`);
  }
}

function reasonFromInvoice(invoice: Stripe.Invoice): string | null {
  // Stripe surfaces the most useful detail on the latest charge's outcome / decline code.
  const charge = (invoice as unknown as { charge?: Stripe.Charge | string | null }).charge;
  if (charge && typeof charge === "object") {
    const outcomeReason = charge.outcome?.reason ?? null;
    if (outcomeReason) return outcomeReason;
    if (charge.failure_message) return charge.failure_message;
  }
  const lastError = (invoice as unknown as { last_finalization_error?: { message?: string | null } })
    .last_finalization_error;
  if (lastError?.message) return lastError.message;
  return null;
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Only act on subscription renewals; one-off invoices don't affect access.
  const billingReason = (invoice as unknown as { billing_reason?: string | null }).billing_reason;
  if (
    billingReason &&
    billingReason !== "subscription_cycle" &&
    billingReason !== "subscription_update" &&
    billingReason !== "subscription_create"
  ) {
    return;
  }

  const cust = invoice.customer;
  if (!cust) return;
  const customerId = typeof cust === "string" ? cust : cust.id;

  const reason = (reasonFromInvoice(invoice) ?? "payment_failed").slice(0, 200);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      payment_failed_at: new Date().toISOString(),
      payment_failure_reason: reason,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Profile payment_failed flag write failed: ${error.message}`);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const cust = invoice.customer;
  if (!cust) return;
  const customerId = typeof cust === "string" ? cust : cust.id;

  const supabase = createAdminClient();
  // Idempotent clear: no-op if there was no prior failure on file.
  const { error } = await supabase
    .from("profiles")
    .update({ payment_failed_at: null, payment_failure_reason: null })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Profile payment_failed flag clear failed: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return apiJsonError(
      "Webhook is not configured.",
      ApiErrorCode.CONFIGURATION,
      503,
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return apiJsonError("Missing signature.", ApiErrorCode.WEBHOOK_INVALID, 400);
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return apiJsonError("Invalid signature.", ApiErrorCode.WEBHOOK_INVALID, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleCheckoutSessionCompleted(session);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    logServerError("stripe-webhook", e);
    return apiJsonError(
      "Webhook processing failed.",
      ApiErrorCode.WEBHOOK_HANDLER,
      500,
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
~~~

## app/error.tsx

~~~tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center bg-editorial-bg px-4 py-16 font-sans text-editorial-cream antialiased">
      <div className="max-w-md text-center">
        <p className="font-serif text-2xl text-gold">Something went wrong</p>
        <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
          We hit an unexpected error. Your work is likely safe â€” try again, or head back to your
          library.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            className="bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
            onClick={() => reset()}
          >
            Try again
          </Button>
          <Button type="button" variant="outline" className="border-gold/40 text-editorial-cream" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
~~~

## app/global-error.tsx

~~~tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-editorial-bg px-4 font-sans text-editorial-cream antialiased">
        <div className="max-w-md text-center">
          <p className="font-serif text-2xl text-gold">Something went wrong</p>
          <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
            We hit an unexpected error. Your work is likely safe â€” try again, or head back to your
            library.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              className="bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
              onClick={() => reset()}
            >
              Try again
            </Button>
            <Button type="button" variant="outline" className="border-gold/40 text-editorial-cream" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
~~~

## app/globals.css

~~~css
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-dm-sans: "DM Sans", system-ui, sans-serif;
    --font-playfair: "Playfair Display", Georgia, serif;
    /* Dark editorial defaults â€” ChapterAI / shadcn-compatible HSL tokens */
    --background: 228 21% 8%;
    --foreground: 43 46% 89%;
    --card: 229 28% 14%;
    --card-foreground: 43 46% 89%;
    --popover: 229 28% 14%;
    --popover-foreground: 43 46% 89%;
    --primary: 45 54% 54%;
    --primary-foreground: 228 21% 8%;
    --secondary: 229 28% 18%;
    --secondary-foreground: 43 46% 89%;
    --muted: 229 20% 22%;
    --muted-foreground: 231 15% 60%;
    --accent: 45 54% 54%;
    --accent-foreground: 228 21% 8%;
    --destructive: 0 62% 45%;
    --destructive-foreground: 43 46% 98%;
    --border: 229 22% 22%;
    --input: 229 22% 22%;
    --ring: 45 54% 54%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 228 21% 8%;
    --foreground: 43 46% 89%;
    --card: 229 28% 14%;
    --card-foreground: 43 46% 89%;
    --popover: 229 28% 14%;
    --popover-foreground: 43 46% 89%;
    --primary: 45 54% 54%;
    --primary-foreground: 228 21% 8%;
    --secondary: 229 28% 18%;
    --secondary-foreground: 43 46% 89%;
    --muted: 229 20% 22%;
    --muted-foreground: 231 15% 60%;
    --accent: 45 54% 54%;
    --accent-foreground: 228 21% 8%;
    --destructive: 0 62% 45%;
    --destructive-foreground: 43 46% 98%;
    --border: 229 22% 22%;
    --input: 229 22% 22%;
    --ring: 45 54% 54%;
  }
}

@layer base {
  html {
    scroll-behavior: smooth;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }

  :focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
}

@keyframes chapterai-reveal {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@layer utilities {
  /* Scroll-linked reveal (Chrome / Safari recent); graceful degradation without @supports */
  @supports (animation-timeline: view()) {
    .reveal-scroll {
      animation: chapterai-reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-timeline: view();
      animation-range: entry 8% cover 32%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal-scroll {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
}

/* CSS-only confetti (export page) â€” no JS canvas */
@keyframes chapterai-confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translateY(110vh) rotate(560deg);
    opacity: 0;
  }
}

@layer components {
  .chapterai-confetti {
    pointer-events: none;
    position: fixed;
    inset: 0;
    z-index: 30;
    overflow: hidden;
  }

  .chapterai-confetti-piece {
    position: absolute;
    top: -16px;
    width: 8px;
    height: 12px;
    border-radius: 1px;
    opacity: 0;
    animation: chapterai-confetti-fall 2.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

  .chapterai-confetti-piece:nth-child(1) {
    left: 6%;
    animation-delay: 0.05s;
    background: #c9a84c;
  }
  .chapterai-confetti-piece:nth-child(2) {
    left: 14%;
    animation-delay: 0.15s;
    background: #e8dcc4;
  }
  .chapterai-confetti-piece:nth-child(3) {
    left: 22%;
    animation-delay: 0.08s;
    background: #8b7355;
  }
  .chapterai-confetti-piece:nth-child(4) {
    left: 31%;
    animation-delay: 0.22s;
    background: #c9a84c;
  }
  .chapterai-confetti-piece:nth-child(5) {
    left: 38%;
    animation-delay: 0.12s;
    background: #f0ead6;
  }
  .chapterai-confetti-piece:nth-child(6) {
    left: 46%;
    animation-delay: 0.18s;
    background: #a68b4b;
  }
  .chapterai-confetti-piece:nth-child(7) {
    left: 54%;
    animation-delay: 0.04s;
    background: #c9a84c;
  }
  .chapterai-confetti-piece:nth-child(8) {
    left: 62%;
    animation-delay: 0.25s;
    background: #6d6148;
  }
  .chapterai-confetti-piece:nth-child(9) {
    left: 70%;
    animation-delay: 0.1s;
    background: #e8dcc4;
  }
  .chapterai-confetti-piece:nth-child(10) {
    left: 78%;
    animation-delay: 0.2s;
    background: #c9a84c;
  }
  .chapterai-confetti-piece:nth-child(11) {
    left: 86%;
    animation-delay: 0.14s;
    background: #9a8b6e;
  }
  .chapterai-confetti-piece:nth-child(12) {
    left: 93%;
    animation-delay: 0.06s;
    background: #f0ead6;
  }
  .chapterai-confetti-piece:nth-child(13) {
    left: 11%;
    animation-delay: 0.28s;
    background: #c9a84c;
  }
  .chapterai-confetti-piece:nth-child(14) {
    left: 52%;
    animation-delay: 0.16s;
    background: #b89a5a;
  }
  .chapterai-confetti-piece:nth-child(15) {
    left: 67%;
    animation-delay: 0.11s;
    background: #e8dcc4;
  }
  .chapterai-confetti-piece:nth-child(16) {
    left: 41%;
    animation-delay: 0.24s;
    background: #8b7355;
  }
  .chapterai-confetti-piece:nth-child(17) {
    left: 19%;
    animation-delay: 0.19s;
    background: #c9a84c;
  }
  .chapterai-confetti-piece:nth-child(18) {
    left: 84%;
    animation-delay: 0.09s;
    background: #d4c4a8;
  }

  @media (prefers-reduced-motion: reduce) {
    .chapterai-confetti {
      display: none !important;
    }
  }

  .onboarding-illus {
    animation: onboarding-illus-pulse 3s ease-in-out infinite;
  }

  .onboarding-illus-sparkle {
    animation: onboarding-illus-pulse 2.2s ease-in-out infinite;
  }

  .animate-chapterai-cta {
    animation: chapterai-cta-pulse 2.4s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .onboarding-illus,
    .onboarding-illus-sparkle,
    .animate-chapterai-cta {
      animation: none !important;
    }
  }
}

@keyframes onboarding-illus-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.88;
    transform: scale(1.04);
  }
}

@keyframes chapterai-cta-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.45);
    transform: translateY(0);
  }
  50% {
    box-shadow: 0 0 36px 8px rgba(201, 168, 76, 0.2);
    transform: translateY(-2px);
  }
}

/* PROMPT 28 â€” page enter, streaming cursor, approval pop, progress polish */
@keyframes chapterai-page-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chapterai-page-transition-enter {
  animation: chapterai-page-enter 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes chapterai-stream-cursor-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

.chapterai-stream-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: linear-gradient(to bottom, #c9a84c, #e8dcc4);
  border-radius: 1px;
  animation: chapterai-stream-cursor-blink 1s step-end infinite;
  pointer-events: none;
  user-select: none;
}

@keyframes chapterai-approve-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  55% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.chapterai-approve-check {
  animation: chapterai-approve-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes chapterai-editor-glow {
  0%,
  100% {
    box-shadow: inset 0 0 0 0 rgba(201, 168, 76, 0);
  }
  50% {
    box-shadow: inset 0 0 32px 0 rgba(201, 168, 76, 0.12);
  }
}

.chapterai-editor-streaming-pulse {
  animation: chapterai-editor-glow 2s ease-in-out infinite;
}

.chapterai-btn-primary-shimmer {
  position: relative;
  overflow: hidden;
}

.chapterai-btn-primary-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-120%);
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 38%,
    rgba(255, 255, 255, 0.18) 50%,
    transparent 62%,
    transparent 100%
  );
  transition: transform 0.55s ease;
  pointer-events: none;
}

@media (hover: hover) and (pointer: fine) {
  .chapterai-btn-primary-shimmer:hover::after {
    transform: translateX(120%);
  }
}

@keyframes chapterai-generate-btn-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.35);
  }
  50% {
    box-shadow: 0 0 28px 5px rgba(201, 168, 76, 0.5);
  }
}

.chapterai-generate-chapter-btn:not(:disabled) {
  animation: chapterai-generate-btn-glow 2.2s ease-in-out infinite;
}

@keyframes chapterai-overlay-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.15);
  }
  50% {
    box-shadow: 0 0 36px 6px rgba(201, 168, 76, 0.35);
  }
}

.chapterai-generate-overlay-pulse {
  animation: chapterai-overlay-pulse 1.6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .chapterai-page-transition-enter {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  .chapterai-stream-cursor {
    animation: none !important;
    opacity: 1 !important;
  }

  .chapterai-approve-check {
    animation: none !important;
  }

  .chapterai-editor-streaming-pulse {
    animation: none !important;
  }

  .chapterai-generate-chapter-btn:not(:disabled),
  .chapterai-generate-overlay-pulse {
    animation: none !important;
  }

  .chapterai-btn-primary-shimmer::after {
    display: none !important;
  }
}
~~~

## app/layout.tsx

~~~tsx
import type { Metadata } from "next";
import { Toaster } from "sonner";

/* Playfair Display + DM Sans: @import in ./globals.css; preconnect below speeds first paint. */
import "./globals.css";

import { OfflineServiceWorkerAndBanner } from "@/components/providers/offline-service-worker";
import { RootAppChrome } from "@/components/providers/root-app-chrome";
import { SITE_DESCRIPTION } from "@/lib/seo/constants";
import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

const base = metadataBaseUrl();
const origin = siteUrlString();

export const metadata: Metadata = {
  metadataBase: base,
  title: {
    default: "ChapterAI",
    template: "%s | ChapterAI",
  },
  description: SITE_DESCRIPTION,
  applicationName: "ChapterAI",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: origin,
    siteName: "ChapterAI",
    title: "ChapterAI",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ChapterAI â€” AI-assisted book writing for KDP authors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChapterAI",
    description: SITE_DESCRIPTION,
    images: [`${origin}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-editorial-bg font-sans text-editorial-cream antialiased">
        <RootAppChrome>{children}</RootAppChrome>
        <OfflineServiceWorkerAndBanner />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
~~~

## app/not-found.tsx

~~~tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-editorial-bg px-4 py-16 text-center text-editorial-cream">
      <p className="font-serif text-sm font-medium uppercase tracking-[0.2em] text-gold/90">
        ChapterAI
      </p>
      <h1 className="mt-4 font-serif text-4xl font-semibold text-gold sm:text-5xl">404</h1>
      <p className="mt-4 text-lg text-editorial-cream">This page doesn&apos;t exist</p>
      <blockquote className="mx-auto mt-8 max-w-lg border-l-2 border-gold/40 pl-5 text-left text-sm italic leading-relaxed text-editorial-muted">
        &ldquo;I have always imagined that Paradise will be a kind of library.&rdquo;
        <footer className="mt-2 not-italic text-xs text-gold/80">â€” Jorge Luis Borges</footer>
      </blockquote>
      <Button
        asChild
        className="mt-10 bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
      >
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
~~~

## app/page.tsx

~~~tsx
import type { Metadata } from "next";

import { LandingJsonLd } from "@/components/landing/landing-json-ld";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { SITE_DESCRIPTION } from "@/lib/seo/constants";
import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "ChapterAI â€” From idea to KDP-ready manuscript",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ChapterAI â€” From idea to KDP-ready manuscript",
    description: SITE_DESCRIPTION,
    url: siteUrlString(),
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    title: "ChapterAI â€” From idea to KDP-ready manuscript",
    description: SITE_DESCRIPTION,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-cream">
      <LandingJsonLd />
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHow />
        <LandingFeatures />
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}
~~~

## app/robots.ts

~~~ts
import type { MetadataRoute } from "next";

import { siteUrlString } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrlString();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/projects", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
~~~

## app/sitemap.ts

~~~ts
import type { MetadataRoute } from "next";

import { siteUrlString } from "@/lib/seo/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrlString();
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
~~~

## components.json

~~~json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils/cn"
  }
}
~~~

## components/book/AboutAuthorPanel.tsx

~~~tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Loader2, Save, Sparkles, UserRound } from "@/lib/lucide-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_ABOUT_LEN = 1500;

export type AboutAuthorPanelProps = {
  bookId: string;
  initialAboutAuthor: string | null;
  /** Pulled from the user's profile â€” used for the "Use my profile bio" prefill. */
  profileBio: string | null;
  /** Shown next to the avatar when the field is empty (helps the user recognize who it's about). */
  profilePenName: string | null;
  profileFullName: string | null;
  profileAvatarUrl: string | null;
  onSaved?: (next: string | null) => void;
};

function trimOrNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

export function AboutAuthorPanel({
  bookId,
  initialAboutAuthor,
  profileBio,
  profilePenName,
  profileFullName,
  profileAvatarUrl,
  onSaved,
}: AboutAuthorPanelProps) {
  const [value, setValue] = useState(initialAboutAuthor ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const wordCount = useMemo(() => {
    const t = value.trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }, [value]);

  const displayName =
    profilePenName?.trim() || profileFullName?.trim() || "your profile";

  const bioAvailable = Boolean(profileBio?.trim());

  const runPrefillFromProfile = useCallback(() => {
    if (!profileBio?.trim()) {
      toast.error(
        "Your profile bio is empty â€” add one on the Profile page to use this shortcut.",
      );
      return;
    }
    setValue(profileBio.trim().slice(0, MAX_ABOUT_LEN));
    toast.success("Pulled your bio from profile. Edit freely, then save.");
  }, [profileBio]);

  const runGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-about-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        aboutAuthor?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.aboutAuthor) {
        throw new Error(data?.error ?? "Could not generate an About the Author paragraph.");
      }
      setValue(data.aboutAuthor.slice(0, MAX_ABOUT_LEN));
      toast.success("About the Author drafted. Edit freely, then save.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not generate an About the Author paragraph.",
      );
    } finally {
      setGenerating(false);
    }
  }, [bookId]);

  const runSave = useCallback(async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const next = trimOrNull(value);
      const { error } = await supabase
        .from("books")
        .update({ about_author: next })
        .eq("id", bookId);
      if (error) {
        const hint = /about_author|column/i.test(error.message)
          ? " â€” run supabase/migrations/021_book_about_author.sql"
          : "";
        toast.error(`Could not save About the Author: ${error.message}${hint}`);
        console.error("[AboutAuthorPanel] save failed", error);
        return;
      }
      toast.success("About the Author saved.");
      onSaved?.(next);
    } catch (e) {
      console.error("[AboutAuthorPanel] save threw", e);
      toast.error(e instanceof Error ? e.message : "Could not save About the Author.");
    } finally {
      setSaving(false);
    }
  }, [bookId, onSaved, value]);

  const busy = generating || saving;

  return (
    <section
      aria-label="About the author"
      className="rounded-xl border border-border bg-card/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-editorial-bg/60">
            {profileAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileAvatarUrl}
                alt={`Avatar for ${displayName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-5 w-5 text-editorial-muted" aria-hidden />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              About the author
            </p>
            <h2 className="mt-1 font-serif text-xl text-editorial-cream">
              Short author bio for this book
            </h2>
            <p className="mt-1 text-sm text-editorial-muted">
              A 60â€“110 word paragraph shown on the paperback back cover and your KDP
              listing. Defaults from {displayName} if you have one set.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-gold/40 text-gold hover:bg-gold/10"
          onClick={() => void runGenerate()}
          disabled={busy}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Writingâ€¦
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden />
              AI Generate
            </>
          )}
        </Button>
      </div>

      <div className="mt-5">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_ABOUT_LEN))}
          placeholder={
            generating
              ? "Drafting your About the Authorâ€¦"
              : "Write a short third-person bio here â€” or let AI draft one from your profile and this book."
          }
          rows={8}
          maxLength={MAX_ABOUT_LEN}
          disabled={busy}
          className="min-h-[180px] w-full resize-y rounded-lg border border-border bg-editorial-bg/60 px-4 py-3 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-editorial-muted">
          <span>
            {wordCount} word{wordCount === 1 ? "" : "s"}
            {wordCount > 0 && (wordCount < 40 || wordCount > 140) ? (
              <span className="ml-2 text-amber-400/90">aim for ~60â€“110</span>
            ) : null}
          </span>
          <span>
            {value.length} / {MAX_ABOUT_LEN}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={runPrefillFromProfile}
          disabled={busy || !bioAvailable}
          title={
            bioAvailable
              ? "Replace the text with your profile bio"
              : "Add a bio on the Profile page first"
          }
        >
          <UserRound className="h-4 w-4" aria-hidden />
          Use my profile bio
        </Button>
        <Button
          type="button"
          className="bg-gold text-editorial-bg hover:bg-gold/90"
          onClick={() => void runSave()}
          disabled={busy}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Savingâ€¦
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden />
              Save bio
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
~~~

## components/book/BackCoverCopyPanel.tsx

~~~tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Copy, Eye, Loader2, Pencil, Save, Sparkles } from "@/lib/lucide-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_BLURB_LEN = 3000;

export type BackCoverCopyPanelProps = {
  bookId: string;
  initialBlurb: string | null;
  onSaved?: (blurb: string | null) => void;
};

function trimOrNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

export function BackCoverCopyPanel({
  bookId,
  initialBlurb,
  onSaved,
}: BackCoverCopyPanelProps) {
  const [blurb, setBlurb] = useState(initialBlurb ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);

  const wordCount = useMemo(() => {
    const t = blurb.trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }, [blurb]);

  const paragraphs = useMemo(() => {
    return blurb
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [blurb]);

  const runGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-back-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        blurb?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.blurb) {
        throw new Error(data?.error ?? "Could not generate back cover copy.");
      }
      setBlurb(data.blurb.slice(0, MAX_BLURB_LEN));
      toast.success("Back cover copy ready. Edit freely, then save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate back cover copy.");
    } finally {
      setGenerating(false);
    }
  }, [bookId]);

  const runSave = useCallback(async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const nextBlurb = trimOrNull(blurb);
      const { error } = await supabase
        .from("books")
        .update({ back_cover_copy: nextBlurb })
        .eq("id", bookId);
      if (error) {
        const hint = /back_cover_copy|column/i.test(error.message)
          ? " â€” run supabase/migrations/016_book_metadata.sql"
          : "";
        toast.error(`Could not save back cover copy: ${error.message}${hint}`);
        console.error("[BackCoverCopyPanel] save failed", error);
        return;
      }
      toast.success("Back cover copy saved.");
      onSaved?.(nextBlurb);
    } catch (e) {
      console.error("[BackCoverCopyPanel] save threw", e);
      toast.error(e instanceof Error ? e.message : "Could not save back cover copy.");
    } finally {
      setSaving(false);
    }
  }, [blurb, bookId, onSaved]);

  const runCopy = useCallback(async () => {
    const t = blurb.trim();
    if (!t) {
      toast.error("Nothing to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
      setCopied(true);
      toast.success("Copied to clipboard.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard is unavailable.");
    }
  }, [blurb]);

  const busy = generating || saving;

  return (
    <section
      aria-label="Back cover copy"
      className="rounded-xl border border-border bg-card/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Back cover
          </p>
          <h2 className="mt-1 font-serif text-xl text-editorial-cream">
            Back of book copy
          </h2>
          <p className="mt-1 text-sm text-editorial-muted">
            A 150â€“200 word blurb for your KDP listing and paperback back cover.
            Separate paragraphs with a blank line.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-gold/40 text-gold hover:bg-gold/10"
          onClick={() => void runGenerate()}
          disabled={busy}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Writingâ€¦
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden />
              AI Generate
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Editor or paragraph preview"
          className="inline-flex rounded-lg border border-border bg-editorial-bg/40 p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!preview}
            onClick={() => setPreview(false)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              !preview
                ? "bg-gold/15 text-gold"
                : "text-editorial-muted hover:text-editorial-cream"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={preview}
            onClick={() => setPreview(true)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              preview
                ? "bg-gold/15 text-gold"
                : "text-editorial-muted hover:text-editorial-cream"
            }`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Preview as paragraphs
          </button>
        </div>
        <span className="text-xs text-editorial-muted">
          {paragraphs.length} paragraph{paragraphs.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3">
        {preview ? (
          <div
            aria-label="Back cover paragraph preview"
            className="min-h-[220px] rounded-lg border border-border bg-editorial-bg/60 px-4 py-3 text-sm leading-relaxed text-editorial-cream"
          >
            {paragraphs.length === 0 ? (
              <p className="text-editorial-muted">
                Nothing to preview yet â€” write or generate a blurb, then come back.
              </p>
            ) : (
              <div className="space-y-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value.slice(0, MAX_BLURB_LEN))}
            placeholder={
              generating
                ? "Drafting your blurbâ€¦"
                : "Your back cover copy will appear here. Separate paragraphs with a blank line â€” this textarea is fully editable."
            }
            rows={10}
            maxLength={MAX_BLURB_LEN}
            disabled={busy}
            className="min-h-[220px] w-full resize-y rounded-lg border border-border bg-editorial-bg/60 px-4 py-3 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
          />
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-editorial-muted">
          <span>
            {wordCount} word{wordCount === 1 ? "" : "s"}
            {wordCount > 0 && (wordCount < 120 || wordCount > 220) ? (
              <span className="ml-2 text-amber-400/90">
                aim for ~150â€“200
              </span>
            ) : null}
          </span>
          <span>
            {blurb.length} / {MAX_BLURB_LEN}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void runCopy()}
          disabled={!blurb.trim()}
        >
          <Copy className="h-4 w-4" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          type="button"
          className="bg-gold text-editorial-bg hover:bg-gold/90"
          onClick={() => void runSave()}
          disabled={busy}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Savingâ€¦
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden />
              Save blurb
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
~~~

## components/book/BookMetadataPanel.tsx

~~~tsx
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Loader2, Save, Sparkles } from "@/lib/lucide-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_TITLE_LEN = 160;
const MAX_SUBTITLE_LEN = 240;
const MAX_AUTHOR_LEN = 160;

export type BookMetadataPanelProps = {
  bookId: string;
  initialTitle: string;
  initialSubtitle: string | null;
  initialAuthorDisplayName: string | null;
  onSaved?: (next: {
    title: string;
    subtitle: string | null;
    authorDisplayName: string | null;
  }) => void;
};

const FIELD_CLASS =
  "w-full rounded-lg border border-border bg-editorial-bg/60 px-3 py-2 text-sm text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60";

function trimOrNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

export function BookMetadataPanel({
  bookId,
  initialTitle,
  initialSubtitle,
  initialAuthorDisplayName,
  onSaved,
}: BookMetadataPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle ?? "");
  const [authorDisplayName, setAuthorDisplayName] = useState(
    initialAuthorDisplayName ?? "",
  );
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const runGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-book-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        title?: string;
        subtitle?: string;
        author_tagline?: string;
        error?: string;
      } | null;
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "Could not generate metadata.");
      }
      if (data.title) setTitle(data.title.slice(0, MAX_TITLE_LEN));
      if (data.subtitle) setSubtitle(data.subtitle.slice(0, MAX_SUBTITLE_LEN));
      if (data.author_tagline)
        setAuthorDisplayName(data.author_tagline.slice(0, MAX_AUTHOR_LEN));
      toast.success("Metadata suggestions ready. Edit freely, then save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate metadata.");
    } finally {
      setGenerating(false);
    }
  }, [bookId]);

  const runSave = useCallback(async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Title cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const nextSubtitle = trimOrNull(subtitle);
      const nextAuthor = trimOrNull(authorDisplayName);
      const { error } = await supabase
        .from("books")
        .update({
          title: t,
          subtitle: nextSubtitle,
          author_display_name: nextAuthor,
        })
        .eq("id", bookId);
      if (error) {
        // Surface the real DB error (common culprit: migration 016 not applied,
        // so `subtitle` / `author_display_name` don't exist yet).
        const hint = /subtitle|author_display_name|column/i.test(error.message)
          ? " â€” run supabase/migrations/016_book_metadata.sql"
          : "";
        toast.error(`Could not save metadata: ${error.message}${hint}`);
        console.error("[BookMetadataPanel] save failed", error);
        return;
      }
      toast.success("Book metadata saved.");
      onSaved?.({
        title: t,
        subtitle: nextSubtitle,
        authorDisplayName: nextAuthor,
      });
    } catch (e) {
      console.error("[BookMetadataPanel] save threw", e);
      toast.error(e instanceof Error ? e.message : "Could not save metadata.");
    } finally {
      setSaving(false);
    }
  }, [authorDisplayName, bookId, onSaved, subtitle, title]);

  const busy = generating || saving;

  return (
    <section
      aria-label="Book metadata"
      className="rounded-xl border border-border bg-card/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Publishing metadata
          </p>
          <h2 className="mt-1 font-serif text-xl text-editorial-cream">
            Title, subtitle &amp; author
          </h2>
          <p className="mt-1 text-sm text-editorial-muted">
            Shown on the cover and across export files. Tweak what AI suggests â€” you own these.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-gold/40 text-gold hover:bg-gold/10"
          onClick={() => void runGenerate()}
          disabled={busy}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Generatingâ€¦
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden />
              AI Generate
            </>
          )}
        </Button>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-editorial-cream">Title</span>
          <input
            type="text"
            className={FIELD_CLASS}
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LEN))}
            placeholder="Your book's title"
            maxLength={MAX_TITLE_LEN}
            disabled={busy}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-editorial-cream">Subtitle</span>
          <input
            type="text"
            className={FIELD_CLASS}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value.slice(0, MAX_SUBTITLE_LEN))}
            placeholder="A short promise of the reading experience"
            maxLength={MAX_SUBTITLE_LEN}
            disabled={busy}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-editorial-cream">Author name</span>
          <input
            type="text"
            className={FIELD_CLASS}
            value={authorDisplayName}
            onChange={(e) =>
              setAuthorDisplayName(e.target.value.slice(0, MAX_AUTHOR_LEN))
            }
            placeholder="As you want it printed on the cover"
            maxLength={MAX_AUTHOR_LEN}
            disabled={busy}
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          className="bg-gold text-editorial-bg hover:bg-gold/90"
          onClick={() => void runSave()}
          disabled={busy || !title.trim()}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Savingâ€¦
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden />
              Save metadata
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
~~~

## components/book/ChapterEditor.tsx

~~~tsx
export { ChapterEditor } from "./chapter-editor/ChapterEditor";
export type {
  ChapterDetail,
  ChapterEditorProps,
  ChapterListItem,
} from "./chapter-editor/types";
~~~

## components/book/chapter-editor/assist-prompt-panel.tsx

~~~tsx
"use client";

import { Button } from "@/components/ui/button";
import { Expand, Loader2, Sparkles, Wand2, X } from "@/lib/lucide-icons";

export type AssistPromptPanelProps = {
  action: "expand" | "rewrite";
  prompt: string;
  onPromptChange: (value: string) => void;
  busy: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onClear: () => void;
};

/**
 * Shared inline panel for free-form AI edits (`expand`, `rewrite`). The exact
 * wording + CTA icon flips on `action`, but the shape is identical so one
 * component renders both.
 */
export function AssistPromptPanel({
  action,
  prompt,
  onPromptChange,
  busy,
  disabled,
  onSubmit,
  onClose,
  onClear,
}: AssistPromptPanelProps) {
  const isExpand = action === "expand";
  const HeadingIcon = isExpand ? Expand : Wand2;
  const title = isExpand ? "Expand selection with AI" : "Rewrite selection with AI";
  const description = isExpand
    ? "Select text in the chapter, then optionally tell the AI how to expand it (e.g. â€œadd a vivid sensory description of the stormâ€). Leave blank for a general expansion."
    : "Select text in the chapter, then tell the AI how to rewrite it (e.g. â€œmake this more tense and immediateâ€). Required â€” the rewriter won't run without direction.";
  const placeholder = isExpand
    ? "Optional instruction â€” how should the AI expand this passage?"
    : "How should the AI rewrite this passage?";
  const cta = isExpand ? "Expand selection" : "Rewrite selection";
  const busyCta = isExpand ? "Expandingâ€¦" : "Rewritingâ€¦";
  const submitDisabled = disabled || (!isExpand && !prompt.trim());

  return (
    <div className="flex flex-col gap-2 border-b border-border/50 bg-card/40 px-4 py-3">
      <div className="flex items-start gap-2">
        <HeadingIcon className="mt-1 h-4 w-4 shrink-0 text-gold" aria-hidden />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-editorial-muted">{description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close assistant panel"
          title="Close (Esc)"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-border/60 bg-editorial-bg/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-editorial-muted">{prompt.length}/2000</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !prompt}
            onClick={onClear}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-gold text-editorial-bg hover:bg-gold/90"
            disabled={submitDisabled}
            onClick={onSubmit}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {busyCta}
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
                {cta}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
~~~

## components/book/chapter-editor/bubble-menu.tsx

~~~tsx
"use client";

import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import {
  Bold,
  Expand,
  Italic,
  Link2,
  Loader2,
  SpellCheck2,
  Underline,
  Wand2,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { AssistToneOption } from "./types";

export type EditorBubbleMenuProps = {
  editor: Editor | null;
  aiBusy: boolean;
  disabled: boolean;
  onExpand: () => void;
  onRewrite: () => void;
  onShorten: () => void;
  onProofread: () => void;
  onTone: (tone: AssistToneOption) => void;
  onOpenLink: () => void;
};

/**
 * Floating toolbar shown above the current selection. Only renders when there
 * is a non-empty text selection; we explicitly hide it on code blocks/images
 * where mark-style formatting would be confusing.
 */
export function EditorBubbleMenu({
  editor,
  aiBusy,
  disabled,
  onExpand,
  onRewrite,
  onShorten,
  onProofread,
  onTone,
  onOpenLink,
}: EditorBubbleMenuProps) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: "top", maxWidth: 640 }}
      shouldShow={({ editor: ed, from, to }) => {
        if (from === to) return false;
        if (ed.isActive("codeBlock")) return false;
        return true;
      }}
      className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Bold"
        title="Bold"
        className={cn(
          "h-8 min-w-8 px-2 text-editorial-muted hover:text-gold",
          editor.isActive("bold") && "bg-gold/15 text-gold",
        )}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Italic"
        title="Italic"
        className={cn(
          "h-8 min-w-8 px-2 text-editorial-muted hover:text-gold",
          editor.isActive("italic") && "bg-gold/15 text-gold",
        )}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Underline"
        title="Underline"
        className={cn(
          "h-8 min-w-8 px-2 text-editorial-muted hover:text-gold",
          editor.isActive("underline") && "bg-gold/15 text-gold",
        )}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Add link"
        title="Add link (Ctrl+K)"
        className={cn(
          "h-8 min-w-8 px-2 text-editorial-muted hover:text-gold",
          editor.isActive("link") && "bg-gold/15 text-gold",
        )}
        onClick={onOpenLink}
      >
        <Link2 className="h-3.5 w-3.5" />
      </Button>
      <div className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Expand with AI"
        title="Expand with AI"
        disabled={disabled}
        className="h-8 gap-1 px-2 text-editorial-muted hover:text-gold"
        onClick={onExpand}
      >
        {aiBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Expand className="h-3.5 w-3.5" aria-hidden />
        )}
        <span className="text-xs">Expand</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Rewrite with AI"
        title="Rewrite with AI"
        disabled={disabled}
        className="h-8 gap-1 px-2 text-editorial-muted hover:text-gold"
        onClick={onRewrite}
      >
        <Wand2 className="h-3.5 w-3.5" aria-hidden />
        <span className="text-xs">Rewrite</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Shorten with AI"
        title="Shorten with AI"
        disabled={disabled}
        className="h-8 px-2 text-editorial-muted hover:text-gold"
        onClick={onShorten}
      >
        <span className="text-xs">Shorten</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Proofread with AI"
        title="Proofread with AI"
        disabled={disabled}
        className="h-8 gap-1 px-2 text-editorial-muted hover:text-gold"
        onClick={onProofread}
      >
        <SpellCheck2 className="h-3.5 w-3.5" aria-hidden />
        <span className="text-xs">Proofread</span>
      </Button>
      <select
        className="h-8 rounded-md border border-border/60 bg-editorial-bg/70 px-1.5 text-xs text-editorial-cream focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
        disabled={disabled}
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value as "" | AssistToneOption;
          e.target.value = "";
          if (!v) return;
          onTone(v);
        }}
        title="Rewrite tone"
        aria-label="Rewrite tone"
      >
        <option value="">Toneâ€¦</option>
        <option value="formal">Formal</option>
        <option value="casual">Casual</option>
        <option value="dramatic">Dramatic</option>
      </select>
    </BubbleMenu>
  );
}
~~~

## components/book/chapter-editor/ChapterEditor.tsx

~~~tsx
"use client";

import type { Editor } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { readDataStream } from "ai";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "@/lib/lucide-icons";
import { createClient } from "@/lib/supabase/client";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { cn } from "@/lib/utils/cn";
import type { ChapterStatusDb } from "@/types/database.types";

import { AssistPromptPanel } from "./assist-prompt-panel";
import { EditorBubbleMenu } from "./bubble-menu";
import { ChapterSidebar } from "./chapter-sidebar";
import { FindReplacePanel } from "./find-replace-panel";
import { LinkPopover } from "./link-popover";
import {
  countWords,
  estimateReadingMinutes,
  isLikelyMarkdown,
  markdownToHtml,
  statusBadgeClass,
  turndown,
} from "./markdown";
import { OutlinePanel } from "./outline-panel";
import { PendingState } from "./pending-state";
import { SaveIndicator } from "./save-indicator";
import { ShortcutCheatsheet } from "./shortcut-cheatsheet";
import { EditorToolbar } from "./toolbar";
import type {
  AssistAction,
  AssistPromptPanel as AssistPromptPanelState,
  AssistToneOption,
  ChapterEditorProps,
  FindMatch,
  SaveState,
} from "./types";
import { WordTarget } from "./word-target";
import { findMatchesInDoc, useFindMatches } from "./hooks/use-find-matches";
import { useChapterRealtime } from "./hooks/use-chapter-realtime";

const AUTOSAVE_INTERVAL_MS = 30_000;
const TYPEWRITER_STORAGE_KEY = "chapter-editor.typewriter";
const ZEN_STORAGE_KEY = "chapter-editor.zen";
const SPELLCHECK_STORAGE_KEY = "chapter-editor.spellcheck";

function readPref(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return fallback;
  return raw === "1";
}

function writePref(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "1" : "0");
}

export function ChapterEditor({
  bookId,
  bookTitle,
  bookSubtitle,
  initialChapters,
  chapter,
  subscriptionTier,
}: ChapterEditorProps) {
  const router = useRouter();

  const [chapters, setChapters] = useState(initialChapters);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [localBookTitle, setLocalBookTitle] = useState(bookTitle);
  const [localBookSubtitle, setLocalBookSubtitle] = useState(bookSubtitle ?? "");
  const [outlineSummary, setOutlineSummary] = useState(chapter.outline_summary ?? "");
  const [authorNotes, setAuthorNotes] = useState(chapter.author_notes ?? "");
  const [targetWordCount, setTargetWordCount] = useState<number | null>(
    chapter.target_word_count,
  );
  const [expandOutlineOpen, setExpandOutlineOpen] = useState(false);
  const [expandOutlinePrompt, setExpandOutlinePrompt] = useState("");
  const [expandOutlineBusy, setExpandOutlineBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState<ChapterStatusDb>(chapter.status);
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [currentWords, setCurrentWords] = useState(0);
  const streamFlushRaf = useRef<number | null>(null);
  const pendingMdRef = useRef("");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [spellcheckOn, setSpellcheckOn] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const findInputRef = useRef<HTMLInputElement | null>(null);

  const [assistPanel, setAssistPanel] = useState<AssistPromptPanelState>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkInitial, setLinkInitial] = useState<string | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const contentWrapRef = useRef<HTMLDivElement | null>(null);
  const typewriterRaf = useRef<number | null>(null);

  useEffect(() => {
    setSpellcheckOn(readPref(SPELLCHECK_STORAGE_KEY, true));
    setZenMode(readPref(ZEN_STORAGE_KEY, false));
    setTypewriterMode(readPref(TYPEWRITER_STORAGE_KEY, false));
  }, []);

  const sorted = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_number - b.chapter_number),
    [chapters],
  );
  const allChaptersPending =
    sorted.length > 0 && sorted.every((c) => c.status === "pending");
  const totalWords = useMemo(
    () => chapters.reduce((acc, c) => acc + (c.word_count ?? 0), 0),
    [chapters],
  );

  const chapterIndex = sorted.findIndex((c) => c.id === chapter.id);
  const prevChapter = chapterIndex > 0 ? sorted[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex >= 0 && chapterIndex < sorted.length - 1 ? sorted[chapterIndex + 1] : null;

  useEffect(() => {
    setChapters(initialChapters);
  }, [initialChapters]);

  useEffect(() => {
    setLocalBookTitle(bookTitle);
  }, [bookTitle]);

  useEffect(() => {
    setLocalBookSubtitle(bookSubtitle ?? "");
  }, [bookSubtitle]);

  useEffect(() => {
    setTitle(chapter.title);
    setLocalStatus(chapter.status);
    setOutlineSummary(chapter.outline_summary ?? "");
    setAuthorNotes(chapter.author_notes ?? "");
    setTargetWordCount(chapter.target_word_count);
    setSaveState("idle");
    setLastSavedAt(null);
  }, [
    chapter.id,
    chapter.title,
    chapter.status,
    chapter.outline_summary,
    chapter.author_notes,
    chapter.target_word_count,
  ]);

  const saveContent = useCallback(async (): Promise<boolean> => {
    const editor = editorRef.current;
    if (!editor || isGenerating) return false;
    const html = editor.getHTML();
    const md = turndown.turndown(html);
    const words = countWords(editor.getText());
    if (localStatus === "pending" && !md.trim()) return false;
    setSaveState("saving");
    const supabase = createClient();
    const { error } = await supabase
      .from("chapters")
      .update({
        content: md,
        status: "edited",
        word_count: words,
      })
      .eq("id", chapter.id)
      .eq("book_id", bookId);

    if (error) {
      setSaveState("error");
      toast.error("Could not save chapter.");
      return false;
    }

    const { data: rows } = await supabase
      .from("chapters")
      .select("word_count")
      .eq("book_id", bookId);
    const sum = rows?.reduce((acc, r) => acc + (r.word_count ?? 0), 0) ?? 0;
    await supabase.from("books").update({ word_count: sum }).eq("id", bookId);

    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapter.id ? { ...c, word_count: words, status: "edited" } : c,
      ),
    );
    setLocalStatus("edited");
    setSaveState("idle");
    setLastSavedAt(new Date());
    return true;
  }, [bookId, chapter.id, isGenerating, localStatus]);

  const saveTitle = useCallback(async () => {
    const t = title.trim() || "Untitled";
    if (t === chapter.title) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("chapters")
      .update({ title: t })
      .eq("id", chapter.id)
      .eq("book_id", bookId);
    if (error) {
      toast.error("Could not save title.");
      return;
    }
    setChapters((prev) => prev.map((c) => (c.id === chapter.id ? { ...c, title: t } : c)));
  }, [bookId, chapter.id, chapter.title, title]);

  const renameChapter = useCallback(
    async (targetId: string, nextTitle: string): Promise<boolean> => {
      const t = nextTitle.trim() || "Untitled";
      const current = chapters.find((c) => c.id === targetId);
      if (!current || t === current.title) return false;
      const supabase = createClient();
      const { error } = await supabase
        .from("chapters")
        .update({ title: t })
        .eq("id", targetId)
        .eq("book_id", bookId);
      if (error) {
        toast.error("Could not rename chapter.");
        return false;
      }
      setChapters((prev) => prev.map((c) => (c.id === targetId ? { ...c, title: t } : c)));
      if (targetId === chapter.id) setTitle(t);
      return true;
    },
    [bookId, chapter.id, chapters],
  );

  const saveBookTitle = useCallback(async () => {
    const t = localBookTitle.trim();
    if (!t) {
      setLocalBookTitle(bookTitle);
      toast.error("Book title cannot be empty.");
      return;
    }
    if (t === bookTitle) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("books")
      .update({ title: t })
      .eq("id", bookId);
    if (error) {
      toast.error("Could not save book title.");
      setLocalBookTitle(bookTitle);
      return;
    }
    router.refresh();
  }, [bookId, bookTitle, localBookTitle, router]);

  const saveBookSubtitle = useCallback(async () => {
    const next = localBookSubtitle.trim();
    const prev = (bookSubtitle ?? "").trim();
    if (next === prev) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("books")
      .update({ subtitle: next || null })
      .eq("id", bookId);
    if (error) {
      const hint = /subtitle|column/i.test(error.message)
        ? " â€” run supabase/migrations/016_book_metadata.sql"
        : "";
      toast.error(`Could not save subtitle${hint}.`);
      setLocalBookSubtitle(prev);
      return;
    }
    router.refresh();
  }, [bookId, bookSubtitle, localBookSubtitle, router]);

  const saveOutlineSummary = useCallback(
    async (override?: string) => {
      const next = (override ?? outlineSummary).trim();
      const prev = (chapter.outline_summary ?? "").trim();
      if (next === prev) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("chapters")
        .update({ outline_summary: next || null })
        .eq("id", chapter.id)
        .eq("book_id", bookId);
      if (error) {
        toast.error("Could not save outline.");
        return;
      }
      router.refresh();
    },
    [bookId, chapter.id, chapter.outline_summary, outlineSummary, router],
  );

  const saveAuthorNotes = useCallback(async () => {
    const next = authorNotes.trim();
    const prev = (chapter.author_notes ?? "").trim();
    if (next === prev) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("chapters")
      .update({ author_notes: next || null })
      .eq("id", chapter.id)
      .eq("book_id", bookId);
    if (error) {
      toast.error("Could not save steering notes.");
      return;
    }
    router.refresh();
  }, [authorNotes, bookId, chapter.author_notes, chapter.id, router]);

  const saveTargetWordCount = useCallback(
    async (next: number | null) => {
      if (next === targetWordCount) return;
      setTargetWordCount(next);
      const supabase = createClient();
      const { error } = await supabase
        .from("chapters")
        .update({ target_word_count: next })
        .eq("id", chapter.id)
        .eq("book_id", bookId);
      if (error) {
        toast.error("Could not save word target.");
        setTargetWordCount(targetWordCount);
        return;
      }
      router.refresh();
    },
    [bookId, chapter.id, router, targetWordCount],
  );

  const runExpandOutline = useCallback(async () => {
    if (expandOutlineBusy) return;
    setExpandOutlineBusy(true);
    try {
      const res = await fetch("/api/ai/expand-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          chapterId: chapter.id,
          ...(expandOutlinePrompt.trim()
            ? { prompt: expandOutlinePrompt.trim() }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        text?: string;
        error?: string;
        code?: string;
      } | null;
      if (res.status === 403 && data?.code === "UPGRADE_REQUIRED") {
        setUpgradeOpen(true);
        return;
      }
      if (!res.ok || !data?.text) {
        throw new Error(data?.error ?? "Could not expand outline.");
      }
      const expanded = data.text.trim();
      setOutlineSummary(expanded);
      await saveOutlineSummary(expanded);
      setExpandOutlineOpen(false);
      setExpandOutlinePrompt("");
      toast.success("Outline expanded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not expand outline.");
    } finally {
      setExpandOutlineBusy(false);
    }
  }, [bookId, chapter.id, expandOutlineBusy, expandOutlinePrompt, saveOutlineSummary]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    ],
    immediatelyRender: false,
    editable: !isGenerating,
    content: "<p></p>",
    editorProps: {
      attributes: {
        class:
          "chapter-editor-tiptap max-w-none min-h-[420px] px-4 py-3 text-[15px] leading-relaxed text-editorial-cream focus:outline-none [&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-medium [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-medium [&_h3]:mt-4 [&_h3]:font-serif [&_h3]:text-lg [&_h4]:mt-3 [&_h4]:font-serif [&_h4]:text-base [&_blockquote]:border-l-2 [&_blockquote]:border-gold/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-2 [&_hr]:my-6 [&_hr]:border-t [&_hr]:border-gold/40 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_code]:rounded [&_code]:bg-muted/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_pre]:rounded-md [&_pre]:bg-muted/30 [&_pre]:p-3 [&_pre]:text-[13px] [&_s]:line-through",
      },
      handleDOMEvents: {
        blur: () => {
          void saveContent();
          return false;
        },
      },
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        const plain = clipboard.getData("text/plain");
        const html = clipboard.getData("text/html");
        if (html && html.trim()) return false;
        if (!plain) return false;
        if (!isLikelyMarkdown(plain)) return false;
        const htmlFromMd = markdownToHtml(plain);
        event.preventDefault();
        editorRef.current?.chain().focus().insertContent(htmlFromMd).run();
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      setCurrentWords(countWords(ed.getText()));
      setSaveState("dirty");
    },
  });

  useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isGenerating);
  }, [editor, isGenerating]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute("spellcheck", spellcheckOn ? "true" : "false");
  }, [editor, spellcheckOn]);

  useEffect(() => {
    if (!editor || !typewriterMode) return;
    const onSelect = () => {
      if (typewriterRaf.current != null) return;
      typewriterRaf.current = requestAnimationFrame(() => {
        typewriterRaf.current = null;
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        const container = contentWrapRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const caretY = coords.top - rect.top;
        const offsetToCenter = caretY - rect.height / 2;
        container.scrollBy({ top: offsetToCenter, behavior: "smooth" });
      });
    };
    editor.on("selectionUpdate", onSelect);
    editor.on("update", onSelect);
    return () => {
      editor.off("selectionUpdate", onSelect);
      editor.off("update", onSelect);
      if (typewriterRaf.current != null) {
        cancelAnimationFrame(typewriterRaf.current);
        typewriterRaf.current = null;
      }
    };
  }, [editor, typewriterMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.ctrlKey || e.metaKey;
      const active = document.activeElement;
      const tag = active?.tagName.toLowerCase();
      const isFormField =
        tag === "input" || tag === "textarea" || tag === "select" ||
        (active as HTMLElement | null)?.isContentEditable;

      if (cmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
        const inMain =
          mainRef.current?.contains(active) || active === document.body;
        if (inMain) {
          e.preventDefault();
          setFindOpen(true);
          setTimeout(() => findInputRef.current?.focus(), 0);
        }
        return;
      }
      if (cmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        const inMain = mainRef.current?.contains(active);
        if (inMain) {
          e.preventDefault();
          const ed = editorRef.current;
          const href = ed?.getAttributes("link")?.href ?? null;
          setLinkInitial(typeof href === "string" && href ? href : null);
          setLinkOpen(true);
        }
        return;
      }
      if (e.key === "?" && !isFormField) {
        e.preventDefault();
        setCheatsheetOpen(true);
        return;
      }
      if (e.key === "Escape") {
        if (zenMode) {
          setZenMode(false);
          writePref(ZEN_STORAGE_KEY, false);
        }
        setFindOpen(false);
        setAssistPanel(null);
        setLinkOpen(false);
        setCheatsheetOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zenMode]);

  useEffect(() => {
    if (!editor) return;
    const html = markdownToHtml(chapter.content ?? "");
    editor.commands.setContent(html, false);
    queueMicrotask(() => setCurrentWords(countWords(editor.getText())));
    setSaveState("idle");
  }, [chapter.id, chapter.content, editor]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void saveContent();
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [saveContent]);

  useChapterRealtime({
    bookId,
    chapterId: chapter.id,
    onChapterRowUpdate: (mutator) => setChapters(mutator),
    onCurrentChapterChanged: (row) => {
      setLocalStatus(row.status);
      if (row.title) setTitle(row.title);
    },
  });

  const findAll = useFindMatches({ editor, open: findOpen, query: findQuery, caseSensitive });
  const { matches, matchIndex, setMatches, setMatchIndex, gotoMatch, findNext, findPrev } =
    findAll;

  const replaceCurrent = useCallback(() => {
    if (!editor || matches.length === 0) return;
    const m = matches[matchIndex];
    if (!m) return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: m.from, to: m.to }, replaceQuery)
      .run();
    const nextList = findMatchesInDoc(editor, findQuery, caseSensitive);
    setMatches(nextList);
    if (nextList.length === 0) {
      setMatchIndex(0);
      return;
    }
    const nextIdx = Math.min(matchIndex, nextList.length - 1);
    setMatchIndex(nextIdx);
    gotoMatch(nextIdx, nextList);
    void saveContent();
  }, [
    caseSensitive,
    editor,
    findQuery,
    gotoMatch,
    matchIndex,
    matches,
    replaceQuery,
    saveContent,
    setMatchIndex,
    setMatches,
  ]);

  const replaceAll = useCallback(() => {
    if (!editor || matches.length === 0) return;
    const ordered = [...matches].sort((a, b) => b.from - a.from);
    let chain = editor.chain().focus();
    for (const m of ordered) {
      chain = chain.insertContentAt({ from: m.from, to: m.to }, replaceQuery);
    }
    chain.run();
    toast.success(`Replaced ${ordered.length} match${ordered.length === 1 ? "" : "es"}.`);
    setMatches([] as FindMatch[]);
    setMatchIndex(0);
    void saveContent();
  }, [editor, matches, replaceQuery, saveContent, setMatchIndex, setMatches]);

  const flushStreamToEditor = useCallback(
    (md: string) => {
      if (!editor) return;
      try {
        const html = markdownToHtml(md);
        editor.commands.setContent(html, false);
        setCurrentWords(countWords(editor.getText()));
      } catch {
        /* ignore parse errors mid-stream */
      }
    },
    [editor],
  );

  const scheduleStreamFlush = useCallback(
    (md: string) => {
      pendingMdRef.current = md;
      if (streamFlushRaf.current != null) return;
      streamFlushRaf.current = requestAnimationFrame(() => {
        streamFlushRaf.current = null;
        flushStreamToEditor(pendingMdRef.current);
      });
    },
    [flushStreamToEditor],
  );

  const streamChapterGeneration = useCallback(
    async (
      targetChapterId: string,
      targetChapterNumber: number,
      displayInEditor: boolean,
    ): Promise<{ ok: boolean; upgrade?: boolean; skipped?: boolean }> => {
      if (
        subscriptionTier === "free" &&
        targetChapterNumber > FREE_MAX_CHAPTERS_PER_BOOK
      ) {
        return { ok: true, skipped: true };
      }

      const ed = editorRef.current;
      if (displayInEditor && !ed) return { ok: false };

      if (displayInEditor && ed) {
        setIsGenerating(true);
        setLocalStatus("generating");
        ed.commands.setContent("<p></p>", false);
      }

      try {
        const res = await fetch("/api/ai/generate-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId, chapterId: targetChapterId }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
            code?: string;
            upgrade?: boolean;
          } | null;
          if (
            res.status === 403 &&
            (err?.code === "UPGRADE_REQUIRED" || err?.upgrade)
          ) {
            if (displayInEditor && ed) {
              setUpgradeOpen(true);
              setLocalStatus(chapter.status);
              const html = markdownToHtml(chapter.content ?? "");
              ed.commands.setContent(html, false);
              setCurrentWords(countWords(ed.getText()));
            }
            return { ok: false, upgrade: true };
          }
          throw new Error(err?.error ?? "Generation failed.");
        }
        if (!res.body) throw new Error("No response body.");
        const reader = res.body.getReader();
        let accumulated = "";
        for await (const part of readDataStream(reader)) {
          if (part.type === "text") {
            accumulated += part.value;
            if (displayInEditor) scheduleStreamFlush(accumulated);
          }
          if (part.type === "error") {
            throw new Error(String(part.value));
          }
        }
        if (displayInEditor) {
          flushStreamToEditor(accumulated);
        }
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generation failed.";
        if (displayInEditor && ed) {
          toast.error(msg);
          setLocalStatus(chapter.status);
          const html = markdownToHtml(chapter.content ?? "");
          ed.commands.setContent(html, false);
          setCurrentWords(countWords(ed.getText()));
        } else {
          toast.error(msg);
        }
        return { ok: false };
      } finally {
        if (streamFlushRaf.current != null) {
          cancelAnimationFrame(streamFlushRaf.current);
          streamFlushRaf.current = null;
        }
        if (displayInEditor) {
          setIsGenerating(false);
        }
      }
    },
    [
      bookId,
      chapter.content,
      chapter.status,
      flushStreamToEditor,
      scheduleStreamFlush,
      subscriptionTier,
    ],
  );

  const runGenerateChapter = useCallback(async () => {
    if (!editor) return;
    if (
      subscriptionTier === "free" &&
      chapter.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
    ) {
      setUpgradeOpen(true);
      return;
    }
    const r = await streamChapterGeneration(chapter.id, chapter.chapter_number, true);
    if (r.ok && !r.skipped) {
      toast.success("Chapter generated.");
      router.refresh();
    }
  }, [
    chapter.chapter_number,
    chapter.id,
    editor,
    router,
    streamChapterGeneration,
    subscriptionTier,
  ]);

  const runGenerateAllChapters = useCallback(async () => {
    if (
      !confirm(
        "Generate every chapter in order (first â†’ last)? Existing chapter text will be replaced for each chapter. This uses one full generation per chapter and may take a long time.",
      )
    ) {
      return;
    }
    setBatchBusy(true);
    const toastId = "generate-all-chapters";
    toast.loading("Startingâ€¦", { id: toastId });
    let skippedPro = 0;
    try {
      for (const c of sorted) {
        if (
          subscriptionTier === "free" &&
          c.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
        ) {
          skippedPro += 1;
          continue;
        }
        toast.loading(
          `Generating chapter ${c.chapter_number} of ${sorted.length}â€¦`,
          { id: toastId },
        );
        const r = await streamChapterGeneration(
          c.id,
          c.chapter_number,
          c.id === chapter.id,
        );
        if (r.upgrade) {
          setUpgradeOpen(true);
          toast.dismiss(toastId);
          return;
        }
        if (!r.ok) {
          toast.dismiss(toastId);
          return;
        }
      }
      toast.dismiss(toastId);
      if (skippedPro > 0) {
        toast.info(
          `Skipped ${skippedPro} chapter(s) â€” Free plan includes AI for chapters 1â€“${FREE_MAX_CHAPTERS_PER_BOOK} only. Upgrade to Pro for the rest.`,
        );
      }
      toast.success("All chapters generated.");
      router.refresh();
    } finally {
      setBatchBusy(false);
    }
  }, [chapter.id, router, sorted, streamChapterGeneration, subscriptionTier]);

  const runAssist = useCallback(
    async (
      action: AssistAction,
      opts?: { tone?: AssistToneOption; prompt?: string },
    ) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;

      const isContinue = action === "continue";
      if (!isContinue && from === to) {
        toast.error("Select some text first.");
        return;
      }

      const selectedText = isContinue
        ? ""
        : editor.state.doc.textBetween(from, to, "\n\n");

      if ((action === "rewrite") && !opts?.prompt?.trim()) {
        toast.error("Tell the AI how to rewrite the selection.");
        return;
      }

      setAiBusy(true);
      try {
        let body: Record<string, unknown>;
        if (action === "tone") {
          body = {
            action: "tone",
            bookId,
            chapterId: chapter.id,
            selectedText,
            tone: opts!.tone!,
          };
        } else if (action === "continue") {
          await saveContent();
          body = {
            action: "continue",
            bookId,
            chapterId: chapter.id,
          };
        } else {
          body = {
            action,
            bookId,
            chapterId: chapter.id,
            selectedText,
            ...(opts?.prompt && opts.prompt.trim()
              ? { prompt: opts.prompt.trim() }
              : {}),
          };
        }

        const res = await fetch("/api/ai/chapter-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => null)) as {
          text?: string;
          error?: string;
          code?: string;
        } | null;
        if (res.status === 403 && data?.code === "UPGRADE_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        if (!res.ok || !data?.text) {
          throw new Error(data?.error ?? "Assistant request failed.");
        }

        const replacementHtml = markdownToHtml(data.text);
        if (isContinue) {
          const endPos = editor.state.doc.content.size;
          editor
            .chain()
            .focus()
            .insertContentAt(endPos, `<p></p>${replacementHtml}`)
            .run();
        } else {
          editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContentAt(from, replacementHtml)
            .run();
        }
        setCurrentWords(countWords(editor.getText()));
        void saveContent();

        const successToast: Record<AssistAction, string> = {
          expand: "Section expanded.",
          rewrite: "Section rewritten.",
          shorten: "Section tightened.",
          proofread: "Section proofread.",
          continue: "Continued drafting.",
          tone: "Tone updated.",
        };
        toast.success(successToast[action]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Assistant request failed.");
      } finally {
        setAiBusy(false);
      }
    },
    [bookId, chapter.id, editor, saveContent],
  );

  const openLinkPopover = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const href = ed.getAttributes("link")?.href;
    setLinkInitial(typeof href === "string" && href ? href : null);
    setLinkOpen(true);
  }, []);

  const applyLink = useCallback(
    (href: string) => {
      const ed = editorRef.current;
      if (!ed) return;
      const { from, to } = ed.state.selection;
      if (from === to) {
        ed.chain()
          .focus()
          .insertContent(`<a href="${href}">${href}</a>`)
          .run();
      } else {
        ed.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }
      setLinkOpen(false);
      void saveContent();
    },
    [saveContent],
  );

  const removeLink = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    void saveContent();
  }, [saveContent]);

  const toolbarDisabled =
    isGenerating || aiBusy || localStatus === "generating" || batchBusy;

  const readingMinutes = estimateReadingMinutes(currentWords);

  const onToggleZen = () => {
    setZenMode((v) => {
      const next = !v;
      writePref(ZEN_STORAGE_KEY, next);
      return next;
    });
  };
  const onToggleTypewriter = () => {
    setTypewriterMode((v) => {
      const next = !v;
      writePref(TYPEWRITER_STORAGE_KEY, next);
      return next;
    });
  };
  const onToggleSpellcheck = () => {
    setSpellcheckOn((v) => {
      const next = !v;
      writePref(SPELLCHECK_STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "flex min-h-screen w-full flex-col bg-editorial-bg",
        zenMode && "zen-mode",
      )}
    >
      {allChaptersPending && !zenMode ? (
        <div className="border-b border-gold/20 bg-gold/5 px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">Chapters</p>
              <p className="mt-1 font-serif text-lg text-editorial-cream">
                Every chapter is still pending
              </p>
              <p className="mt-1 text-sm text-editorial-muted">
                Pick a chapter in the sidebar, then use{" "}
                <strong className="text-editorial-cream">Generate</strong> to draft with AIâ€”or
                write from scratch. Chapters are ready for export as soon as they have content;
                tweak anytime.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <ProUpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          title="Upgrade to Pro for unlimited chapters"
          description={`The Free plan includes AI generation for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro to generate chapter ${chapter.chapter_number} and beyond.`}
        />

        <ShortcutCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />

        <LinkPopover
          open={linkOpen}
          initialHref={linkInitial}
          onClose={() => setLinkOpen(false)}
          onApply={applyLink}
          onUnlink={removeLink}
        />

        {zenMode ? null : (
          <ChapterSidebar
            bookId={bookId}
            bookTitle={localBookTitle}
            bookSubtitle={localBookSubtitle}
            chapterId={chapter.id}
            sortedChapters={sorted}
            totalWords={totalWords}
            batchBusy={batchBusy}
            isGenerating={isGenerating}
            aiBusy={aiBusy}
            onBookTitleChange={setLocalBookTitle}
            onBookTitleCommit={() => void saveBookTitle()}
            onBookSubtitleChange={setLocalBookSubtitle}
            onBookSubtitleCommit={() => void saveBookSubtitle()}
            onRenameChapter={renameChapter}
            onGenerateAll={() => void runGenerateAllChapters()}
          />
        )}

        <main ref={mainRef} className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border/60 px-6 py-4">
            <div className="flex flex-wrap items-start gap-3">
              <input
                className="min-w-0 flex-1 border-none bg-transparent font-serif text-2xl font-medium text-editorial-cream outline-none ring-0 placeholder:text-editorial-muted focus:ring-0 md:text-3xl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void saveTitle()}
                disabled={isGenerating || aiBusy}
              />
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                  statusBadgeClass(localStatus),
                )}
              >
                {localStatus}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <SaveIndicator
                state={saveState}
                lastSavedAt={lastSavedAt}
                onRetry={() => void saveContent()}
              />
              <WordTarget
                target={targetWordCount}
                currentWords={currentWords}
                disabled={isGenerating || batchBusy}
                onSave={(next) => void saveTargetWordCount(next)}
              />
            </div>
          </div>

          {zenMode ? null : (
            <OutlinePanel
              outlineSummary={outlineSummary}
              onOutlineChange={setOutlineSummary}
              onOutlineBlur={() => void saveOutlineSummary()}
              authorNotes={authorNotes}
              onAuthorNotesChange={setAuthorNotes}
              onAuthorNotesBlur={() => void saveAuthorNotes()}
              expandOpen={expandOutlineOpen}
              expandPrompt={expandOutlinePrompt}
              expandBusy={expandOutlineBusy}
              onToggleExpand={() => {
                setExpandOutlineOpen((v) => !v);
                if (expandOutlineOpen) setExpandOutlinePrompt("");
              }}
              onExpandPromptChange={setExpandOutlinePrompt}
              onExpand={() => void runExpandOutline()}
              disabled={isGenerating || aiBusy || batchBusy}
            />
          )}

          <EditorToolbar
            editor={editor}
            toolbarDisabled={toolbarDisabled}
            aiBusy={aiBusy}
            findOpen={findOpen}
            spellcheckOn={spellcheckOn}
            zenMode={zenMode}
            typewriterMode={typewriterMode}
            expandPromptOpen={assistPanel?.action === "expand"}
            rewritePromptOpen={assistPanel?.action === "rewrite"}
            onRegenerate={() => {
              if (
                !confirm(
                  "Regenerate this chapter from scratch? Unsaved edits will be lost.",
                )
              )
                return;
              void runGenerateChapter();
            }}
            onOpenExpand={() =>
              setAssistPanel((p) =>
                p?.action === "expand" ? null : { action: "expand", prompt: "" },
              )
            }
            onOpenRewrite={() =>
              setAssistPanel((p) =>
                p?.action === "rewrite" ? null : { action: "rewrite", prompt: "" },
              )
            }
            onShorten={() => void runAssist("shorten")}
            onProofread={() => void runAssist("proofread")}
            onContinue={() => void runAssist("continue")}
            onTone={(tone) => void runAssist("tone", { tone })}
            onToggleFind={() => {
              setFindOpen((v) => {
                const next = !v;
                if (next) setTimeout(() => findInputRef.current?.focus(), 0);
                return next;
              });
            }}
            onToggleSpellcheck={onToggleSpellcheck}
            onToggleZen={onToggleZen}
            onToggleTypewriter={onToggleTypewriter}
            onShowCheatsheet={() => setCheatsheetOpen(true)}
            onOpenLink={openLinkPopover}
          />

          {findOpen ? (
            <FindReplacePanel
              ref={findInputRef}
              findQuery={findQuery}
              replaceQuery={replaceQuery}
              caseSensitive={caseSensitive}
              matchCount={matches.length}
              matchIndex={matchIndex}
              disabled={toolbarDisabled}
              onFindChange={setFindQuery}
              onReplaceChange={setReplaceQuery}
              onCaseSensitiveChange={setCaseSensitive}
              onFindNext={findNext}
              onFindPrev={findPrev}
              onReplace={replaceCurrent}
              onReplaceAll={replaceAll}
              onClose={() => setFindOpen(false)}
            />
          ) : null}

          {assistPanel ? (
            <AssistPromptPanel
              action={assistPanel.action}
              prompt={assistPanel.prompt}
              onPromptChange={(prompt) =>
                setAssistPanel((p) => (p ? { ...p, prompt } : p))
              }
              busy={aiBusy}
              disabled={toolbarDisabled}
              onSubmit={() => {
                const action = assistPanel.action;
                const promptText = assistPanel.prompt.trim();
                void runAssist(action, promptText ? { prompt: promptText } : undefined);
              }}
              onClose={() => setAssistPanel(null)}
              onClear={() => setAssistPanel((p) => (p ? { ...p, prompt: "" } : p))}
            />
          ) : null}

          <div className="relative flex flex-1 flex-col overflow-hidden">
            {localStatus === "pending" && !isGenerating ? (
              <PendingState
                title={chapter.title}
                outlineSummary={outlineSummary}
                onOutlineChange={setOutlineSummary}
                onOutlineBlur={() => void saveOutlineSummary()}
                batchBusy={batchBusy}
                onGenerateOne={() => void runGenerateChapter()}
                onGenerateAll={() => void runGenerateAllChapters()}
              />
            ) : (
              <>
                <div
                  ref={contentWrapRef}
                  className={cn(
                    "flex-1 overflow-y-auto bg-editorial-bg/80",
                    isGenerating && "pointer-events-none opacity-80",
                    zenMode && "flex justify-center",
                    typewriterMode && "scroll-smooth",
                  )}
                >
                  <div className={cn(zenMode && "w-full max-w-2xl")}> 
                    {editor ? <EditorContent editor={editor} /> : null}
                    <EditorBubbleMenu
                      editor={editor}
                      aiBusy={aiBusy}
                      disabled={toolbarDisabled}
                      onExpand={() =>
                        setAssistPanel({ action: "expand", prompt: "" })
                      }
                      onRewrite={() =>
                        setAssistPanel({ action: "rewrite", prompt: "" })
                      }
                      onShorten={() => void runAssist("shorten")}
                      onProofread={() => void runAssist("proofread")}
                      onTone={(tone) => void runAssist("tone", { tone })}
                      onOpenLink={openLinkPopover}
                    />
                  </div>
                </div>
                {isGenerating ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-editorial-bg/40">
                    <p className="flex items-center gap-2 rounded-lg border border-border bg-card/90 px-4 py-2 text-sm text-editorial-cream shadow-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-gold" aria-hidden />
                      Writing your chapterâ€¦
                    </p>
                  </div>
                ) : null}
              </>
            )}
            <div className="pointer-events-none absolute bottom-3 right-6 flex items-center gap-3 text-xs text-editorial-muted">
              <span>{currentWords.toLocaleString()} words</span>
              <span className="text-editorial-muted/60">Â·</span>
              <span>{readingMinutes} min read</span>
            </div>
          </div>

          {zenMode ? null : (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card/30 px-4 py-3">
              {prevChapter && !isGenerating ? (
                <Button type="button" variant="outline" asChild>
                  <NextLink
                    href={`/projects/${bookId}/chapters/${prevChapter.id}`}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Previous chapter
                  </NextLink>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled>
                  <span className="flex items-center gap-1">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Previous chapter
                  </span>
                </Button>
              )}
              {nextChapter && !isGenerating ? (
                <Button type="button" variant="outline" asChild>
                  <NextLink
                    href={`/projects/${bookId}/chapters/${nextChapter.id}`}
                    className="gap-1"
                  >
                    Next chapter
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </NextLink>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled>
                  <span className="flex items-center gap-1">
                    Next chapter
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
~~~

## components/book/chapter-editor/chapter-sidebar.tsx

~~~tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Check, Loader2, Pencil, X } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";
import type { ChapterStatusDb } from "@/types/database.types";

import type { ChapterListItem } from "./types";

const MAX_BOOK_TITLE_LEN = 160;
const MAX_SUBTITLE_LEN = 240;
const MAX_CHAPTER_TITLE_LEN = 160;

function StatusDot({ status }: { status: ChapterStatusDb }) {
  if (status === "generating") {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gold" aria-hidden />;
  }
  const color =
    status === "pending"
      ? "bg-editorial-muted"
      : status === "draft"
        ? "bg-sky-400"
        : "bg-emerald-400";
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} aria-hidden />;
}

export type ChapterSidebarProps = {
  bookId: string;
  bookTitle: string;
  bookSubtitle: string;
  chapterId: string;
  sortedChapters: ChapterListItem[];
  totalWords: number;
  batchBusy: boolean;
  isGenerating: boolean;
  aiBusy: boolean;
  onBookTitleChange: (next: string) => void;
  onBookTitleCommit: () => void;
  onBookSubtitleChange: (next: string) => void;
  onBookSubtitleCommit: () => void;
  onRenameChapter: (chapterId: string, nextTitle: string) => Promise<boolean>;
  onGenerateAll: () => void;
};

/**
 * Chapter title row in the sidebar.
 *
 * Default mode renders a navigation <Link>; hovering reveals a pencil that
 * swaps the row into an input (still inside the <li>, without the link) so the
 * author can rename without navigating. Enter/blur saves; Escape reverts.
 */
function SidebarChapterRow({
  item,
  active,
  href,
  onRename,
}: {
  item: ChapterListItem;
  active: boolean;
  href: string;
  onRename: (chapterId: string, nextTitle: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(item.title);
  }, [editing, item.title]);

  useEffect(() => {
    if (editing) {
      const el = inputRef.current;
      el?.focus();
      el?.select();
    }
  }, [editing]);

  const startEdit = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(item.title);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(item.title);
    setEditing(false);
  };

  const commit = async () => {
    if (saving) return;
    const next = draft.trim();
    if (!next || next === item.title) {
      cancel();
      return;
    }
    setSaving(true);
    const ok = await onRename(item.id, next);
    setSaving(false);
    if (ok) {
      setEditing(false);
    } else {
      setDraft(item.title);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // If focus is moving to the confirm/cancel button we let those handle it.
    const next = e.relatedTarget as HTMLElement | null;
    if (next?.dataset.sidebarEditAction) return;
    void commit();
  };

  if (editing) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm",
          active ? "bg-gold/15" : "bg-muted/20",
        )}
      >
        <StatusDot status={item.status} />
        <span className="shrink-0 text-gold/80">{item.chapter_number}.</span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHAPTER_TITLE_LEN))}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={saving}
          maxLength={MAX_CHAPTER_TITLE_LEN}
          className="min-w-0 flex-1 rounded bg-editorial-bg/60 px-1.5 py-0.5 text-sm text-editorial-cream outline-none ring-1 ring-gold/40 focus:ring-2 focus:ring-gold/60"
        />
        <button
          type="button"
          data-sidebar-edit-action="save"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void commit()}
          disabled={saving}
          className="shrink-0 rounded p-1 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50"
          aria-label="Save chapter name"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          data-sidebar-edit-action="cancel"
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancel}
          disabled={saving}
          className="shrink-0 rounded p-1 text-editorial-muted hover:bg-muted/30 hover:text-editorial-cream disabled:opacity-50"
          aria-label="Cancel rename"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-2 pr-8 text-sm transition-colors",
          active
            ? "bg-gold/15 text-editorial-cream"
            : "text-editorial-muted hover:bg-muted/30 hover:text-editorial-cream",
        )}
      >
        <StatusDot status={item.status} />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-gold/80">{item.chapter_number}.</span> {item.title}
        </span>
      </Link>
      <button
        type="button"
        onClick={startEdit}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-editorial-muted opacity-0 transition hover:bg-muted/40 hover:text-editorial-cream focus:opacity-100 focus:outline-none group-hover:opacity-100"
        aria-label={`Rename chapter ${item.chapter_number}`}
        title="Rename chapter"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function ChapterSidebar({
  bookId,
  bookTitle,
  bookSubtitle,
  chapterId,
  sortedChapters,
  totalWords,
  batchBusy,
  isGenerating,
  aiBusy,
  onBookTitleChange,
  onBookTitleCommit,
  onBookSubtitleChange,
  onBookSubtitleCommit,
  onRenameChapter,
  onGenerateAll,
}: ChapterSidebarProps) {
  const busy = isGenerating || aiBusy;

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-border/70 bg-card/40">
      <div className="border-b border-border/60 px-4 py-4">
        <label className="sr-only" htmlFor="sidebar-book-title">
          Book title
        </label>
        <input
          id="sidebar-book-title"
          type="text"
          value={bookTitle}
          onChange={(e) => onBookTitleChange(e.target.value.slice(0, MAX_BOOK_TITLE_LEN))}
          onBlur={onBookTitleCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          disabled={busy}
          maxLength={MAX_BOOK_TITLE_LEN}
          placeholder="Book title"
          title="Click to edit the book title"
          className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 font-serif text-lg leading-snug text-gold outline-none transition placeholder:text-editorial-muted hover:border-border/60 hover:bg-editorial-bg/40 focus:border-gold/50 focus:bg-editorial-bg/60 focus:ring-0 disabled:opacity-60"
        />
        <label className="sr-only" htmlFor="sidebar-book-subtitle">
          Book subtitle
        </label>
        <input
          id="sidebar-book-subtitle"
          type="text"
          value={bookSubtitle}
          onChange={(e) => onBookSubtitleChange(e.target.value.slice(0, MAX_SUBTITLE_LEN))}
          onBlur={onBookSubtitleCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          disabled={busy}
          maxLength={MAX_SUBTITLE_LEN}
          placeholder="Add subtitleâ€¦"
          title="Click to edit the book subtitle"
          className="mt-1 w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs italic leading-snug text-editorial-muted outline-none transition placeholder:text-editorial-muted/60 hover:border-border/60 hover:bg-editorial-bg/40 focus:border-gold/50 focus:bg-editorial-bg/60 focus:not-italic focus:text-editorial-cream focus:ring-0 disabled:opacity-60"
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {sortedChapters.map((c) => (
            <li key={c.id}>
              <SidebarChapterRow
                item={c}
                active={c.id === chapterId}
                href={`/projects/${bookId}/chapters/${c.id}`}
                onRename={onRenameChapter}
              />
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-border/60 px-4 py-3 text-xs text-editorial-muted">
        Book total:{" "}
        <span className="font-medium text-editorial-cream">
          {totalWords.toLocaleString()} words
        </span>
      </div>
      <div className="space-y-2 border-t border-border/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-editorial-muted">
          Bulk write
        </p>
        <Button
          type="button"
          className="w-full border-gold/40 bg-transparent text-gold hover:bg-gold/10"
          variant="outline"
          disabled={batchBusy || isGenerating || aiBusy}
          onClick={onGenerateAll}
        >
          {batchBusy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Generating allâ€¦
            </>
          ) : (
            "Generate all chapters"
          )}
        </Button>
        <p className="text-[11px] leading-snug text-editorial-muted">
          Runs each chapter in order, or use one chapter at a time in the editor.
        </p>
      </div>
      <div className="p-3 pt-0">
        <Button
          asChild
          className="w-full bg-gold text-editorial-bg hover:bg-gold/90"
          variant="default"
        >
          <Link href={`/projects/${bookId}/export`}>Export book</Link>
        </Button>
      </div>
    </aside>
  );
}
~~~

## components/book/chapter-editor/find-replace-panel.tsx

~~~tsx
"use client";

import { forwardRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Replace as ReplaceIcon,
  Search,
  X,
} from "@/lib/lucide-icons";

export type FindReplacePanelProps = {
  findQuery: string;
  replaceQuery: string;
  caseSensitive: boolean;
  matchCount: number;
  matchIndex: number;
  disabled: boolean;
  onFindChange: (value: string) => void;
  onReplaceChange: (value: string) => void;
  onCaseSensitiveChange: (value: boolean) => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
};

export const FindReplacePanel = forwardRef<HTMLInputElement, FindReplacePanelProps>(
  function FindReplacePanel(
    {
      findQuery,
      replaceQuery,
      caseSensitive,
      matchCount,
      matchIndex,
      disabled,
      onFindChange,
      onReplaceChange,
      onCaseSensitiveChange,
      onFindNext,
      onFindPrev,
      onReplace,
      onReplaceAll,
      onClose,
    },
    ref,
  ) {
    return (
      <div className="flex flex-col gap-2 border-b border-border/50 bg-card/40 px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-editorial-muted" aria-hidden />
            <Input
              ref={ref}
              value={findQuery}
              onChange={(e) => onFindChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.shiftKey) onFindPrev();
                  else onFindNext();
                }
              }}
              placeholder="Find in chapterâ€¦"
              className="h-9"
            />
            <span className="shrink-0 text-xs text-editorial-muted">
              {matchCount === 0
                ? findQuery
                  ? "0 / 0"
                  : ""
                : `${matchIndex + 1} / ${matchCount}`}
            </span>
          </div>
          <div className="flex min-w-[220px] flex-1 items-center gap-2">
            <ReplaceIcon className="h-4 w-4 shrink-0 text-editorial-muted" aria-hidden />
            <Input
              value={replaceQuery}
              onChange={(e) => onReplaceChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onReplace();
                }
              }}
              placeholder="Replace withâ€¦"
              className="h-9"
            />
          </div>
          <label className="flex shrink-0 items-center gap-1 text-xs text-editorial-muted">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => onCaseSensitiveChange(e.target.checked)}
              className="accent-gold"
            />
            Match case
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={matchCount === 0}
            onClick={onFindPrev}
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={matchCount === 0}
            onClick={onFindNext}
            title="Next match (Enter)"
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={matchCount === 0 || disabled}
            onClick={onReplace}
          >
            Replace
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-gold text-editorial-bg hover:bg-gold/90"
            disabled={matchCount === 0 || disabled}
            onClick={onReplaceAll}
          >
            Replace all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close find and replace"
            title="Close (Esc)"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  },
);
~~~

## components/book/chapter-editor/hooks/use-chapter-realtime.ts

~~~ts
"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import type { ChapterStatusDb } from "@/types/database.types";

import type { ChapterListItem } from "../types";

export type ChapterRealtimePayload = {
  id: string;
  status: ChapterStatusDb;
  word_count: number | null;
  title?: string | null;
};

/**
 * Subscribes to chapter row updates for this book and fans them into the
 * sidebar list + current chapter title/status. Kept as a hook so the shell
 * doesn't own Supabase realtime wiring inline.
 */
export function useChapterRealtime({
  bookId,
  chapterId,
  onChapterRowUpdate,
  onCurrentChapterChanged,
}: {
  bookId: string;
  chapterId: string;
  onChapterRowUpdate: (
    mutate: (prev: ChapterListItem[]) => ChapterListItem[],
  ) => void;
  onCurrentChapterChanged: (row: ChapterRealtimePayload) => void;
}) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chapters-book-${bookId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chapters",
          filter: `book_id=eq.${bookId}`,
        },
        (payload) => {
          const row = payload.new as ChapterRealtimePayload;
          onChapterRowUpdate((prev) =>
            prev.map((c) =>
              c.id === row.id
                ? {
                    ...c,
                    status: row.status,
                    word_count: row.word_count ?? c.word_count,
                    title: row.title ?? c.title,
                  }
                : c,
            ),
          );
          if (row.id === chapterId) {
            onCurrentChapterChanged(row);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookId, chapterId, onChapterRowUpdate, onCurrentChapterChanged]);
}
~~~

## components/book/chapter-editor/hooks/use-find-matches.ts

~~~ts
"use client";

import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useState } from "react";

import type { FindMatch } from "../types";

/**
 * Walk the ProseMirror doc for literal substring matches inside text nodes.
 * Matches that span multiple text nodes (e.g. across bold/italic boundaries)
 * are intentionally skipped â€” those are rare and costly to track.
 */
export function findMatchesInDoc(
  editor: Editor,
  query: string,
  caseSensitive: boolean,
): FindMatch[] {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: FindMatch[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || typeof node.text !== "string") return;
    const hay = caseSensitive ? node.text : node.text.toLowerCase();
    let from = 0;
    while (from <= hay.length - needle.length) {
      const found = hay.indexOf(needle, from);
      if (found === -1) break;
      matches.push({ from: pos + found, to: pos + found + query.length });
      from = found + Math.max(needle.length, 1);
    }
  });
  return matches;
}

export function useFindMatches({
  editor,
  open,
  query,
  caseSensitive,
}: {
  editor: Editor | null;
  open: boolean;
  query: string;
  caseSensitive: boolean;
}) {
  const [matches, setMatches] = useState<FindMatch[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  const recompute = useCallback(
    (preferredIndex?: number) => {
      if (!editor || !query) {
        setMatches([]);
        setMatchIndex(0);
        return [] as FindMatch[];
      }
      const found = findMatchesInDoc(editor, query, caseSensitive);
      setMatches(found);
      if (found.length === 0) {
        setMatchIndex(0);
      } else if (preferredIndex != null) {
        setMatchIndex(Math.max(0, Math.min(preferredIndex, found.length - 1)));
      } else {
        setMatchIndex((i) => (i >= found.length ? 0 : i));
      }
      return found;
    },
    [caseSensitive, editor, query],
  );

  useEffect(() => {
    if (!open) return;
    recompute(0);
  }, [open, query, caseSensitive, recompute]);

  const gotoMatch = useCallback(
    (idx: number, list?: FindMatch[]) => {
      if (!editor) return;
      const m = (list ?? matches)[idx];
      if (!m) return;
      editor
        .chain()
        .focus()
        .setTextSelection({ from: m.from, to: m.to })
        .scrollIntoView()
        .run();
    },
    [editor, matches],
  );

  const findNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    gotoMatch(next);
  }, [gotoMatch, matchIndex, matches.length]);

  const findPrev = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(next);
    gotoMatch(next);
  }, [gotoMatch, matchIndex, matches.length]);

  return {
    matches,
    matchIndex,
    setMatches,
    setMatchIndex,
    recompute,
    gotoMatch,
    findNext,
    findPrev,
  };
}
~~~

## components/book/chapter-editor/link-popover.tsx

~~~tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2Off, X } from "@/lib/lucide-icons";

export type LinkPopoverProps = {
  open: boolean;
  initialHref: string | null;
  onClose: () => void;
  onApply: (href: string) => void;
  onUnlink: () => void;
};

function normaliseUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^(mailto:|tel:|https?:\/\/|\/\/|\/)/i.test(trimmed)) return trimmed;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/**
 * Compact centered dialog for inserting or editing a link. We keep it DOM-level
 * (no Radix portal) so it composes cleanly with the floating bubble menu.
 */
export function LinkPopover({
  open,
  initialHref,
  onClose,
  onApply,
  onUnlink,
}: LinkPopoverProps) {
  const [value, setValue] = useState(initialHref ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialHref ?? "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [initialHref, open]);

  if (!open) return null;

  const submit = () => {
    const href = normaliseUrl(value);
    if (!href) {
      onClose();
      return;
    }
    onApply(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Link editor"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/70 bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-editorial-cream">
            {initialHref ? "Edit link" : "Add link"}
          </p>
          <Button type="button" variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="example.com or https://example.com"
          className="h-10"
        />
        <p className="mt-2 text-[11px] text-editorial-muted">
          We'll add <code className="text-editorial-cream">https://</code> if you don't.
          Use an email to create a <code className="text-editorial-cream">mailto:</code> link.
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          {initialHref ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-editorial-muted hover:text-red-300"
              onClick={() => {
                onUnlink();
              }}
            >
              <Link2Off className="h-4 w-4" aria-hidden />
              Remove link
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-gold text-editorial-bg hover:bg-gold/90"
              onClick={submit}
            >
              {initialHref ? "Update" : "Add link"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
~~~

## components/book/chapter-editor/markdown.ts

~~~ts
import { marked } from "marked";
import TurndownService from "turndown";

import type { ChapterStatusDb } from "@/types/database.types";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Shared Turndown instance. `atx` headings keep round-trip parity with the
 * compiler (`## `, `### `, ...). We add rules for extensions StarterKit alone
 * does not round-trip cleanly:
 *
 * - `<u>â€¦</u>`         â†’ `<u>â€¦</u>` (inline HTML â€” marked echoes it back)
 * - `<hr>`             â†’ `\n\n* * *\n\n` (scene break / dinkus). Turndown's
 *    default rule emits `* * *` already; we keep it explicit for legibility.
 * - `<a href="â€¦">`     â†’ standard Markdown link (Turndown default handles it)
 */
const turndown = new TurndownService({ headingStyle: "atx" });

turndown.addRule("underline", {
  filter: ["u"],
  replacement: (content) => `<u>${content}</u>`,
});

turndown.addRule("sceneBreak", {
  filter: (node) => node.nodeName === "HR",
  replacement: () => "\n\n* * *\n\n",
});

turndown.addRule("strike", {
  filter: (node) => {
    const name = node.nodeName.toLowerCase();
    return name === "s" || name === "del" || name === "strike";
  },
  replacement: (content) => `~~${content}~~`,
});

export { turndown };

export function markdownToHtml(md: string): string {
  if (!md.trim()) return "<p></p>";
  return marked(md, { async: false }) as string;
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function countChars(text: string): number {
  return text.length;
}

/** 250 words â‰ˆ 1 minute of reading; round up, never below 1 for >0 words. */
export function estimateReadingMinutes(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / 250));
}

/**
 * Heuristic that decides whether a pasted string *looks* like Markdown so we
 * can route it through `marked` instead of letting TipTap paste it as plain
 * text. Intentionally conservative â€” we'd rather miss a subtle link than
 * corrupt a literal paste.
 */
export function isLikelyMarkdown(text: string): boolean {
  if (!text || text.length < 3) return false;
  const patterns: RegExp[] = [
    /^#{1,6}\s+\S/m, // headings
    /\*\*[^*\n]+\*\*/, // bold
    /(^|\s)_[^_\n]+_(\s|$)/, // underscore italics
    /~~[^~\n]+~~/, // strike
    /`[^`\n]+`/, // inline code
    /^```/m, // code block
    /^>\s+\S/m, // blockquote
    /^\s*[-*+]\s+\S/m, // unordered list
    /^\s*\d+\.\s+\S/m, // ordered list
    /\[[^\]\n]+\]\([^)\s]+\)/, // link
    /^\s*\*\s\*\s\*\s*$/m, // dinkus
  ];
  return patterns.some((re) => re.test(text));
}

export function statusBadgeClass(status: ChapterStatusDb): string {
  switch (status) {
    case "pending":
      return "bg-muted text-muted-foreground";
    case "generating":
      return "bg-gold/20 text-gold";
    case "draft":
      return "bg-sky-500/15 text-sky-300";
    case "edited":
    case "approved":
      return "bg-emerald-500/15 text-emerald-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}
~~~

## components/book/chapter-editor/outline-panel.tsx

~~~tsx
"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2, Wand2 } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

export type OutlinePanelProps = {
  outlineSummary: string;
  onOutlineChange: (value: string) => void;
  onOutlineBlur: () => void;
  authorNotes: string;
  onAuthorNotesChange: (value: string) => void;
  onAuthorNotesBlur: () => void;
  expandOpen: boolean;
  expandPrompt: string;
  expandBusy: boolean;
  onToggleExpand: () => void;
  onExpandPromptChange: (value: string) => void;
  onExpand: () => void;
  disabled: boolean;
};

export function OutlinePanel({
  outlineSummary,
  onOutlineChange,
  onOutlineBlur,
  authorNotes,
  onAuthorNotesChange,
  onAuthorNotesBlur,
  expandOpen,
  expandPrompt,
  expandBusy,
  onToggleExpand,
  onExpandPromptChange,
  onExpand,
  disabled,
}: OutlinePanelProps) {
  return (
    <details className="group border-b border-border/50 bg-card/20 px-6 py-3" open>
      <summary className="cursor-pointer list-none font-medium text-gold marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-sm">Chapter outline &amp; steering</span>
        <span className="ml-2 text-xs font-normal text-editorial-muted">
          (guides AI â€” edit before regenerate)
        </span>
      </summary>
      <p className="mt-2 text-xs text-editorial-muted">
        This is the outline slice for this chapter. The generator reads it from the
        database when you run <strong className="text-editorial-cream">Regenerate</strong>{" "}
        or <strong className="text-editorial-cream">Generate all chapters</strong>.
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
          Outline
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            expandOpen && "bg-gold/15 text-gold",
          )}
          disabled={disabled || expandBusy}
          onClick={onToggleExpand}
          aria-expanded={expandOpen}
          title="Expand the outline for this chapter with AI"
        >
          <Wand2 className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Expand outline</span>
          {expandOpen ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
        </Button>
      </div>

      <textarea
        value={outlineSummary}
        onChange={(e) => onOutlineChange(e.target.value)}
        onBlur={onOutlineBlur}
        disabled={disabled || expandBusy}
        rows={5}
        placeholder="What this chapter should cover â€” edit anytime before generating."
        className="mt-1 w-full resize-y rounded-lg border border-border/60 bg-editorial-bg/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
      />

      {expandOpen ? (
        <div className="mt-3 rounded-lg border border-gold/30 bg-editorial-bg/60 p-3">
          <p className="text-xs text-editorial-muted">
            AI will deepen the outline into 4â€“8 beats for this chapter only. Optionally
            add a steering note to focus the expansion (e.g.{" "}
            <em className="text-editorial-cream">
              &ldquo;lean harder into the mentor&rsquo;s backstory&rdquo;
            </em>
            ).
          </p>
          <textarea
            value={expandPrompt}
            onChange={(e) => onExpandPromptChange(e.target.value)}
            rows={2}
            maxLength={2_000}
            disabled={expandBusy}
            placeholder="Optional direction for the expansionâ€¦"
            className="mt-2 w-full resize-y rounded-md border border-border/60 bg-editorial-bg/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-editorial-muted">
              {expandPrompt.length}/2000 Â· replaces the current outline
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={expandBusy}
                onClick={onToggleExpand}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={expandBusy}
                onClick={onExpand}
              >
                {expandBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Expandingâ€¦
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-1.5 h-4 w-4" aria-hidden />
                    Expand outline
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <label
          htmlFor="chapter-author-notes"
          className="text-xs font-semibold uppercase tracking-wide text-editorial-muted"
        >
          Steering notes for AI (optional)
        </label>
        <p className="mt-1 text-xs text-editorial-muted">
          Freeform instructions the generator must follow for this chapter â€” e.g.{" "}
          <em className="text-editorial-cream">&ldquo;keep Sarah&rsquo;s POV only&rdquo;</em>,{" "}
          <em className="text-editorial-cream">&ldquo;end on a cliffhanger&rdquo;</em>,{" "}
          <em className="text-editorial-cream">
            &ldquo;include a short flashback to the lighthouse&rdquo;
          </em>
          . Applied on every regenerate.
        </p>
        <textarea
          id="chapter-author-notes"
          value={authorNotes}
          onChange={(e) => onAuthorNotesChange(e.target.value)}
          onBlur={onAuthorNotesBlur}
          disabled={disabled || expandBusy}
          rows={3}
          maxLength={4_000}
          placeholder="Tell the AI how to steer this chapter on regenerateâ€¦"
          className="mt-2 w-full resize-y rounded-lg border border-border/60 bg-editorial-bg/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
        />
        <div className="mt-1 text-right text-[11px] text-editorial-muted">
          {authorNotes.length}/4000
        </div>
      </div>
    </details>
  );
}
~~~

## components/book/chapter-editor/pending-state.tsx

~~~tsx
"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "@/lib/lucide-icons";

export type PendingStateProps = {
  title: string;
  outlineSummary: string;
  onOutlineChange: (value: string) => void;
  onOutlineBlur: () => void;
  batchBusy: boolean;
  onGenerateOne: () => void;
  onGenerateAll: () => void;
};

export function PendingState({
  title,
  outlineSummary,
  onOutlineChange,
  onOutlineBlur,
  batchBusy,
  onGenerateOne,
  onGenerateAll,
}: PendingStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="w-full max-w-xl space-y-4 text-left">
        <p className="text-center font-serif text-2xl text-gold">{title}</p>
        <div>
          <label
            htmlFor="pending-outline"
            className="text-xs font-semibold uppercase tracking-wide text-editorial-muted"
          >
            Outline for this chapter
          </label>
          <textarea
            id="pending-outline"
            value={outlineSummary}
            onChange={(e) => onOutlineChange(e.target.value)}
            onBlur={onOutlineBlur}
            disabled={batchBusy}
            rows={6}
            placeholder="Describe what this chapter should cover. You can edit this anytime; generation uses the saved text."
            className="mt-2 w-full resize-y rounded-lg border border-border/60 bg-editorial-bg/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button
          type="button"
          className="bg-gold px-8 py-6 text-base font-semibold text-editorial-bg hover:bg-gold/90"
          disabled={batchBusy}
          onClick={onGenerateOne}
        >
          Generate chapter
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-gold/50 px-6 py-6 text-editorial-cream hover:bg-gold/10"
          disabled={batchBusy}
          onClick={onGenerateAll}
        >
          {batchBusy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Workingâ€¦
            </>
          ) : (
            "Generate all chapters"
          )}
        </Button>
      </div>
    </div>
  );
}
~~~

## components/book/chapter-editor/save-indicator.tsx

~~~tsx
"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, Loader2 } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { SaveState } from "./types";

function formatRelative(from: Date, now: Date): string {
  const deltaSec = Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000));
  if (deltaSec < 5) return "just now";
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const min = Math.round(deltaSec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function SaveIndicator({
  state,
  lastSavedAt,
  onRetry,
}: {
  state: SaveState;
  lastSavedAt: Date | null;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  if (state === "saving") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 text-xs text-editorial-muted"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" aria-hidden />
        Savingâ€¦
      </span>
    );
  }

  if (state === "dirty") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        Unsaved changes
      </span>
    );
  }

  if (state === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-200 hover:bg-red-500/20"
        title="Retry save"
      >
        Save failed â€” retry
      </button>
    );
  }

  const label = lastSavedAt
    ? `Saved ${formatRelative(lastSavedAt, now)}`
    : "Saved";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-2.5 py-0.5 text-xs text-editorial-muted",
      )}
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/80" aria-hidden />
      {label}
    </span>
  );
}
~~~

## components/book/chapter-editor/shortcut-cheatsheet.tsx

~~~tsx
"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { X } from "@/lib/lucide-icons";

export type ShortcutRow = { keys: string[]; label: string };

const SECTIONS: { title: string; rows: ShortcutRow[] }[] = [
  {
    title: "Formatting",
    rows: [
      { keys: ["Ctrl/Cmd", "B"], label: "Bold" },
      { keys: ["Ctrl/Cmd", "I"], label: "Italic" },
      { keys: ["Ctrl/Cmd", "U"], label: "Underline" },
      { keys: ["Ctrl/Cmd", "Shift", "S"], label: "Strikethrough" },
      { keys: ["Ctrl/Cmd", "E"], label: "Inline code" },
      { keys: ["Ctrl/Cmd", "Shift", "K"], label: "Code block" },
      { keys: ["Ctrl/Cmd", "Alt", "1-4"], label: "Heading 1â€“4" },
      { keys: ["Ctrl/Cmd", "Shift", "7"], label: "Numbered list" },
      { keys: ["Ctrl/Cmd", "Shift", "8"], label: "Bulleted list" },
      { keys: ["Ctrl/Cmd", "Shift", "B"], label: "Blockquote" },
    ],
  },
  {
    title: "Editing",
    rows: [
      { keys: ["Ctrl/Cmd", "Z"], label: "Undo" },
      { keys: ["Ctrl/Cmd", "Shift", "Z"], label: "Redo" },
      { keys: ["Ctrl/Cmd", "F"], label: "Find & replace" },
      { keys: ["Ctrl/Cmd", "K"], label: "Add / edit link" },
      { keys: ["Enter"], label: "Next match (in Find)" },
      { keys: ["Shift", "Enter"], label: "Previous match (in Find)" },
    ],
  },
  {
    title: "View",
    rows: [
      { keys: ["?"], label: "Show this cheatsheet" },
      { keys: ["Esc"], label: "Close panels / dialogs" },
    ],
  },
];

export function ShortcutCheatsheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-border/70 bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-serif text-lg text-gold">Keyboard shortcuts</p>
            <p className="text-xs text-editorial-muted">
              Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">?</kbd> anywhere in the
              editor to open this sheet. Press{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">Esc</kbd> to close.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-editorial-muted">
                {section.title}
              </p>
              <dl className="mt-2 space-y-1.5">
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 text-sm text-editorial-cream"
                  >
                    <dt className="truncate">{row.label}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {row.keys.map((k, i) => (
                        <kbd
                          key={`${row.label}-${i}`}
                          className="rounded border border-border/70 bg-editorial-bg/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-editorial-muted"
                        >
                          {k}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
~~~

## components/book/chapter-editor/toolbar.tsx

~~~tsx
"use client";

import type { Editor } from "@tiptap/core";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Bold,
  ChevronDown,
  ChevronUp,
  Code,
  Code2,
  Expand,
  Italic,
  Keyboard,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  PenLine,
  Quote,
  Redo2,
  Search,
  Sparkles,
  SpellCheck2,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Undo2,
  Wand2,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { AssistToneOption } from "./types";

export type ToolbarProps = {
  editor: Editor | null;
  toolbarDisabled: boolean;
  aiBusy: boolean;
  findOpen: boolean;
  spellcheckOn: boolean;
  zenMode: boolean;
  typewriterMode: boolean;
  expandPromptOpen: boolean;
  rewritePromptOpen: boolean;
  onRegenerate: () => void;
  onOpenExpand: () => void;
  onOpenRewrite: () => void;
  onShorten: () => void;
  onProofread: () => void;
  onContinue: () => void;
  onTone: (tone: AssistToneOption) => void;
  onToggleFind: () => void;
  onToggleSpellcheck: () => void;
  onToggleZen: () => void;
  onToggleTypewriter: () => void;
  onShowCheatsheet: () => void;
  onOpenLink: () => void;
};

function ToolbarBtn({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "h-9 min-w-9 px-2 text-editorial-muted hover:text-gold",
        active && "bg-gold/15 text-gold",
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function HeadingPicker({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const currentLevel = editor
    ? [1, 2, 3, 4].find((l) => editor.isActive("heading", { level: l })) ?? 0
    : 0;
  const value = currentLevel === 0 ? "p" : `h${currentLevel}`;
  return (
    <select
      className="h-9 rounded-md border border-border/60 bg-editorial-bg/70 px-2 text-xs text-editorial-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
      disabled={disabled || !editor}
      value={value}
      onChange={(e) => {
        if (!editor) return;
        const v = e.target.value;
        if (v === "p") {
          editor.chain().focus().setParagraph().run();
        } else {
          const level = Number(v.slice(1)) as 1 | 2 | 3 | 4;
          editor.chain().focus().setHeading({ level }).run();
        }
      }}
      title="Paragraph / heading level"
      aria-label="Paragraph or heading level"
    >
      <option value="p">Paragraph</option>
      <option value="h1">Heading 1</option>
      <option value="h2">Heading 2</option>
      <option value="h3">Heading 3</option>
      <option value="h4">Heading 4</option>
    </select>
  );
}

export function EditorToolbar({
  editor,
  toolbarDisabled,
  aiBusy,
  findOpen,
  spellcheckOn,
  zenMode,
  typewriterMode,
  expandPromptOpen,
  rewritePromptOpen,
  onRegenerate,
  onOpenExpand,
  onOpenRewrite,
  onShorten,
  onProofread,
  onContinue,
  onTone,
  onToggleFind,
  onToggleSpellcheck,
  onToggleZen,
  onToggleTypewriter,
  onShowCheatsheet,
  onOpenLink,
}: ToolbarProps) {
  const canUndo = editor?.can().undo() ?? false;
  const canRedo = editor?.can().redo() ?? false;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border/50 bg-card/30 px-4 py-2">
      <ToolbarBtn
        disabled={toolbarDisabled || !editor || !canUndo}
        onClick={() => editor?.chain().focus().undo().run()}
        label="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor || !canRedo}
        onClick={() => editor?.chain().focus().redo().run()}
        label="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <HeadingPicker editor={editor} disabled={toolbarDisabled} />
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("bold")}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        label="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("italic")}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        label="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("underline")}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        label="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("strike")}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("code")}
        onClick={() => editor?.chain().focus().toggleCode().run()}
        label="Inline code (Ctrl+E)"
      >
        <Code className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("bulletList")}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        label="Bulleted list"
      >
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("orderedList")}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("blockquote")}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        label="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("codeBlock")}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        label="Code block"
      >
        <Code2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("link")}
        onClick={onOpenLink}
        label="Add / edit link (Ctrl+K)"
      >
        <Link2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        label="Scene break (* * *)"
      >
        <span className="font-serif text-sm tracking-[0.3em]">***</span>
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onRegenerate}
        title="Regenerate this chapter from scratch"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        <Sparkles className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Regenerate</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onContinue}
        title="Continue writing from the cursor position"
      >
        {aiBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <PenLine className="h-4 w-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Continue</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1 text-editorial-muted hover:text-gold",
          expandPromptOpen && "bg-gold/15 text-gold",
        )}
        disabled={toolbarDisabled}
        onClick={onOpenExpand}
        aria-expanded={expandPromptOpen}
        title="Expand selection with optional custom instruction"
      >
        <Expand className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Expand</span>
        {expandPromptOpen ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1 text-editorial-muted hover:text-gold",
          rewritePromptOpen && "bg-gold/15 text-gold",
        )}
        disabled={toolbarDisabled}
        onClick={onOpenRewrite}
        aria-expanded={rewritePromptOpen}
        title="Rewrite selection with a custom instruction"
      >
        <Wand2 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Rewrite</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onShorten}
        title="Shorten selection (~30% tighter)"
      >
        <span className="hidden sm:inline">Shorten</span>
        <span className="sm:hidden">âˆ’</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onProofread}
        title="Proofread selection (grammar & spelling only)"
      >
        <SpellCheck2 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Proofread</span>
      </Button>
      <label className="flex items-center gap-1 text-xs text-editorial-muted">
        <span className="hidden sm:inline">Tone</span>
        <select
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          disabled={toolbarDisabled}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as "" | AssistToneOption;
            e.target.value = "";
            if (!v) return;
            onTone(v);
          }}
        >
          <option value="">Change toneâ€¦</option>
          <option value="formal">More formal</option>
          <option value="casual">More casual</option>
          <option value="dramatic">More dramatic</option>
        </select>
      </label>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor}
          aria-pressed={findOpen}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            findOpen && "bg-gold/15 text-gold",
          )}
          title="Find and replace (Ctrl+F)"
          onClick={onToggleFind}
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Find</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={spellcheckOn}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            spellcheckOn && "bg-gold/15 text-gold",
          )}
          title={`Spell check ${spellcheckOn ? "on" : "off"}`}
          onClick={onToggleSpellcheck}
        >
          <Type className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">
            Spell check {spellcheckOn ? "on" : "off"}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={typewriterMode}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            typewriterMode && "bg-gold/15 text-gold",
          )}
          title={`Typewriter mode ${typewriterMode ? "on" : "off"}`}
          onClick={onToggleTypewriter}
        >
          <span className="hidden md:inline">Typewriter</span>
          <span className="md:hidden">TW</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={zenMode}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            zenMode && "bg-gold/15 text-gold",
          )}
          title={zenMode ? "Exit focus mode (Esc)" : "Focus (zen) mode"}
          onClick={onToggleZen}
        >
          {zenMode ? (
            <Minimize2 className="h-4 w-4" aria-hidden />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden lg:inline">{zenMode ? "Exit focus" : "Focus"}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-editorial-muted hover:text-gold"
          title="Keyboard shortcuts (?)"
          onClick={onShowCheatsheet}
        >
          <Keyboard className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
~~~

## components/book/chapter-editor/types.ts

~~~ts
import type { ChapterStatusDb, SubscriptionTierDb } from "@/types/database.types";

export type ChapterListItem = {
  id: string;
  chapter_number: number;
  title: string;
  status: ChapterStatusDb;
  word_count: number;
};

export type ChapterDetail = ChapterListItem & {
  content: string | null;
  outline_summary: string | null;
  author_notes: string | null;
  target_word_count: number | null;
};

export type ChapterEditorProps = {
  bookId: string;
  bookTitle: string;
  bookSubtitle: string | null;
  initialChapters: ChapterListItem[];
  chapter: ChapterDetail;
  subscriptionTier: SubscriptionTierDb;
};

export type FindMatch = { from: number; to: number };

/**
 * `idle` â€” nothing to save and no in-flight save.
 * `dirty` â€” editor has unsaved changes (typed since last save).
 * `saving` â€” a save request is in flight.
 * `error` â€” the last save failed; retry on next blur / autosave tick.
 */
export type SaveState = "idle" | "dirty" | "saving" | "error";

export type AssistAction =
  | "expand"
  | "rewrite"
  | "shorten"
  | "proofread"
  | "continue"
  | "tone";

export type AssistToneOption = "formal" | "casual" | "dramatic";

export type AssistPromptPanel =
  | null
  | {
      /**
       * Only actions that accept a free-form prompt render the panel. `continue`
       * and `tone` run directly from the toolbar / bubble menu without a panel.
       */
      action: "expand" | "rewrite";
      prompt: string;
    };
~~~

## components/book/chapter-editor/word-target.tsx

~~~tsx
"use client";

import { useEffect, useState } from "react";

import { Target } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

export const WORD_TARGET_MIN = 100;
export const WORD_TARGET_MAX = 20_000;

function clampTarget(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  if (rounded < WORD_TARGET_MIN) return WORD_TARGET_MIN;
  if (rounded > WORD_TARGET_MAX) return WORD_TARGET_MAX;
  return rounded;
}

export type WordTargetProps = {
  target: number | null;
  currentWords: number;
  disabled?: boolean;
  onSave: (next: number | null) => void;
};

export function WordTarget({ target, currentWords, disabled, onSave }: WordTargetProps) {
  const [raw, setRaw] = useState(target != null ? String(target) : "");

  useEffect(() => {
    setRaw(target != null ? String(target) : "");
  }, [target]);

  const commit = () => {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (target != null) onSave(null);
      return;
    }
    const parsed = Number(trimmed.replace(/[,\s]/g, ""));
    if (Number.isNaN(parsed)) {
      setRaw(target != null ? String(target) : "");
      return;
    }
    const next = clampTarget(parsed);
    setRaw(next != null ? String(next) : "");
    if (next !== target) onSave(next);
  };

  const pct =
    target && target > 0
      ? Math.min(100, Math.round((currentWords / target) * 100))
      : 0;
  const hit = target != null && currentWords >= target;

  return (
    <div className="flex items-center gap-2">
      <Target className="h-4 w-4 shrink-0 text-editorial-muted" aria-hidden />
      <label className="text-xs text-editorial-muted">
        Target
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="â€”"
          disabled={disabled}
          aria-label={`Target word count (${WORD_TARGET_MIN}â€“${WORD_TARGET_MAX})`}
          className="ml-1.5 w-16 rounded-md border border-border/60 bg-editorial-bg/70 px-1.5 py-0.5 text-right text-xs text-editorial-cream focus:outline-none focus:ring-1 focus:ring-gold/50 disabled:opacity-60"
        />
        <span className="ml-1 text-[10px] uppercase tracking-wide">words</span>
      </label>
      {target != null ? (
        <div
          className="relative h-1.5 w-32 overflow-hidden rounded-full bg-muted/40"
          aria-label={`Progress ${pct}%`}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out",
              hit ? "bg-gold" : "bg-gold/60",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {target != null ? (
        <span
          className={cn(
            "text-[11px] tabular-nums text-editorial-muted",
            hit && "font-semibold text-gold",
          )}
        >
          {currentWords.toLocaleString()} / {target.toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}
~~~

## components/book/CoverGenerator.tsx

~~~tsx
"use client";

import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const LOADING_MESSAGES = [
  "Designing your coverâ€¦",
  "Painting the sceneâ€¦",
  "Almost thereâ€¦",
] as const;

function displayPremise(refinedIdea: string | null): string {
  if (!refinedIdea?.trim()) {
    return "Add a refined idea on the idea step to give the cover more context â€” or rely on title and genre.";
  }
  try {
    const o = JSON.parse(refinedIdea) as Record<string, unknown>;
    const p = o.core_premise ?? o.premise;
    if (typeof p === "string" && p.trim()) return p.trim();
  } catch {
    /* fall through */
  }
  return refinedIdea.trim().slice(0, 800) + (refinedIdea.length > 800 ? "â€¦" : "");
}

export type CoverGeneratorProps = {
  bookId: string;
  bookTitle: string;
  genre: string | null;
  refinedIdea: string | null;
  tone: string | null;
  initialCoverUrl: string | null;
  initialCoverPrompt: string | null;
};

export function CoverGenerator({
  bookId,
  bookTitle,
  genre,
  refinedIdea,
  tone,
  initialCoverUrl,
  initialCoverPrompt,
}: CoverGeneratorProps) {
  const router = useRouter();
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [coverPrompt, setCoverPrompt] = useState<string | null>(initialCoverPrompt);
  const [imageKey, setImageKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [continueBusy, setContinueBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCoverUrl(initialCoverUrl);
    setCoverPrompt(initialCoverPrompt);
    setImageKey((k) => k + 1);
  }, [initialCoverUrl, initialCoverPrompt]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, [loading]);

  const runGenerate = useCallback(async () => {
    setLoading(true);
    setMsgIndex(0);
    try {
      const res = await fetch("/api/ai/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        coverUrl?: string;
        prompt?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.coverUrl) {
        throw new Error(data?.error ?? "Cover generation failed.");
      }
      setCoverUrl(data.coverUrl);
      setCoverPrompt(data.prompt ?? null);
      setImageKey((k) => k + 1);
      toast.success("Cover ready.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cover generation failed.");
    } finally {
      setLoading(false);
    }
  }, [bookId, router]);

  const onOwnCover = useCallback(async (file: File) => {
    const okType = file.type === "image/png" || file.type === "image/jpeg";
    if (!okType) {
      toast.error("Please upload a PNG or JPG file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Image must be 12MB or smaller.");
      return;
    }
    setUploadBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You need to be signed in to upload.");
        return;
      }
      const path = `${user.id}/${bookId}/cover.png`;
      const { error: upErr } = await supabase.storage.from("covers").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (upErr) {
        toast.error("Upload failed. Check storage permissions.");
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("covers").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("books")
        .update({
          cover_url: publicUrl,
          cover_prompt: "Author-uploaded cover",
        })
        .eq("id", bookId);
      if (dbErr) {
        toast.error("Could not save cover URL.");
        return;
      }
      setCoverUrl(publicUrl);
      setCoverPrompt("Author-uploaded cover");
      setImageKey((k) => k + 1);
      toast.success("Cover uploaded.");
      router.refresh();
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [bookId, router]);

  const continueToExport = useCallback(async () => {
    setContinueBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("books")
        .update({ status: "complete" })
        .eq("id", bookId);
      if (error) {
        toast.error("Could not update book status.");
        return;
      }
      router.push(`/projects/${bookId}/export`);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setContinueBusy(false);
    }
  }, [bookId, router]);

  const premise = displayPremise(refinedIdea);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="space-y-2 border-b border-border/60 pb-6">
        <h1 className="font-serif text-3xl text-gold">{bookTitle}</h1>
        <p className="text-sm text-editorial-muted">
          <span className="font-medium text-editorial-cream">Genre:</span>{" "}
          {genre?.trim() || "â€”"}
          {tone ? (
            <>
              {" "}
              <span className="mx-1 text-border">Â·</span>{" "}
              <span className="font-medium text-editorial-cream">Tone:</span> {tone}
            </>
          ) : null}
        </p>
        <p className="text-sm leading-relaxed text-editorial-cream/90">{premise}</p>
      </header>

      <div className="mt-8 flex flex-col items-center gap-8">
        {!coverUrl && !loading ? (
          <Button
            type="button"
            className="h-auto gap-2 bg-gold px-10 py-6 text-lg font-semibold text-editorial-bg hover:bg-gold/90"
            onClick={() => void runGenerate()}
          >
            <Sparkles className="h-6 w-6" aria-hidden />
            Generate cover
          </Button>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-gold" aria-hidden />
            <p className="min-h-[1.5rem] text-center text-sm text-editorial-muted transition-all">
              {LOADING_MESSAGES[msgIndex]}
            </p>
          </div>
        ) : null}

        {coverUrl && !loading ? (
          <div className="flex w-full flex-col items-center gap-6">
            <div className="w-full max-w-md overflow-hidden rounded-lg border border-border/60 bg-black shadow-xl">
              <p className="border-b border-border/50 bg-card/60 px-3 py-2 text-center text-xs text-editorial-muted">
                Same image file you&apos;ll upload to KDP â€” flat cover, not a 3D mockup
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={imageKey}
                src={`${coverUrl}${coverUrl.includes("?") ? "&" : "?"}v=${imageKey}`}
                alt={`Front cover artwork for ${bookTitle}`}
                className="block h-auto w-full object-cover"
              />
            </div>

            {coverPrompt ? (
              <details className="w-full max-w-xl rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-left">
                <summary className="cursor-pointer list-none text-xs text-editorial-muted marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="underline-offset-2 hover:underline">Image prompt used</span>
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-editorial-muted">
                  {coverPrompt}
                </p>
              </details>
            ) : null}

            <div className="flex w-full max-w-xl flex-col items-center gap-3">
              <p className="text-center text-xs text-editorial-muted">
                Edit the <span className="text-editorial-cream">title</span>,{" "}
                <span className="text-editorial-cream">subtitle</span>, or{" "}
                <span className="text-editorial-cream">author by-line</span> on the right â€”
                they&apos;ll be baked into the image on your next regenerate.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gold/40 text-gold hover:bg-gold/10"
                  disabled={loading}
                  onClick={() => void runGenerate()}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onOwnCover(f);
          }}
        />
        <button
          type="button"
          className={cn(
            "text-sm text-editorial-muted underline-offset-4 transition-colors hover:text-gold hover:underline",
            uploadBusy && "pointer-events-none opacity-60",
          )}
          disabled={uploadBusy || loading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadBusy ? "Uploadingâ€¦" : "I'll use my own cover"}
        </button>
      </div>

      <div className="mt-12 flex justify-center border-t border-border/50 pt-8">
        <Button
          type="button"
          className="h-auto gap-2 bg-gold px-8 py-4 text-base font-semibold text-editorial-bg hover:bg-gold/90"
          disabled={continueBusy || !coverUrl}
          onClick={() => void continueToExport()}
        >
          {continueBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <>
              Continue to export
              <ChevronRight className="h-5 w-5" aria-hidden />
            </>
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-editorial-muted">
        Prefer to tweak the manuscript first?{" "}
        <Link href={`/projects/${bookId}/outline`} className="text-gold hover:underline">
          Back to outline
        </Link>
      </p>
    </div>
  );
}
~~~

## components/book/dashboard-client.tsx

~~~tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  Hash,
  PenLine,
  Sparkles,
  Type,
} from "@/lib/lucide-icons";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createBookAction,
  loadMoreDashboardBooksAction,
} from "@/app/(dashboard)/dashboard/actions";
import { ExampleBookModal } from "@/components/book/ExampleBookModal";
import { OnboardingModal } from "@/components/book/OnboardingModal";
import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";
import { Button } from "@/components/ui/button";
import { FREE_BOOK_LIMIT } from "@/lib/subscription/limits";
import type { SubscriptionTierDb } from "@/types/database.types";
import type { DashboardBook } from "@/types/book.types";

import { ProjectCard } from "./ProjectCard";

export type DashboardLifetimeStats = {
  totalBooks: number;
  totalWordsWritten: number;
  chaptersGenerated: number;
  booksCompleted: number;
};

type DashboardClientProps = {
  books: DashboardBook[];
  hasMoreBooks: boolean;
  subscriptionTier: SubscriptionTierDb;
  bookCount: number;
  freeBookLimit: number;
  hasSeenOnboarding: boolean;
  greetingName: string;
  stats: DashboardLifetimeStats;
};

export function DashboardClient({
  books: initialBooks,
  hasMoreBooks: initialHasMore,
  subscriptionTier,
  bookCount,
  freeBookLimit,
  hasSeenOnboarding,
  greetingName,
  stats,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notified = useRef(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding);
  const [isPending, startTransition] = useTransition();
  const [pagedBooks, setPagedBooks] = useState(initialBooks);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadMoreBusy, setLoadMoreBusy] = useState(false);

  useEffect(() => {
    setShowOnboarding(!hasSeenOnboarding);
  }, [hasSeenOnboarding]);

  useEffect(() => {
    setPagedBooks(initialBooks);
    setHasMore(initialHasMore);
  }, [initialBooks, initialHasMore]);

  useEffect(() => {
    if (notified.current) {
      return;
    }
    const upgraded = searchParams.get("upgraded");
    if (upgraded === "true") {
      notified.current = true;
      toast.success("Welcome to Pro!", {
        description: "You now have unlimited books and chapter generation.",
      });
      router.replace("/dashboard", { scroll: false });
      return;
    }
    const err = searchParams.get("error");
    if (!err) {
      return;
    }
    notified.current = true;
    if (err === "limit") {
      toast.warning("You have reached the Free plan limit of three books.", {
        description:
          "Upgrade to Pro for unlimited projects, or delete a book to continue.",
      });
    } else if (err === "create") {
      toast.error("We could not create a new book. Please try again.");
    } else if (err === "profile") {
      toast.error("Your profile could not be loaded. Try refreshing the page.");
    }
    router.replace("/dashboard", { scroll: false });
  }, [router, searchParams]);

  const isFree = subscriptionTier === "free";
  const slotsLabel = `${Math.min(bookCount, freeBookLimit)} of ${freeBookLimit} books used`;

  const handleCreateBook = () => {
    if (isFree && bookCount >= FREE_BOOK_LIMIT) {
      setUpgradeOpen(true);
      return;
    }
    startTransition(() => {
      void createBookAction();
    });
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  const handleLoadMore = async () => {
    setLoadMoreBusy(true);
    try {
      const { books: next, hasMore: more } = await loadMoreDashboardBooksAction(pagedBooks.length);
      setPagedBooks((prev) => [...prev, ...next]);
      setHasMore(more);
    } catch {
      toast.error("Could not load more books.");
    } finally {
      setLoadMoreBusy(false);
    }
  };

  return (
    <>
      <OnboardingModal open={showOnboarding} onClose={handleOnboardingClose} />
      <ExampleBookModal open={exampleOpen} onClose={() => setExampleOpen(false)} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <ProUpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          title="Upgrade to Pro for unlimited books"
          description="The Free plan includes up to three manuscripts. Upgrade to Pro to start your fourth book and unlock unlimited chapter generation."
        />

        <div className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-editorial-cream sm:text-4xl">
              Your library
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-editorial-muted">
              Every row is a manuscript in motionâ€”from first spark to export-ready chapters.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wide text-editorial-muted">
              <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-editorial-cream">
                Plan:{" "}
                <span className="text-gold">{subscriptionTier === "pro" ? "Pro" : "Free"}</span>
              </span>
              {isFree ? (
                <span className="rounded-full border border-border bg-card/60 px-3 py-1">
                  {slotsLabel}
                </span>
              ) : (
                <span className="rounded-full border border-border bg-card/60 px-3 py-1">
                  Unlimited books
                </span>
              )}
            </div>
          </div>
          {bookCount > 0 ? (
            <Button
              type="button"
              className="w-full shrink-0 bg-gold font-semibold text-editorial-bg hover:bg-gold/90 sm:w-auto"
              disabled={isPending}
              onClick={() => handleCreateBook()}
            >
              {isPending ? "Creatingâ€¦" : "New Book"}
            </Button>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-border/70 bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <BookMarked className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                Books created
              </p>
              <p className="mt-0.5 font-serif text-2xl text-editorial-cream">{stats.totalBooks}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Type className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                Words written
              </p>
              <p className="mt-0.5 font-serif text-2xl text-editorial-cream">
                {stats.totalWordsWritten.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Hash className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                Chapters generated
              </p>
              <p className="mt-0.5 font-serif text-2xl text-editorial-cream">
                {stats.chaptersGenerated.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                Books completed
              </p>
              <p className="mt-0.5 font-serif text-2xl text-editorial-cream">{stats.booksCompleted}</p>
            </div>
          </div>
        </div>

        {stats.totalBooks === 0 ? (
          <section className="mt-12 rounded-3xl border border-gold/25 bg-gradient-to-b from-card/80 via-editorial-bg/90 to-editorial-bg px-6 py-12 sm:px-10 sm:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Let&apos;s begin
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-editorial-cream sm:text-4xl">
                Welcome to ChapterAI, {greetingName}!
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-editorial-muted">
                You&apos;re one click away from your first manuscript. We&apos;ll help you shape the
                idea, draft every chapter, design a cover, and export for Amazon KDP.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Pitch your idea",
                  body: "Tell us what you want to writeâ€”genre, mood, or a messy paragraph.",
                },
                {
                  step: "2",
                  title: "Generate chapters",
                  body: "Approve an outline, then draft and refine each chapter in the studio.",
                },
                {
                  step: "3",
                  title: "Publish on Amazon",
                  body: "Export a KDP-ready Word file, cover art, and a personalized checklist.",
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-border/70 bg-card/50 p-5 text-left shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-serif text-lg text-editorial-cream">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-editorial-muted">{item.body}</p>
                  {i < 2 ? (
                    <ArrowRight
                      className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-gold/50 sm:block"
                      aria-hidden
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mx-auto mt-12 flex max-w-xl flex-col items-center gap-4">
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleCreateBook()}
                className="animate-chapterai-cta h-14 min-w-[260px] rounded-xl bg-gold px-10 text-base font-semibold text-editorial-bg shadow-lg hover:bg-gold/90 sm:h-16 sm:min-w-[300px] sm:text-lg"
              >
                {isPending ? (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-pulse" aria-hidden />
                    Creating your workspaceâ€¦
                  </>
                ) : (
                  <>
                    <PenLine className="mr-2 h-5 w-5" aria-hidden />
                    Write Your First Book
                  </>
                )}
              </Button>
              <button
                type="button"
                className="text-sm text-gold/90 underline-offset-4 transition hover:text-gold hover:underline"
                onClick={() => setExampleOpen(true)}
              >
                See an example
              </button>
            </div>
          </section>
        ) : (
          <>
            <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pagedBooks.map((book) => (
                <li key={book.id}>
                  <ProjectCard book={book} />
                </li>
              ))}
            </ul>
            {hasMore ? (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border text-editorial-cream hover:bg-muted/40"
                  disabled={loadMoreBusy}
                  onClick={() => void handleLoadMore()}
                >
                  {loadMoreBusy ? "Loadingâ€¦" : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
~~~

## components/book/ExampleBookModal.tsx

~~~tsx
"use client";

import { BookOpen, Check, ImageIcon, Sparkles } from "@/lib/lucide-icons";

import { Button } from "@/components/ui/button";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";

type ExampleBookModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ExampleBookModal({ open, onClose }: ExampleBookModalProps) {
  if (!open) return null;

  return (
    <div
      className={responsiveModalRoot("z-[120]")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="example-book-title"
    >
      <button
        type="button"
        className={responsiveModalBackdrop()}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={responsiveModalPanel("max-w-lg p-6 sm:p-8")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Sample project</p>
            <h2 id="example-book-title" className="mt-1 font-serif text-2xl text-editorial-cream">
              The Lighthouse Keeper&apos;s Atlas
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-200">
            Complete
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-editorial-muted">
          A fictional example of what a finished ChapterAI project looks likeâ€”outline approved,
          chapters drafted and edited, cover generated, and export ready for KDP.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-editorial-bg/60 p-4">
            <p className="text-2xl font-semibold tabular-nums text-gold">12</p>
            <p className="text-xs text-editorial-muted">Chapters</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-editorial-bg/60 p-4">
            <p className="text-2xl font-semibold tabular-nums text-gold">84k</p>
            <p className="text-xs text-editorial-muted">Words (approx.)</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2 text-sm text-editorial-muted">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            Outline with twelve structured beats
          </li>
          <li className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            Every chapter moved from pending â†’ draft â†’ edited
          </li>
          <li className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            KDP-style flat cover art
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            Word export + publishing checklist
          </li>
        </ul>

        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="border-border" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
~~~

## components/book/export/ExportBookSummaryCard.tsx

~~~tsx
import Image from "next/image";

import type { ExportPanelProps } from "@/components/book/export/export-types";

type Props = Pick<ExportPanelProps, "title" | "genre" | "wordCount" | "chapterCount" | "coverUrl">;

export function ExportBookSummaryCard({
  title,
  genre,
  wordCount,
  chapterCount,
  coverUrl,
}: Props) {
  return (
    <div className="relative z-10 mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-editorial-muted/25 bg-editorial-card shadow-lg">
      <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-start">
        <div>
          <h2 className="font-serif text-2xl text-editorial-cream">{title}</h2>
          <p className="mt-1 text-sm text-editorial-muted">{genre?.trim() || "General"}</p>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-editorial-muted">Words</dt>
              <dd className="font-semibold tabular-nums text-editorial-cream">
                {wordCount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-editorial-muted">Chapters</dt>
              <dd className="font-semibold tabular-nums text-editorial-cream">{chapterCount}</dd>
            </div>
          </dl>
        </div>
        <div className="relative mx-auto aspect-[5/8] w-full max-w-[140px] overflow-hidden rounded-lg border border-editorial-muted/30 bg-editorial-bg sm:mx-0">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="140px"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center px-2 text-center text-xs text-editorial-muted">
              No cover yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
~~~

## components/book/export/ExportChapterChecklist.tsx

~~~tsx
import { AlertTriangle, CheckCircle2 } from "@/lib/lucide-icons";

import type { ExportChapterRow } from "@/components/book/export/export-types";
import type { ChapterStatusDb } from "@/types/database.types";

function chapterReady(status: ChapterStatusDb): boolean {
  // Any chapter that has content ships â€” we no longer require manual approval.
  return status === "draft" || status === "edited" || status === "approved";
}

export function ExportChapterChecklist({ chapters }: { chapters: ExportChapterRow[] }) {
  const notReadyCount = chapters.filter((c) => !chapterReady(c.status)).length;

  return (
    <div className="relative z-10 mx-auto mt-8 max-w-3xl rounded-xl border border-editorial-muted/20 bg-editorial-card/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gold">Chapters</h3>
      <ul className="mt-3 divide-y divide-editorial-muted/15">
        {chapters.map((ch) => {
          const ready = chapterReady(ch.status);
          return (
            <li
              key={ch.id}
              className="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
            >
              {ready ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500/90" aria-hidden />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500/90" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-editorial-cream">
                <span className="text-editorial-muted">Ch. {ch.chapter_number}</span>{" "}
                {ch.title || "Untitled"}
              </span>
              <span className="shrink-0 text-xs capitalize text-editorial-muted">
                {ch.status.replaceAll("_", " ")}
              </span>
            </li>
          );
        })}
      </ul>
      {notReadyCount > 0 ? (
        <div
          className="mt-4 flex gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/95"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <p>
            {notReadyCount} chapter{notReadyCount === 1 ? " isn't" : "s aren't"} written yet â€”
            {notReadyCount === 1 ? " it" : " they"} won&apos;t be included in your .docx.
            <span className="mt-1 block text-xs text-editorial-muted">
              Generate or write the remaining chapters to include them. Any chapter with content is
              automatically added to the manuscript.
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
~~~

## components/book/export/ExportConfetti.tsx

~~~tsx
export function ExportConfetti() {
  return (
    <div className="chapterai-confetti" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} className="chapterai-confetti-piece" />
      ))}
    </div>
  );
}
~~~

## components/book/export/export-download-utils.ts

~~~ts
export function slugFileBase(title: string): string {
  const raw = title.trim().slice(0, 64);
  const s = raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  return s.length > 0 ? s : "book";
}

export function parseFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(header);
  const raw = m?.[1] ?? m?.[2];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

export function coverPathFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const marker = "/object/public/covers/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    return decodeURIComponent(u.pathname.slice(i + marker.length));
  } catch {
    return null;
  }
}
~~~

## components/book/export/ExportKDPSection.tsx

~~~tsx
import type { ReactNode } from "react";
import {
  BookOpen,
  DollarSign,
  Eye,
  FileUp,
  Globe,
  Grid3x3,
  ImageIcon,
  Languages,
  Lightbulb,
  PenLine,
  Rocket,
  Sparkles,
  Tags,
  TrendingUp,
  UserPlus,
} from "@/lib/lucide-icons";
import Link from "next/link";

const KDP_BASE = "https://kdp.amazon.com";

const stepCards: {
  n: number;
  Icon: typeof UserPlus;
  children: ReactNode;
}[] = [
  {
    n: 1,
    Icon: UserPlus,
    children: (
      <>
        Create your KDP account at{" "}
        <Link
          href={KDP_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gold underline-offset-2 hover:underline"
        >
          kdp.amazon.com
        </Link>
      </>
    ),
  },
  {
    n: 2,
    Icon: BookOpen,
    children: <>Click &quot;Create&quot; â†’ Kindle eBook or Paperback</>,
  },
  {
    n: 3,
    Icon: PenLine,
    children: <>Enter your book title, subtitle, author name, and description</>,
  },
  {
    n: 4,
    Icon: Languages,
    children: <>Set language, publication date, and add relevant keywords (7 allowed)</>,
  },
  {
    n: 5,
    Icon: Grid3x3,
    children: <>Choose 2 categories that best match your book</>,
  },
  {
    n: 6,
    Icon: FileUp,
    children: (
      <>
        Upload your manuscript (.docx is accepted â€” upload the file you just downloaded from
        ChapterAI)
      </>
    ),
  },
  {
    n: 7,
    Icon: Eye,
    children: <>Use KDP&apos;s previewer to review formatting</>,
  },
  {
    n: 8,
    Icon: ImageIcon,
    children: <>Upload your cover image (minimum 2560 Ã— 1600px â€” use the cover you generated)</>,
  },
  {
    n: 9,
    Icon: DollarSign,
    children: (
      <>Set your pricing (70% royalty available for books priced $2.99â€“$9.99)</>
    ),
  },
  {
    n: 10,
    Icon: Globe,
    children: <>Select territories (choose &quot;worldwide&quot; unless you have regional restrictions)</>,
  },
  {
    n: 11,
    Icon: Rocket,
    children: <>Click &quot;Publish&quot; â€” your book goes live within 24â€“72 hours</>,
  },
];

export function ExportKDPSection() {
  return (
    <section className="mt-14 border-t border-editorial-muted/25 pt-12">
      <h2 className="font-serif text-2xl text-gold sm:text-3xl">
        What&apos;s Next â€” Publishing on Amazon KDP
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-editorial-muted">
        Follow these steps on{" "}
        <Link
          href={KDP_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline-offset-2 hover:underline"
        >
          Kindle Direct Publishing
        </Link>{" "}
        to take your manuscript from download to live listing.
      </p>

      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {stepCards.map(({ n, Icon, children }) => (
          <li
            key={n}
            className="flex gap-4 rounded-xl border border-editorial-muted/20 bg-editorial-card/80 p-5 shadow-sm backdrop-blur-sm"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-gold/90">
                Step {n}
              </span>
              <p className="mt-1 text-sm leading-relaxed text-editorial-cream">{children}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gold/25 bg-gold/5 p-5">
          <div className="flex items-center gap-2 text-gold">
            <Lightbulb className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-semibold text-editorial-cream">Keyword research</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
            Mix single words with short phrases readers actually search (e.g. genre + trope +
            setting). Reuse terms from your description; avoid stuffing unrelated buzzwords.
          </p>
        </div>
        <div className="rounded-xl border border-gold/25 bg-gold/5 p-5">
          <div className="flex items-center gap-2 text-gold">
            <TrendingUp className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-semibold text-editorial-cream">Pricing strategy</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
            For the 70% royalty band, stay within $2.99â€“$9.99. Launch slightly lower to gather
            early reviews, then nudge up once social proof is in place.
          </p>
        </div>
        <div className="rounded-xl border border-gold/25 bg-gold/5 p-5 md:col-span-1">
          <div className="flex items-center gap-2 text-gold">
            <Tags className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-semibold text-editorial-cream">Category selection</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
            Pick the two BISAC-style categories that best fit your story â€” one broad, one niche.
            Misleading categories hurt conversions and can trigger KDP quality checks.
          </p>
        </div>
      </div>

      <p className="mt-8 flex flex-wrap items-center gap-2 text-xs text-editorial-muted">
        <Sparkles className="h-4 w-4 shrink-0 text-gold/80" aria-hidden />
        <span>
          Use the <strong className="text-editorial-cream">KDP listing pack</strong> at the top of
          this page for AI-generated listing copy and a downloadable publishing walkthrough (ZIP).
          Listing text is also saved to your project when you generate that pack.
        </span>
      </p>
    </section>
  );
}
~~~

## components/book/export/export-types.ts

~~~ts
import type { ChapterStatusDb } from "@/types/database.types";

export type ExportChapterRow = {
  id: string;
  chapter_number: number;
  title: string;
  status: ChapterStatusDb;
};

export type ExportPanelProps = {
  bookId: string;
  title: string;
  genre: string | null;
  wordCount: number;
  chapterCount: number;
  coverUrl: string | null;
  chapters: ExportChapterRow[];
};
~~~

## components/book/export/TrimSizeSelector.tsx

~~~tsx
"use client";

import { Check, Ruler } from "@/lib/lucide-icons";

import { TRIM_SIZE_OPTIONS } from "@/lib/docx/trim-sizes";
import type { TrimSizeId } from "@/lib/utils/schemas";

type Props = {
  value: TrimSizeId;
  onChange: (next: TrimSizeId) => void;
  disabled?: boolean;
};

export function TrimSizeSelector({ value, onChange, disabled }: Props) {
  return (
    <section
      aria-labelledby="trim-size-heading"
      className="relative z-10 mx-auto mt-10 max-w-3xl rounded-2xl border border-editorial-muted/25 bg-editorial-card/60 p-6 shadow-sm"
    >
      <header className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
          <Ruler className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold/90">
            Book Size
          </p>
          <h3
            id="trim-size-heading"
            className="mt-0.5 font-serif text-lg text-editorial-cream sm:text-xl"
          >
            Choose your trim size
          </h3>
        </div>
      </header>

      <p className="mt-3 max-w-prose text-sm leading-relaxed text-editorial-muted">
        Pick the page size your manuscript will ship in. Margins, chapter
        openers, sidebars, and running headers all adjust automatically to look
        beautiful at the size you choose. Default is{" "}
        <strong className="text-editorial-cream">US Letter (8.5 x 11 in)</strong>.
      </p>

      <div
        role="radiogroup"
        aria-labelledby="trim-size-heading"
        className="mt-5 grid gap-3 sm:grid-cols-2"
      >
        {TRIM_SIZE_OPTIONS.map((opt) => {
          const selected = opt.id === value;
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={selected}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={[
                "group relative flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition",
                selected
                  ? "border-gold/70 bg-gold/10 shadow-[0_0_0_1px_rgba(201,168,76,0.4)]"
                  : "border-editorial-muted/25 bg-editorial-bg/50 hover:border-gold/40 hover:bg-editorial-bg/70",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <span className="font-serif text-base text-editorial-cream">
                  {opt.label}
                </span>
                <span
                  className={[
                    "inline-flex h-5 w-5 items-center justify-center rounded-full border transition",
                    selected
                      ? "border-gold bg-gold text-editorial-bg"
                      : "border-editorial-muted/50 bg-transparent text-transparent",
                  ].join(" ")}
                  aria-hidden
                >
                  <Check className="h-3 w-3" />
                </span>
              </div>
              <p className="text-xs leading-snug text-editorial-muted">
                {opt.description}
              </p>
              <p className="text-[11px] uppercase tracking-widest text-gold/80">
                {opt.widthIn.toFixed(2)} &times; {opt.heightIn.toFixed(2)} in
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
~~~

## components/book/export/useExportDownloads.ts

~~~ts
import { useState } from "react";
import { toast } from "sonner";

import {
  coverPathFromPublicUrl,
  parseFilenameFromDisposition,
  slugFileBase,
} from "@/components/book/export/export-download-utils";
import { recordBookDownloadAction } from "@/app/(dashboard)/dashboard/actions";
import { createClient } from "@/lib/supabase/client";
import { useGlobalProgressStore } from "@/stores/global-progress-store";
import type { TrimSizeId } from "@/lib/utils/schemas";

export function useExportDownloads(bookId: string, title: string, coverUrl: string | null) {
  const [compileBusy, setCompileBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [kdpPackBusy, setKdpPackBusy] = useState(false);

  async function compileAndDownload(trimSize?: TrimSizeId) {
    setCompileBusy(true);
    useGlobalProgressStore.getState().start();
    try {
      const res = await fetch("/api/compile-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ bookId, ...(trimSize ? { trimSize } : {}) }),
      });

      if (!res.ok) {
        let msg = "Could not compile your book.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      const blob = await res.blob();
      const fromHeader = parseFilenameFromDisposition(res.headers.get("Content-Disposition"));
      const name = fromHeader ?? `${slugFileBase(title)}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your book download has started.");
      void recordBookDownloadAction(bookId);
    } catch {
      toast.error("Network error while compiling.");
    } finally {
      setCompileBusy(false);
    }
  }

  async function downloadKdpPack() {
    setKdpPackBusy(true);
    useGlobalProgressStore.getState().start();
    try {
      const res = await fetch("/api/export-kdp-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ bookId }),
      });

      if (!res.ok) {
        let msg = "Could not build your KDP listing pack.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      const blob = await res.blob();
      const fromHeader = parseFilenameFromDisposition(res.headers.get("Content-Disposition"));
      const name = fromHeader ?? `${slugFileBase(title)}-KDP-Pack.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("KDP listing pack download started.");
    } catch {
      toast.error("Network error while building the KDP pack.");
    } finally {
      useGlobalProgressStore.getState().stop();
      setKdpPackBusy(false);
    }
  }

  async function downloadCoverImage() {
    if (!coverUrl) {
      toast.error("No cover image saved for this project.");
      return;
    }
    setCoverBusy(true);
    useGlobalProgressStore.getState().start();
    try {
      const path = coverPathFromPublicUrl(coverUrl);
      const supabase = createClient();
      let blob: Blob;
      if (path) {
        const { data, error } = await supabase.storage.from("covers").download(path);
        if (error || !data) {
          const r = await fetch(coverUrl);
          if (!r.ok) throw new Error("fetch");
          blob = await r.blob();
        } else {
          blob = data;
        }
      } else {
        const r = await fetch(coverUrl);
        if (!r.ok) throw new Error("fetch");
        blob = await r.blob();
      }

      const ext = blob.type.includes("png") ? "png" : blob.type.includes("jpeg") ? "jpg" : "png";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugFileBase(title)}-cover.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Cover download started.");
    } catch {
      toast.error("Could not download the cover. Try again.");
    } finally {
      useGlobalProgressStore.getState().stop();
      setCoverBusy(false);
    }
  }

  return {
    compileBusy,
    coverBusy,
    kdpPackBusy,
    compileAndDownload,
    downloadCoverImage,
    downloadKdpPack,
  };
}
~~~

## components/book/ExportPanel.tsx

~~~tsx
"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  Share2,
} from "@/lib/lucide-icons";
import Link from "next/link";

import { ExportBookSummaryCard } from "@/components/book/export/ExportBookSummaryCard";
import { ExportChapterChecklist } from "@/components/book/export/ExportChapterChecklist";
import { ExportConfetti } from "@/components/book/export/ExportConfetti";
import { ExportKDPSection } from "@/components/book/export/ExportKDPSection";
import { TrimSizeSelector } from "@/components/book/export/TrimSizeSelector";
import type { ExportPanelProps } from "@/components/book/export/export-types";
import { BackToTop } from "@/components/ui/back-to-top";
import { useExportDownloads } from "@/components/book/export/useExportDownloads";
import type { TrimSizeId } from "@/lib/utils/schemas";
import type { ChapterStatusDb } from "@/types/database.types";

export type { ExportChapterRow, ExportPanelProps } from "@/components/book/export/export-types";

function isPublishableStatus(status: ChapterStatusDb): boolean {
  // Any chapter that has been written counts â€” no manual approval needed.
  return status === "draft" || status === "edited" || status === "approved";
}

export function ExportPanel({
  bookId,
  title,
  genre,
  wordCount,
  chapterCount,
  coverUrl,
  chapters,
}: ExportPanelProps) {
  const {
    compileBusy,
    coverBusy,
    kdpPackBusy,
    compileAndDownload,
    downloadCoverImage,
    downloadKdpPack,
  } = useExportDownloads(bookId, title, coverUrl);

  const [trimSize, setTrimSize] = useState<TrimSizeId>("us-letter");

  const hasPublishableChapter = useMemo(
    () => chapters.some((c) => isPublishableStatus(c.status)),
    [chapters],
  );

  const shareHref = useMemo(() => {
    const t = `Just wrote my book '${title}' with @ChapterAI â€” check it out!`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`;
  }, [title]);

  return (
    <div className="relative px-4 pb-16 pt-8 text-editorial-cream sm:px-6">
      {hasPublishableChapter ? <ExportConfetti /> : null}

      <section
        id="kdp-pack"
        className="relative z-10 mx-auto mt-6 max-w-3xl rounded-xl border border-gold/25 bg-gold/5 px-5 py-6 sm:px-6"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-gold/90">
          Amazon KDP
        </p>
        <h2 className="mt-2 font-serif text-xl text-editorial-cream sm:text-2xl">
          KDP listing pack (ZIP) â€” separate from your manuscript
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
          Download a ZIP with <strong className="text-editorial-cream">AI-assisted</strong> title and
          subtitle ideas, book description, seven keywords, a two-sentence{" "}
          <strong className="text-editorial-cream">About the author</strong> blurb,{" "}
          <strong className="text-editorial-cream">back-of-book</strong> copy for paperbacks, category
          hints, plus a step-by-step{" "}
          <strong className="text-editorial-cream">KDP signup and publish walkthrough</strong>. Your
          manuscript still comes from <strong className="text-editorial-cream">Compile &amp; Download</strong>{" "}
          below (when chapters are ready).
        </p>
        <button
          type="button"
          onClick={() => void downloadKdpPack()}
          disabled={kdpPackBusy}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gold/50 bg-editorial-bg/60 px-5 text-sm font-semibold text-gold shadow-sm transition hover:bg-editorial-bg/80 disabled:opacity-60 sm:w-auto"
        >
          {kdpPackBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileArchive className="h-4 w-4" aria-hidden />
          )}
          {kdpPackBusy ? "Building packâ€¦" : "Download KDP listing pack (.zip)"}
        </button>
      </section>

      {chapters.length === 0 ? (
        <div className="relative z-10 mx-auto max-w-xl rounded-2xl border border-dashed border-gold/35 bg-card/50 px-6 py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Export</p>
          <h1 className="mt-2 font-serif text-2xl text-editorial-cream sm:text-3xl">No chapters yet</h1>
          <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
            Generate an outline firstâ€”then you&apos;ll see chapters here. Once at least one chapter
            has been written, you can compile your manuscript.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={`/projects/${bookId}/outline`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-gold px-6 text-sm font-semibold text-editorial-bg hover:bg-gold/90"
            >
              Go to outline
            </Link>
          </div>
        </div>
      ) : null}

      {chapters.length > 0 && !hasPublishableChapter ? (
        <div className="relative z-10 mx-auto max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-amber-400/90" aria-hidden />
          <h1 className="mt-4 font-serif text-2xl text-editorial-cream sm:text-3xl">
            No chapters ready for export
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
            Every chapter is still pending. Generate or write at least one chapter and it&apos;ll be
            included in your manuscript automatically.
          </p>
          <Link
            href={`/projects/${bookId}/chapters/${chapters[0]!.id}`}
            className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-gold px-8 text-sm font-semibold text-editorial-bg hover:bg-gold/90"
          >
            Continue writing
          </Link>
        </div>
      ) : null}

      {hasPublishableChapter ? (
        <>
          <header className="relative z-10 text-center">
            <h1 className="font-serif text-3xl text-gold sm:text-4xl">Your Book is Ready</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-editorial-muted">
              Download your manuscript for KDP, grab your cover, and walk through publishing on
              Amazon.
            </p>
          </header>

          <ExportBookSummaryCard
            title={title}
            genre={genre}
            wordCount={wordCount}
            chapterCount={chapterCount}
            coverUrl={coverUrl}
          />

          <ExportChapterChecklist chapters={chapters} />

          <TrimSizeSelector
            value={trimSize}
            onChange={setTrimSize}
            disabled={compileBusy}
          />

          <div className="relative z-10 mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void compileAndDownload(trimSize)}
              disabled={compileBusy}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-gold px-6 text-base font-semibold text-editorial-bg shadow-md transition hover:bg-gold/90 disabled:opacity-60"
            >
              {compileBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Download className="h-5 w-5" aria-hidden />
              )}
              {compileBusy ? "Compilingâ€¦" : "Compile & Download Book"}
            </button>
            <button
              type="button"
              onClick={() => void downloadCoverImage()}
              disabled={coverBusy || !coverUrl}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-editorial-muted/40 bg-transparent px-5 text-sm font-medium text-editorial-cream transition hover:border-gold/50 hover:bg-editorial-bg/50 disabled:opacity-50"
            >
              {coverBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              Download Cover Image
            </button>
          </div>

          <ExportKDPSection />

          <section className="relative z-10 mx-auto mt-14 max-w-3xl rounded-xl border border-editorial-muted/20 bg-editorial-card/40 p-6 text-center">
            <h2 className="font-serif text-xl text-gold">Tell the world you wrote a book</h2>
            <p className="mt-2 text-sm text-editorial-muted">Share your milestone on X (Twitter).</p>
            <a
              href={shareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-editorial-muted/40 px-5 py-2.5 text-sm font-medium text-editorial-cream transition hover:border-gold/50 hover:bg-editorial-bg/40"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share on X
            </a>
          </section>
        </>
      ) : (
        <>
          {chapters.length > 0 ? (
            <div className="relative z-10 mx-auto mt-10 max-w-3xl">
              <ExportBookSummaryCard
                title={title}
                genre={genre}
                wordCount={wordCount}
                chapterCount={chapterCount}
                coverUrl={coverUrl}
              />
              <ExportChapterChecklist chapters={chapters} />
            </div>
          ) : null}
        </>
      )}

      <footer className="relative z-10 mx-auto mt-12 max-w-3xl text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gold underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Link>
      </footer>

      <BackToTop />
    </div>
  );
}
~~~

## components/book/heavy-panels.tsx

~~~tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import type { ExportPanelProps } from "@/components/book/export/export-types";
import type { OutlineEditorProps } from "@/components/book/OutlineEditor";
import type { CoverGeneratorProps } from "@/components/book/CoverGenerator";

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div
      className="mx-auto max-w-4xl animate-pulse rounded-xl border border-border/60 bg-card/30 px-6 py-16"
      aria-busy="true"
      aria-label={label}
    >
      <div className="mx-auto h-8 max-w-md rounded bg-muted/50" />
      <div className="mx-auto mt-6 h-4 max-w-lg rounded bg-muted/40" />
      <div className="mx-auto mt-4 h-4 max-w-sm rounded bg-muted/30" />
      <div className="mt-10 space-y-3">
        <div className="h-24 rounded-lg bg-muted/35" />
        <div className="h-24 rounded-lg bg-muted/25" />
      </div>
    </div>
  );
}

const OutlineEditorDynamic = dynamic(
  () => import("@/components/book/OutlineEditor").then((m) => m.OutlineEditor),
  { ssr: false, loading: () => <PanelSkeleton label="Loading outline editor" /> },
);

const CoverGeneratorDynamic = dynamic(
  () => import("@/components/book/CoverGenerator").then((m) => m.CoverGenerator),
  { ssr: false, loading: () => <PanelSkeleton label="Loading cover tools" /> },
);

const ExportPanelDynamic = dynamic(
  () => import("@/components/book/ExportPanel").then((m) => m.ExportPanel),
  { ssr: false, loading: () => <PanelSkeleton label="Loading export tools" /> },
);

export function OutlineEditorLazy(props: OutlineEditorProps) {
  return (
    <Suspense fallback={<PanelSkeleton label="Loading outline editor" />}>
      <OutlineEditorDynamic {...props} />
    </Suspense>
  );
}

export function CoverGeneratorLazy(props: CoverGeneratorProps) {
  return (
    <Suspense fallback={<PanelSkeleton label="Loading cover tools" />}>
      <CoverGeneratorDynamic {...props} />
    </Suspense>
  );
}

export function ExportPanelLazy(props: ExportPanelProps) {
  return (
    <Suspense fallback={<PanelSkeleton label="Loading export tools" />}>
      <ExportPanelDynamic {...props} />
    </Suspense>
  );
}
~~~

## components/book/IdeaChat.tsx

~~~tsx
"use client";

import type { Message } from "ai";
import { useChat } from "ai/react";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { updateBookTypeAction } from "@/app/(dashboard)/projects/[id]/idea/actions";
import { Button } from "@/components/ui/button";
import type { BookTypeDb, Json } from "@/types/database.types";
import { cn } from "@/lib/utils/cn";

const REFINED_IDEA_REGEX = /<REFINED_IDEA>([\s\S]*?)<\/REFINED_IDEA>/i;

export type RefinedIdeaBrief = {
  title?: string;
  suggested_title?: string;
  subtitle?: string;
  genre?: string;
  target_audience?: string;
  audience?: string;
  core_premise?: string;
  premise?: string;
  tone?: string;
  tone_and_style?: string;
  themes?: string | string[];
  key_themes?: string | string[];
  estimated_length?: string;
  chapters?: number;
  word_count?: number;
};

type EditableBrief = {
  title: string;
  subtitle: string;
  genre: string;
  audience: string;
  premise: string;
  tone: string;
  themes: string;
  estimated_length: string;
};

const EMPTY_EDITABLE: EditableBrief = {
  title: "",
  subtitle: "",
  genre: "",
  audience: "",
  premise: "",
  tone: "",
  themes: "",
  estimated_length: "",
};

function themesToString(t: RefinedIdeaBrief["themes"] | RefinedIdeaBrief["key_themes"]): string {
  if (Array.isArray(t)) return t.join(", ");
  if (typeof t === "string") return t;
  return "";
}

function briefToEditable(b: RefinedIdeaBrief | null): EditableBrief {
  if (!b) return { ...EMPTY_EDITABLE };
  const estimatedLengthFallback = (() => {
    const m = b.estimated_length?.trim();
    if (m) return m;
    const parts = [
      b.chapters != null ? `${b.chapters} chapters` : "",
      b.word_count != null ? `${b.word_count.toLocaleString()} words` : "",
    ].filter(Boolean);
    return parts.join(" Â· ");
  })();
  return {
    title: (b.title ?? b.suggested_title ?? "").trim(),
    subtitle: (b.subtitle ?? "").trim(),
    genre: (b.genre ?? "").trim(),
    audience: (b.target_audience ?? b.audience ?? "").trim(),
    premise: (b.core_premise ?? b.premise ?? "").trim(),
    tone: (b.tone ?? b.tone_and_style ?? "").trim(),
    themes: themesToString(b.themes ?? b.key_themes).trim(),
    estimated_length: estimatedLengthFallback,
  };
}

function editableToBrief(e: EditableBrief): RefinedIdeaBrief {
  const themesArr = e.themes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: RefinedIdeaBrief = {
    title: e.title.trim() || "Untitled",
    genre: e.genre.trim(),
    target_audience: e.audience.trim(),
    core_premise: e.premise.trim(),
    tone_and_style: e.tone.trim(),
    key_themes: themesArr,
  };
  const subtitle = e.subtitle.trim();
  if (subtitle) out.subtitle = subtitle;
  const est = e.estimated_length.trim();
  if (est) out.estimated_length = est;
  return out;
}

function parseRefinedBrief(jsonStr: string): RefinedIdeaBrief | null {
  try {
    const v = JSON.parse(jsonStr) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as RefinedIdeaBrief;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function extractRefinedFromAssistantContent(content: string): RefinedIdeaBrief | null {
  const match = content.match(REFINED_IDEA_REGEX);
  if (!match?.[1]) return null;
  return parseRefinedBrief(match[1].trim());
}

function conversationToMessages(raw: Json): Message[] {
  if (!Array.isArray(raw)) return [];
  const out: Message[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as { role?: string; content?: string };
    if (row.role !== "user" && row.role !== "assistant") continue;
    out.push({
      id: `loaded-${i}`,
      role: row.role,
      content: typeof row.content === "string" ? row.content : "",
    });
  }
  return out;
}

const briefInputClass =
  "w-full rounded-md border border-border/70 bg-background/70 px-3 py-2 text-sm text-editorial-cream placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-60";

function BriefField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-editorial-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export type IdeaChatProps = {
  bookId: string;
  bookTitle: string;
  initialConversation: Json;
  initialRefinedIdea: string | null;
  initialBookType: BookTypeDb;
};

export function IdeaChat({
  bookId,
  bookTitle,
  initialConversation,
  initialRefinedIdea,
  initialBookType,
}: IdeaChatProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipText, setSkipText] = useState("");
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [bookType, setBookType] = useState<BookTypeDb>(initialBookType);
  const [bookTypePending, startBookTypeTransition] = useTransition();

  const handleBookTypeChange = useCallback(
    (next: BookTypeDb) => {
      if (next === bookType) return;
      const prev = bookType;
      setBookType(next);
      startBookTypeTransition(async () => {
        const result = await updateBookTypeAction(bookId, next);
        if (!result.ok) {
          setBookType(prev);
          toast.error(result.error ?? "Could not save book type.");
        }
      });
    },
    [bookId, bookType],
  );

  const initialFromDb = useMemo(() => {
    if (!initialRefinedIdea) return null;
    return parseRefinedBrief(initialRefinedIdea);
  }, [initialRefinedIdea]);

  const [lockedBrief, setLockedBrief] = useState<RefinedIdeaBrief | null>(initialFromDb);
  const [editable, setEditable] = useState<EditableBrief>(() =>
    briefToEditable(initialFromDb),
  );
  const lastSyncedBriefRef = useRef<RefinedIdeaBrief | null>(initialFromDb);
  const [subtitleBusy, setSubtitleBusy] = useState(false);
  const autoSubtitleDoneRef = useRef<string | null>(null);

  const initialMessages = useMemo(
    () => conversationToMessages(initialConversation),
    [initialConversation],
  );

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: "/api/ai/refine-idea",
    initialMessages,
    experimental_prepareRequestBody: ({ messages: chatMessages }) => {
      const last = chatMessages[chatMessages.length - 1];
      if (!last || last.role !== "user") {
        return {
          bookId,
          messages: [],
          userMessage: "",
        };
      }
      const prior = chatMessages
        .slice(0, -1)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      return {
        bookId,
        messages: prior,
        userMessage: last.content,
      };
    },
    onError(err) {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
    onFinish(message) {
      const parsed = extractRefinedFromAssistantContent(message.content);
      if (parsed) {
        setLockedBrief(parsed);
        setEditable(briefToEditable(parsed));
        lastSyncedBriefRef.current = parsed;
      }
    },
  });

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.content || isLoading) return;
    const parsed = extractRefinedFromAssistantContent(lastAssistant.content);
    if (!parsed) return;
    setLockedBrief(parsed);
    if (lastSyncedBriefRef.current !== parsed) {
      setEditable(briefToEditable(parsed));
      lastSyncedBriefRef.current = parsed;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const goToOutline = useCallback(
    async (opts?: { rawIdea?: string; refinedIdeaOverride?: RefinedIdeaBrief | null }) => {
      setOutlineBusy(true);
      try {
        const raw = opts?.rawIdea;
        const refined = opts?.refinedIdeaOverride;
        const body: {
          bookId: string;
          rawIdea?: string;
          refinedIdeaOverride?: string;
          conversation?: { role: "user" | "assistant"; content: string }[];
        } = { bookId };
        if (raw !== undefined && raw.trim().length > 0) {
          body.rawIdea = raw.trim();
        } else if (refined && Object.keys(refined).length > 0) {
          body.refinedIdeaOverride = JSON.stringify(refined);
        }
        const transcript = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
          .filter((m) => m.content.trim().length > 0);
        if (transcript.length > 0) {
          body.conversation = transcript;
        }
        const res = await fetch("/api/ai/generate-outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Could not start outline.");
        }
        router.push(`/projects/${bookId}/outline`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not start outline.");
      } finally {
        setOutlineBusy(false);
      }
    },
    [bookId, router, messages],
  );

  const onSkipSubmit = async () => {
    await goToOutline({ rawIdea: skipText });
    setSkipOpen(false);
    setSkipText("");
  };

  const setEditableField = useCallback(
    <K extends keyof EditableBrief>(key: K, value: EditableBrief[K]) => {
      setEditable((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetEditableToAI = useCallback(() => {
    setEditable(briefToEditable(lockedBrief));
  }, [lockedBrief]);

  const requestSubtitle = useCallback(
    async (opts?: { silent?: boolean }) => {
      const title = editable.title.trim();
      if (!title) {
        if (!opts?.silent) {
          toast.info("Add a working title first, then we'll craft a subtitle.");
        }
        return;
      }
      setSubtitleBusy(true);
      try {
        const res = await fetch("/api/ai/generate-subtitle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            brief: {
              title,
              genre: editable.genre.trim() || undefined,
              tone: editable.tone.trim() || undefined,
              audience: editable.audience.trim() || undefined,
              premise: editable.premise.trim() || undefined,
              themes: editable.themes.trim() || undefined,
            },
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { subtitle?: string; error?: string }
          | null;
        if (!res.ok || !data?.subtitle) {
          throw new Error(data?.error ?? "Could not generate a subtitle.");
        }
        setEditable((prev) => ({ ...prev, subtitle: data.subtitle ?? "" }));
        if (!opts?.silent) {
          toast.success("Fresh subtitle ready.");
        }
      } catch (e) {
        if (!opts?.silent) {
          toast.error(
            e instanceof Error ? e.message : "Could not generate a subtitle.",
          );
        }
      } finally {
        setSubtitleBusy(false);
      }
    },
    [bookId, editable],
  );

  // Whenever a new brief locks in without a subtitle, quietly ask the model
  // for one so the field is never left blank.
  useEffect(() => {
    if (!lockedBrief) return;
    const titleSig = (editable.title.trim() || "").toLowerCase();
    if (!titleSig) return;
    if (editable.subtitle.trim()) return;
    if (subtitleBusy) return;
    if (autoSubtitleDoneRef.current === titleSig) return;
    autoSubtitleDoneRef.current = titleSig;
    void requestSubtitle({ silent: true });
  }, [lockedBrief, editable.title, editable.subtitle, subtitleBusy, requestSubtitle]);

  const hasEdits = useMemo(() => {
    const base = briefToEditable(lockedBrief);
    return (Object.keys(base) as (keyof EditableBrief)[]).some(
      (k) => base[k] !== editable[k],
    );
  }, [editable, lockedBrief]);

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-gold sm:text-3xl">{bookTitle}</h1>
          <p className="mt-1 text-sm text-editorial-muted">
            Refine your concept with the editor â€” or jump ahead when you are ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSkipOpen(true)}
          className="text-sm text-gold/90 underline-offset-4 transition-colors hover:text-gold hover:underline"
        >
          Skip to outline
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Book type
            </p>
            <p className="mt-1 text-sm text-editorial-muted">
              Tells the AI how to write your chapters â€” novel-style prose vs.
              structured nonfiction with claims, evidence, and takeaways.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Book type"
            className="inline-flex self-start overflow-hidden rounded-lg border border-border/70 bg-background/60 p-1 sm:self-auto"
          >
            {(
              [
                { value: "fiction", label: "Fiction" },
                { value: "non_fiction", label: "Non-fiction" },
              ] as const
            ).map((opt) => {
              const selected = bookType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleBookTypeChange(opt.value)}
                  disabled={bookTypePending}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "bg-gold text-editorial-bg shadow-sm"
                      : "text-editorial-cream hover:bg-card",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-lg border border-border/50 bg-card/30 px-3 py-4 sm:px-5"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-editorial-muted">
            Share what you are writing about. The editor will ask a few focused questions.
          </p>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                m.role === "user"
                  ? "bg-gold text-editorial-bg"
                  : "bg-editorial-cream/95 text-editorial-bg",
                m.role === "assistant" && "font-serif text-[15px]",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-editorial-cream/10 px-4 py-3"
              aria-live="polite"
              aria-label="Assistant is typing"
            >
              <span className="sr-only">Assistant is typing</span>
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80" />
              </span>
              <span className="text-xs text-editorial-muted">Writingâ€¦</span>
            </div>
          </div>
        ) : null}
      </div>

      {lockedBrief ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-gold/35 bg-gradient-to-br from-gold/10 to-card/80 p-5 shadow-[0_0_40px_rgba(201,168,76,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                  Idea locked in â€” edit freely before generating the outline
                </p>
                <p className="mt-1 text-xs text-editorial-muted">
                  These fields are passed to the outline generator along with the full chat.
                </p>
              </div>
              {hasEdits ? (
                <button
                  type="button"
                  onClick={resetEditableToAI}
                  className="text-xs text-gold/90 underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  {"Reset to assistant's version"}
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <BriefField label="Title" className="sm:col-span-2">
                <input
                  type="text"
                  value={editable.title}
                  onChange={(e) => setEditableField("title", e.target.value)}
                  placeholder="Working title"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField label="Subtitle" className="sm:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    value={editable.subtitle}
                    onChange={(e) => setEditableField("subtitle", e.target.value)}
                    placeholder={
                      subtitleBusy
                        ? "Crafting a subtitleâ€¦"
                        : "Subtitle under the title â€” auto-generated"
                    }
                    disabled={subtitleBusy}
                    className={cn(briefInputClass, "pr-28")}
                  />
                  <button
                    type="button"
                    onClick={() => void requestSubtitle()}
                    disabled={subtitleBusy || !editable.title.trim()}
                    aria-label={
                      editable.subtitle.trim()
                        ? "Regenerate subtitle"
                        : "Generate subtitle"
                    }
                    className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-gold/40 bg-gold/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold transition hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {subtitleBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="h-3 w-3" aria-hidden />
                    )}
                    {editable.subtitle.trim() ? "Regenerate" : "Generate"}
                  </button>
                </div>
              </BriefField>
              <BriefField label="Genre">
                <input
                  type="text"
                  value={editable.genre}
                  onChange={(e) => setEditableField("genre", e.target.value)}
                  placeholder="e.g. Literary fiction"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField label="Audience">
                <input
                  type="text"
                  value={editable.audience}
                  onChange={(e) => setEditableField("audience", e.target.value)}
                  placeholder="Who is this for?"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField label="Premise" className="sm:col-span-2">
                <textarea
                  rows={3}
                  value={editable.premise}
                  onChange={(e) => setEditableField("premise", e.target.value)}
                  placeholder="2â€“3 sentence core premise"
                  className={cn(briefInputClass, "resize-y")}
                />
              </BriefField>
              <BriefField label="Tone">
                <input
                  type="text"
                  value={editable.tone}
                  onChange={(e) => setEditableField("tone", e.target.value)}
                  placeholder="e.g. Warm, observational, slow-burn"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField label="Themes (comma-separated)">
                <input
                  type="text"
                  value={editable.themes}
                  onChange={(e) => setEditableField("themes", e.target.value)}
                  placeholder="e.g. Memory, belonging, resilience"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField label="Estimated length" className="sm:col-span-2">
                <input
                  type="text"
                  value={editable.estimated_length}
                  onChange={(e) => setEditableField("estimated_length", e.target.value)}
                  placeholder="e.g. 12 chapters Â· 60,000 words"
                  className={briefInputClass}
                />
              </BriefField>
            </div>
          </div>

          <Button
            type="button"
            disabled={outlineBusy || isLoading}
            className="h-auto w-full gap-2 bg-gold py-4 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            onClick={() =>
              void goToOutline({ refinedIdeaOverride: editableToBrief(editable) })
            }
          >
            {outlineBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <>
                Generate outline
                <ArrowRight className="h-5 w-5" aria-hidden />
              </>
            )}
          </Button>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isLoading) return;
          void handleSubmit(e);
        }}
        className="mt-4 flex gap-2 border-t border-border/50 pt-4"
      >
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Reply to the editorâ€¦"
          rows={2}
          disabled={isLoading}
          className="min-h-[48px] flex-1 resize-y rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-full min-h-[48px] bg-gold px-4 text-editorial-bg hover:bg-gold/90"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-5 w-5" aria-hidden />
            )}
          </Button>
          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => stop()}
            >
              Stop
            </Button>
          ) : null}
        </div>
      </form>

      {skipOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-outline-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSkipOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="skip-outline-title" className="font-serif text-xl text-gold">
              Skip to outline
            </h2>
            <p className="mt-2 text-sm text-editorial-muted">
              Paste your concept, logline, or notes. We will save them and open the outline step.
            </p>
            <textarea
              value={skipText}
              onChange={(e) => setSkipText(e.target.value)}
              rows={6}
              placeholder="Your book in a paragraph or twoâ€¦"
              className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSkipOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={outlineBusy || !skipText.trim()}
                onClick={() => void onSkipSubmit()}
              >
                {outlineBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  "Continue to outline"
                )}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-editorial-muted">
              Prefer the guided chat?{" "}
              <button
                type="button"
                className="text-gold underline-offset-4 hover:underline"
                onClick={() => setSkipOpen(false)}
              >
                Close and keep refining
              </button>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
~~~

## components/book/OnboardingModal.tsx

~~~tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "@/lib/lucide-icons";
import { useRouter } from "next/navigation";

import { completeOnboardingAction } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import { cn } from "@/lib/utils/cn";

const WORKFLOW_STEPS = [
  { label: "Idea", detail: "Chat through your concept" },
  { label: "Outline", detail: "AI-structured chapters" },
  { label: "Chapters", detail: "Draft & edit in the studio" },
  { label: "Cover", detail: "DALLÂ·E artwork for KDP" },
  { label: "Export", detail: "Word + publishing guide" },
];

type OnboardingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSlide(0);
  }, [open]);

  const dismiss = useCallback(async () => {
    setBusy(true);
    try {
      await completeOnboardingAction();
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [onClose, router]);

  const goNext = useCallback(() => {
    if (slide >= 3) {
      void dismiss();
      return;
    }
    setSlide((s) => s + 1);
  }, [dismiss, slide]);

  const goPrev = useCallback(() => {
    setSlide((s) => Math.max(0, s - 1));
  }, []);

  if (!open) return null;

  return (
    <div
      className={responsiveModalRoot("z-[110]")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <button
        type="button"
        className={cn(responsiveModalBackdrop(), "bg-black/80")}
        aria-label="Close onboarding"
        disabled={busy}
        onClick={() => {
          if (!busy) void dismiss();
        }}
      />
      <div
        className={cn(
          responsiveModalPanel("max-w-lg border-border bg-editorial-bg p-6 sm:p-8"),
          "relative",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-md text-editorial-muted transition hover:bg-muted/40 hover:text-editorial-cream md:right-4 md:top-4 md:h-9 md:w-9"
          aria-label="Skip onboarding"
          disabled={busy}
          onClick={() => void dismiss()}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex justify-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-8 rounded-full transition-colors",
                i === slide ? "bg-gold" : "bg-border",
              )}
            />
          ))}
        </div>

        {slide === 0 ? (
          <div className="text-center">
            <div className="onboarding-illus mx-auto mb-6 flex h-36 w-36 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/20 via-card to-editorial-bg">
              <Sparkles className="h-14 w-14 text-gold onboarding-illus-sparkle" aria-hidden />
            </div>
            <h2 id="onboarding-title" className="font-serif text-2xl text-editorial-cream">
              Welcome to ChapterAI
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
              Your co-writer for long-form booksâ€”from messy idea to a manuscript you can upload to
              Amazon KDP. We handle structure, drafting, and export so you can focus on voice and
              story.
            </p>
          </div>
        ) : null}

        {slide === 1 ? (
          <div>
            <h2 className="text-center font-serif text-2xl text-editorial-cream">How it flows</h2>
            <p className="mt-2 text-center text-sm text-editorial-muted">
              Five beats from spark to publishable files.
            </p>
            <ol className="mt-8 space-y-4">
              {WORKFLOW_STEPS.map((step, i) => (
                <li
                  key={step.label}
                  className="flex gap-4 rounded-xl border border-border/60 bg-card/50 px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-editorial-cream">{step.label}</p>
                    <p className="text-xs text-editorial-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {slide === 2 ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-gold/50 bg-gold/5">
              <span className="font-serif text-4xl text-gold">âœ¦</span>
            </div>
            <h2 className="font-serif text-2xl text-editorial-cream">All you need is an idea</h2>
            <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
              No outline? No problem. Start with a paragraph, a trope list, or a voice note summary.
              ChapterAI helps you refine the premise, lock a chapter structure, and fill the pages
              one chapter at a time.
            </p>
          </div>
        ) : null}

        {slide === 3 ? (
          <div className="text-center">
            <h2 className="font-serif text-2xl text-editorial-cream">Plans</h2>
            <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
              <strong className="text-editorial-cream">Free</strong> includes core writing, outlines,
              and exports with generous limits. <strong className="text-editorial-cream">Pro</strong>{" "}
              unlocks unlimited books, deeper chapter generation, and priority workflows.
            </p>
            <div className="mt-8 rounded-xl border border-gold/35 bg-gold/10 px-5 py-6">
              <p className="text-sm font-medium text-editorial-cream">Ready when you are</p>
              <p className="mt-1 text-xs text-editorial-muted">
                Start on Freeâ€”upgrade anytime from the dashboard.
              </p>
              <Button
                type="button"
                className="mt-5 w-full bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
                disabled={busy}
                onClick={() => void dismiss()}
              >
                {busy ? "Savingâ€¦" : "Start for Free"}
              </Button>
              <a
                href="/#pricing"
                className="mt-3 inline-block text-xs text-gold underline-offset-4 hover:underline"
                onClick={() => void dismiss()}
              >
                Compare plans on the marketing site
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
          <Button
            type="button"
            variant="ghost"
            className="text-editorial-muted"
            disabled={busy}
            onClick={() => void dismiss()}
          >
            Skip
          </Button>
          <div className="flex gap-2">
            {slide > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border"
                disabled={busy}
                onClick={goPrev}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="bg-gold text-editorial-bg hover:bg-gold/90"
              disabled={busy}
              onClick={() => void goNext()}
            >
              {slide >= 3 ? (
                "Done"
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
~~~

## components/book/OutlineEditor.tsx

~~~tsx
"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Wand2,
} from "@/lib/lucide-icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { approveOutline } from "@/app/(dashboard)/projects/[id]/outline/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import type { BookTypeDb, Json } from "@/types/database.types";
import { cn } from "@/lib/utils/cn";

export type OutlineSection = {
  number: number;
  title: string;
  description: string;
  tension_level?: number;
  character_moment?: string;
  chapter_ends_with?: string;
  reader_takeaway?: string;
  content_type?: string;
};

export type OutlineRow = {
  id: string;
  book_id: string;
  sections: Json;
  approved: boolean;
};

type SectionRow = OutlineSection & { id: string };

type SectionPatch = Partial<
  Pick<SectionRow, "title" | "description" | "reader_takeaway" | "content_type">
>;

function parseSectionsJson(raw: Json): SectionRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, i) => {
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "Untitled";
    const description = typeof o.description === "string" ? o.description : "";
    const number = typeof o.number === "number" ? o.number : i + 1;
    const tr = o.tension_level;
    const tension_level =
      typeof tr === "number" && Number.isFinite(tr)
        ? Math.min(10, Math.max(1, Math.round(tr)))
        : undefined;
    const character_moment =
      typeof o.character_moment === "string" ? o.character_moment : undefined;
    const chapter_ends_with =
      typeof o.chapter_ends_with === "string" ? o.chapter_ends_with : undefined;
    const reader_takeaway =
      typeof o.reader_takeaway === "string" ? o.reader_takeaway : undefined;
    const content_type =
      typeof o.content_type === "string" ? o.content_type : undefined;
    return {
      id: crypto.randomUUID(),
      number,
      title,
      description,
      ...(tension_level !== undefined ? { tension_level } : {}),
      ...(character_moment !== undefined ? { character_moment } : {}),
      ...(chapter_ends_with !== undefined ? { chapter_ends_with } : {}),
      ...(reader_takeaway !== undefined ? { reader_takeaway } : {}),
      ...(content_type !== undefined ? { content_type } : {}),
    };
  });
}

function renumber(sections: SectionRow[]): SectionRow[] {
  return sections.map((s, i) => ({ ...s, number: i + 1 }));
}

function toDbSections(sections: SectionRow[]): OutlineSection[] {
  return sections.map((s) => {
    const row: OutlineSection = {
      number: s.number,
      title: s.title,
      description: s.description,
    };
    if (typeof s.tension_level === "number") {
      row.tension_level = s.tension_level;
    }
    if (s.character_moment?.trim()) {
      row.character_moment = s.character_moment.trim();
    }
    if (s.chapter_ends_with?.trim()) {
      row.chapter_ends_with = s.chapter_ends_with.trim();
    }
    if (s.reader_takeaway?.trim()) {
      row.reader_takeaway = s.reader_takeaway.trim();
    }
    if (s.content_type?.trim()) {
      row.content_type = s.content_type.trim();
    }
    return row;
  });
}

type ChapterCardEditorProps = {
  section: SectionRow;
  onChange: (id: string, patch: SectionPatch) => void;
  onDelete: (id: string) => void;
  bookType?: BookTypeDb;
};

function ChapterCardEditor({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
}: ChapterCardEditorProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gold">
            Ch. {section.number}
          </span>
          {editingTitle ? (
            <input
              autoFocus
              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 font-serif text-lg text-foreground"
              value={section.title}
              onChange={(e) => onChange(section.id, { title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingTitle(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="min-w-0 flex-1 text-left font-serif text-lg text-editorial-cream hover:text-gold"
              onClick={() => setEditingTitle(true)}
            >
              {section.title || "Untitled chapter"}
            </button>
          )}
        </div>
        <button
          type="button"
          className="min-h-11 min-w-11 rounded-md text-editorial-muted hover:bg-destructive/15 hover:text-destructive md:min-h-0 md:min-w-0 md:p-2"
          aria-label="Delete chapter"
          onClick={() => onDelete(section.id)}
        >
          <Trash2 className="mx-auto h-4 w-4" aria-hidden />
        </button>
      </div>
      {editingDesc ? (
        <textarea
          autoFocus
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          value={section.description}
          onChange={(e) => onChange(section.id, { description: e.target.value })}
          onBlur={() => setEditingDesc(false)}
        />
      ) : (
        <button
          type="button"
          className="w-full rounded-md px-1 py-1 text-left text-sm leading-relaxed text-editorial-muted hover:bg-muted/20 hover:text-editorial-cream"
          onClick={() => setEditingDesc(true)}
        >
          {section.description || "Click to add a short summary of this chapterâ€¦"}
        </button>
      )}
      {bookType === "non_fiction" ? (
        <div className="space-y-2 rounded-md border border-border/40 bg-card/20 px-3 py-2">
          <label className="block text-xs font-medium text-editorial-muted">
            Reader takeaway
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              value={section.reader_takeaway ?? ""}
              placeholder="What the reader can do or think differently after this chapter"
              onChange={(e) => onChange(section.id, { reader_takeaway: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-editorial-muted">
            Content focus
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              value={section.content_type ?? ""}
              placeholder="e.g. framework, story, research, exercise, mixed"
              onChange={(e) => onChange(section.id, { content_type: e.target.value })}
            />
          </label>
        </div>
      ) : null}
      {typeof section.tension_level === "number" ||
      section.character_moment?.trim() ||
      section.chapter_ends_with?.trim() ? (
        <div className="space-y-1 rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-xs text-editorial-muted">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {typeof section.tension_level === "number" ? (
              <span>
                <span className="font-medium text-editorial-cream/90">Tension</span>{" "}
                {section.tension_level}/10
              </span>
            ) : null}
            {section.chapter_ends_with?.trim() ? (
              <span>
                <span className="font-medium text-editorial-cream/90">Ends with</span>{" "}
                {section.chapter_ends_with.trim()}
              </span>
            ) : null}
          </div>
          {section.character_moment?.trim() ? (
            <p>
              <span className="font-medium text-editorial-cream/90">Character beat:</span>{" "}
              {section.character_moment.trim()}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SortableChapterCard({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
}: ChapterCardEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-full gap-3 rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm",
        isDragging && "z-10 opacity-90 ring-2 ring-gold/40",
      )}
    >
      <button
        type="button"
        className="mt-1 flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-md border border-border/60 text-editorial-muted hover:bg-muted/30 hover:text-gold active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>
      <ChapterCardEditor
        section={section}
        onChange={onChange}
        onDelete={onDelete}
        bookType={bookType}
      />
    </div>
  );
}

type TouchReorderChapterCardProps = ChapterCardEditorProps & {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function TouchReorderChapterCard({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: TouchReorderChapterCardProps) {
  return (
    <div className="flex w-full gap-2 rounded-xl border border-border/70 bg-card/60 p-3 shadow-sm sm:gap-3 sm:p-4">
      <div className="flex shrink-0 flex-col justify-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0 border-border/60"
          disabled={!canMoveUp}
          aria-label="Move chapter up"
          onClick={onMoveUp}
        >
          <ChevronUp className="h-5 w-5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0 border-border/60"
          disabled={!canMoveDown}
          aria-label="Move chapter down"
          onClick={onMoveDown}
        >
          <ChevronDown className="h-5 w-5" aria-hidden />
        </Button>
      </div>
      <ChapterCardEditor
        section={section}
        onChange={onChange}
        onDelete={onDelete}
        bookType={bookType}
      />
    </div>
  );
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return coarse;
}

export type OutlineEditorProps = {
  bookId: string;
  bookTitle: string;
  bookType?: BookTypeDb;
  initialOutline: OutlineRow | null;
};

export function OutlineEditor({
  bookId,
  bookTitle,
  bookType = "fiction",
  initialOutline,
}: OutlineEditorProps) {
  const router = useRouter();
  const coarsePointer = useCoarsePointer();
  const [outlineId, setOutlineId] = useState<string | null>(initialOutline?.id ?? null);
  const [sections, setSections] = useState<SectionRow[]>(() =>
    initialOutline ? renumber(parseSectionsJson(initialOutline.sections)) : [],
  );
  const [loading, setLoading] = useState(!initialOutline);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);

  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const outlineIdRef = useRef(outlineId);
  outlineIdRef.current = outlineId;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(
    ...(coarsePointer ? [keyboardSensor] : [pointerSensor, keyboardSensor]),
  );

  const persist = useCallback(
    async (toSave: SectionRow[]) => {
      const oid = outlineIdRef.current;
      if (!oid) return;
      setSaving(true);
      try {
        const supabase = createClient();
        const dbSections = toDbSections(renumber(toSave));
        const { error: outlineErr } = await supabase
          .from("outlines")
          .update({ sections: dbSections as unknown as Json })
          .eq("id", oid)
          .eq("book_id", bookId);

        if (outlineErr) throw outlineErr;

        const { error: delErr } = await supabase.from("chapters").delete().eq("book_id", bookId);
        if (delErr) throw delErr;

        if (dbSections.length > 0) {
          const { error: insErr } = await supabase.from("chapters").insert(
            dbSections.map((s) => ({
              book_id: bookId,
              chapter_number: s.number,
              title: s.title,
              outline_summary: s.description,
              status: "pending" as const,
            })),
          );
          if (insErr) throw insErr;
        }

        const { error: bookErr } = await supabase
          .from("books")
          .update({ chapter_count: dbSections.length })
          .eq("id", bookId);

        if (bookErr) throw bookErr;

        router.refresh();
      } catch {
        toast.error("Could not save outline. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [bookId, router],
  );

  const scheduleSave = useCallback(
    (snapshot: SectionRow[]) => {
      sectionsRef.current = snapshot;
      if (!outlineIdRef.current) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void persist(sectionsRef.current);
      }, 500);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (initialOutline) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("outlines")
          .select("id, book_id, sections, approved")
          .eq("book_id", bookId)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          toast.error("Could not load outline.");
          return;
        }
        if (data) {
          setOutlineId(data.id);
          setSections(renumber(parseSectionsJson(data.sections)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, initialOutline]);

  const applySectionsFromApi = useCallback((apiSections: OutlineSection[], newOutlineId: string) => {
    setOutlineId(newOutlineId);
    setSections(
      renumber(
        apiSections.map((s) => ({
          ...s,
          id: crypto.randomUUID(),
        })),
      ),
    );
  }, []);

  const runGenerateOutline = useCallback(async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        sections?: OutlineSection[];
        outlineId?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.sections || !data.outlineId) {
        throw new Error(data?.error ?? "Outline generation failed.");
      }
      applySectionsFromApi(data.sections, data.outlineId);
      toast.success("Outline updated.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Outline generation failed.");
    } finally {
      setRegenerating(false);
      setRegenDialogOpen(false);
    }
  }, [applySectionsFromApi, bookId, router]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = renumber(arrayMove(items, oldIndex, newIndex));
      sectionsRef.current = next;
      scheduleSave(next);
      return next;
    });
  };

  const moveSectionByIndex = useCallback(
    (id: string, delta: -1 | 1) => {
      setSections((items) => {
        const i = items.findIndex((s) => s.id === id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= items.length) return items;
        const next = renumber(arrayMove(items, i, j));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const updateSection = useCallback(
    (id: string, patch: SectionPatch) => {
      setSections((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const deleteSection = useCallback(
    (id: string) => {
      setSections((prev) => {
        const next = renumber(prev.filter((s) => s.id !== id));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const addChapter = useCallback(() => {
    setSections((prev) => {
      const next = renumber([
        ...prev,
        {
          id: crypto.randomUUID(),
          number: prev.length + 1,
          title: "New chapter",
          description: "",
          ...(bookType === "non_fiction"
            ? { reader_takeaway: "", content_type: "" }
            : {}),
        },
      ]);
      sectionsRef.current = next;
      scheduleSave(next);
      return next;
    });
  }, [bookType, scheduleSave]);

  const sortableIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const handleApprove = async () => {
    setApproveBusy(true);
    try {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      await persist(sectionsRef.current);

      const result = await approveOutline(bookId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Outline approved â€” happy writing.");
      router.push(`/projects/${bookId}/chapters/${result.firstChapterId}`);
      router.refresh();
    } catch {
      toast.error("Could not approve outline.");
    } finally {
      setApproveBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-editorial-muted">
        <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-gold sm:text-3xl">{bookTitle}</h1>
          <p className="mt-1 text-sm text-editorial-muted">
            {coarsePointer
              ? "Use the arrows to reorder on touch devices. Click titles and descriptions to edit. Changes save automatically."
              : "Drag to reorder, click titles and descriptions to edit. Changes save automatically."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-gold/40 text-gold hover:bg-gold/10"
          disabled={regenerating || !outlineId}
          onClick={() => setRegenDialogOpen(true)}
        >
          {regenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" aria-hidden />
          )}
          Regenerate entire outline
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/30 bg-gradient-to-b from-card/60 to-editorial-bg/80 px-6 py-12 text-center sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Outline</p>
          <h2 className="mt-2 font-serif text-2xl text-editorial-cream sm:text-3xl">
            No outline yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-editorial-muted">
            Once your idea feels solid, we&apos;ll propose chapter titles and beat-by-beat
            summaries. You can drag to reorder, edit every line, and regenerate anytime.
          </p>
          <ol className="mx-auto mt-8 max-w-lg space-y-3 text-left text-sm text-editorial-muted">
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">1.</span>
              Finish refining your idea on the Idea tab (or paste a brief below via generate).
            </li>
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">2.</span>
              Generate a structured outline from your book brief in one pass.
            </li>
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">3.</span>
              Approve when it feels rightâ€”then jump into chapter writing.
            </li>
          </ol>
          <Button
            type="button"
            className="mt-10 bg-gold px-8 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            disabled={regenerating}
            onClick={() => void runGenerateOutline()}
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" aria-hidden />
            )}
            Generate outline from brief
          </Button>
        </div>
      ) : coarsePointer ? (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <TouchReorderChapterCard
              key={section.id}
              section={section}
              onChange={updateSection}
              onDelete={deleteSection}
              bookType={bookType}
              canMoveUp={idx > 0}
              canMoveDown={idx < sections.length - 1}
              onMoveUp={() => moveSectionByIndex(section.id, -1)}
              onMoveDown={() => moveSectionByIndex(section.id, 1)}
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((section) => (
                <SortableChapterCard
                  key={section.id}
                  section={section}
                  onChange={updateSection}
                  onDelete={deleteSection}
                  bookType={bookType}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {sections.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full border border-border/60 sm:w-auto"
          onClick={addChapter}
          disabled={!outlineId}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add chapter
        </Button>
      ) : null}

      {sections.length > 0 ? (
        <div className="pt-4">
          <Button
            type="button"
            className="h-auto w-full gap-2 bg-gold py-4 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            disabled={approveBusy || saving || regenerating || !outlineId}
            onClick={() => void handleApprove()}
          >
            {approveBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : null}
            Approve Outline & Start Writing
          </Button>
          {saving ? (
            <p className="mt-2 text-center text-xs text-editorial-muted">Saving changesâ€¦</p>
          ) : null}
        </div>
      ) : null}

      {regenDialogOpen ? (
        <div
          className={responsiveModalRoot("z-50")}
          role="dialog"
          aria-modal="true"
          aria-labelledby="regen-outline-title"
        >
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close dialog"
            disabled={regenerating}
            onClick={() => {
              if (!regenerating) setRegenDialogOpen(false);
            }}
          />
          <div
            className={responsiveModalPanel("max-w-md p-6")}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="regen-outline-title" className="font-serif text-xl text-gold">
              Regenerate entire outline?
            </h2>
            <p className="mt-2 text-sm text-editorial-muted">
              This replaces all chapters with a fresh AI outline. Your current structure and
              edits will be lost.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={regenerating}
                onClick={() => setRegenDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={regenerating}
                onClick={() => void runGenerateOutline()}
              >
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
~~~

## components/book/ProgressStepper.tsx

~~~tsx
import Link from "next/link";
import type { ReactNode } from "react";

import { Check } from "@/lib/lucide-icons";
import { BOOK_STATUS_ORDER, workflowStatusHref } from "@/lib/book/workflow";
import type { BookStatusDb } from "@/types/database.types";
import { cn } from "@/lib/utils/cn";

const LABELS: Record<BookStatusDb, string> = {
  idea: "Idea",
  refining: "Refine",
  outlining: "Outline",
  writing: "Write",
  editing: "Edit",
  cover: "Cover",
  complete: "Done",
};

type ProgressStepperProps = {
  currentStatus: BookStatusDb;
  className?: string;
  /** Shown before the step row on small screens (e.g. mobile menu). */
  leading?: ReactNode;
  /** When provided, each step is a link to that phase (see `workflowStatusHref`). */
  bookId?: string;
  firstChapterId?: string | null;
};

export function ProgressStepper({
  currentStatus,
  className,
  leading,
  bookId,
  firstChapterId = null,
}: ProgressStepperProps) {
  const activeIndex = BOOK_STATUS_ORDER.indexOf(currentStatus);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <div
      className={cn(
        "flex w-full items-stretch border-b border-border/70 bg-card/40",
        className,
      )}
    >
      {leading ? (
        <div className="flex shrink-0 items-center border-r border-border/60 px-2 py-2 md:hidden">
          {leading}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 overflow-x-auto px-3 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex min-w-max max-w-5xl items-center justify-between gap-0.5 sm:gap-1">
        {BOOK_STATUS_ORDER.map((status, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const showCheck =
            isPast || (isCurrent && currentStatus === "complete");
          const stepHref =
            bookId != null && bookId.length > 0
              ? workflowStatusHref(bookId, firstChapterId, status)
              : null;
          const stepLabel = `${LABELS[status]} â€” go to this step`;

          const circle = (
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors sm:h-10 sm:w-10",
                stepHref &&
                  "group-hover:border-gold/80 group-hover:bg-gold/15 group-focus-visible:border-gold",
                isPast &&
                  "border-gold/55 bg-gold/10 text-gold",
                isCurrent &&
                  "border-gold bg-gold/20 text-gold shadow-[0_0_12px_rgba(201,168,76,0.2)]",
                !isPast &&
                  !isCurrent &&
                  "border-border bg-editorial-bg/90 text-editorial-muted",
              )}
              aria-current={
                stepHref ? undefined : isCurrent ? "step" : undefined
              }
            >
              {showCheck ? (
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
          );

          const label = (
            <span
              className={cn(
                "hidden max-w-[4.5rem] text-center text-[10px] font-medium uppercase tracking-wide sm:block sm:text-xs",
                isCurrent && "text-gold",
                !isCurrent && "text-editorial-muted",
                stepHref && "group-hover:text-gold/90",
              )}
            >
              {LABELS[status]}
            </span>
          );

          const stepColumn = stepHref ? (
            <Link
              href={stepHref}
              prefetch
              aria-label={stepLabel}
              aria-current={isCurrent ? "step" : undefined}
              className="group flex flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {circle}
              {label}
            </Link>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              {circle}
              {label}
            </div>
          );

          return (
            <div key={status} className="flex flex-1 items-center">
              {stepColumn}
              {index < BOOK_STATUS_ORDER.length - 1 ? (
                <div
                  className={cn(
                    "mx-0.5 h-0.5 min-w-[10px] flex-1 rounded-full sm:mx-1",
                    index < currentIndex ? "bg-gold/50" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
~~~

## components/book/ProjectCard.tsx

~~~tsx
"use client";

import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2 } from "@/lib/lucide-icons";
import { toast } from "sonner";

import {
  deleteBookAction,
  renameBookAction,
} from "@/app/(dashboard)/dashboard/actions";
import { bookWorkflowProgressPercent } from "@/lib/book/workflow";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import type { BookStatusDb } from "@/types/database.types";
import { formatDate, formatWordCount } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

import type { DashboardBook } from "@/types/book.types";

const STATUS_BADGE: Record<
  BookStatusDb,
  { label: string; className: string }
> = {
  idea: {
    label: "Idea",
    className:
      "border-violet-500/40 bg-violet-500/15 text-violet-200",
  },
  refining: {
    label: "Refining",
    className: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  },
  outlining: {
    label: "Outlining",
    className: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
  },
  writing: {
    label: "Writing",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  },
  editing: {
    label: "Editing",
    className: "border-orange-500/40 bg-orange-500/15 text-orange-100",
  },
  cover: {
    label: "Cover",
    className: "border-pink-500/40 bg-pink-500/15 text-pink-100",
  },
  complete: {
    label: "Complete",
    className: "border-gold/50 bg-gold/15 text-gold",
  },
};

type ProjectCardProps = {
  book: DashboardBook;
};

function ProjectCardComponent({ book }: ProjectCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(book.title);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleDraft(book.title);
  }, [book.title]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const statusMeta = STATUS_BADGE[book.status] ?? STATUS_BADGE.idea;
  const progress = bookWorkflowProgressPercent(book.status);

  const onRenameSave = async () => {
    setSaving(true);
    const res = await renameBookAction(book.id, titleDraft);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not rename.");
      return;
    }
    toast.success("Title updated.");
    setRenameOpen(false);
    setMenuOpen(false);
    router.refresh();
  };

  const onDelete = async () => {
    const ok = window.confirm(
      `Delete "${book.title}"? This removes the outline and all chapters. This cannot be undone.`,
    );
    if (!ok) {
      return;
    }
    const res = await deleteBookAction(book.id);
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete.");
      return;
    }
    toast.success("Book deleted.");
    setMenuOpen(false);
    router.refresh();
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex h-full flex-col rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm",
          "transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform",
          "hover:scale-[1.02] hover:border-gold/55 hover:shadow-[0_0_28px_rgba(201,168,76,0.28)]",
          "motion-reduce:transition-none motion-reduce:hover:scale-100",
        )}
      >
        <div className="absolute right-3 top-3" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-editorial-muted hover:bg-secondary hover:text-editorial-cream"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Book actions"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {menuOpen ? (
            <ul
              role="menu"
              className="absolute right-0 z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-editorial-card py-1 text-sm shadow-lg"
            >
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-editorial-cream hover:bg-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setTitleDraft(book.title);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Rename
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    void onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete
                </button>
              </li>
            </ul>
          ) : null}
        </div>

        <Link prefetch href={`/projects/${book.id}`} className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <h2 className="line-clamp-2 font-serif text-lg font-semibold text-editorial-cream transition-colors group-hover:text-gold">
              {book.title}
            </h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {book.genre ? (
              <span className="rounded-full border border-border bg-editorial-bg/80 px-2.5 py-0.5 text-xs font-medium text-editorial-muted">
                {book.genre}
              </span>
            ) : (
              <span className="rounded-full border border-border/60 bg-editorial-bg/50 px-2.5 py-0.5 text-xs text-editorial-muted">
                Genre TBD
              </span>
            )}
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                statusMeta.className,
              )}
            >
              {statusMeta.label}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-editorial-muted">
            <div>
              <p className="font-medium uppercase tracking-wide text-editorial-muted/90">
                Words
              </p>
              <p className="mt-0.5 text-sm text-editorial-cream">
                {formatWordCount(book.word_count)}
              </p>
            </div>
            <div>
              <p className="font-medium uppercase tracking-wide text-editorial-muted/90">
                Chapters
              </p>
              <p className="mt-0.5 text-sm text-editorial-cream">
                {book.chapter_count}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-editorial-muted">
            Updated {formatDate(book.updated_at, "MMM d, yyyy")}
          </p>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-editorial-muted">
              <span>Progress</span>
              <span className="text-gold/90">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </Link>
      </div>

      {renameOpen ? (
        <div
          className={responsiveModalRoot("z-50")}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-book-title"
        >
          <button
            type="button"
            className={cn(responsiveModalBackdrop(), "backdrop-blur-sm")}
            aria-label="Close dialog"
            onClick={() => setRenameOpen(false)}
          />
          <div
            className={responsiveModalPanel("max-w-md p-6")}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="rename-book-title"
              className="font-serif text-xl font-semibold text-editorial-cream"
            >
              Rename book
            </h3>
            <div className="mt-4 space-y-2">
              <Label htmlFor={`rename-${book.id}`}>Title</Label>
              <Input
                id={`rename-${book.id}`}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-border text-editorial-cream"
                onClick={() => setRenameOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={saving}
                onClick={() => void onRenameSave()}
              >
                {saving ? "Savingâ€¦" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export const ProjectCard = memo(ProjectCardComponent);
~~~

## components/book/ProjectProgressStepper.tsx

~~~tsx
"use client";

import { usePathname } from "next/navigation";

import { displayStatusForProjectPath } from "@/lib/book/workflow";
import { useProjectBook } from "@/components/layout/project-book-context";
import type { BookStatusDb } from "@/types/database.types";

import { ProgressStepper } from "./ProgressStepper";

type ProjectProgressStepperProps = {
  bookStatus: BookStatusDb;
};

export function ProjectProgressStepper({ bookStatus }: ProjectProgressStepperProps) {
  const pathname = usePathname() ?? "";
  const { bookId, firstChapterId } = useProjectBook();
  const effective = displayStatusForProjectPath(pathname, bookStatus);
  return (
    <ProgressStepper
      currentStatus={effective}
      bookId={bookId}
      firstChapterId={firstChapterId}
    />
  );
}
~~~

## components/landing/genre-cycle.tsx

~~~tsx
"use client";

import { useEffect, useState } from "react";

const GENRES = [
  "Novel",
  "Memoir",
  "Guide",
  "Thriller",
  "Cookbook",
] as const;

export function GenreCycle() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tick = () => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % GENRES.length);
        setVisible(true);
      }, 280);
    };
    const id = window.setInterval(tick, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      className="relative inline-flex min-w-[9.5ch] justify-center font-serif text-gold tabular-nums"
      aria-live="polite"
    >
      <span
        className={`transition-all duration-300 ease-out ${
          visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        {GENRES[index]}
      </span>
    </span>
  );
}
~~~

## components/landing/landing-features.tsx

~~~tsx
import {
  BookOpenCheck,
  FileDown,
  ImageIcon,
  MessagesSquare,
  PencilLine,
  Route,
} from "@/lib/lucide-icons";

const features = [
  {
    title: "AI Idea Refinement",
    body: "A patient editorial dialogue that pulls out audience, stakes, and voiceâ€”then hands you a crisp brief you can trust.",
    icon: MessagesSquare,
  },
  {
    title: "Chapter-by-Chapter Generation",
    body: "Outline-first drafting with streaming output, so each chapter lands with intent instead of wandering filler.",
    icon: BookOpenCheck,
  },
  {
    title: "Inline Editing",
    body: "Bold, headings, and a familiar editor surfaceâ€”tighten prose where it matters without fighting the toolchain.",
    icon: PencilLine,
  },
  {
    title: "DALL-E Cover Art",
    body: "Brief-driven cover prompts tuned for genre shelves, then high-resolution art you can drop into KDP specs.",
    icon: ImageIcon,
  },
  {
    title: "One-Click .docx Export",
    body: "Title page, table of contents, and chapter breaks compiled server-sideâ€”download and upload, not rebuild from scratch.",
    icon: FileDown,
  },
  {
    title: "KDP Publishing Guide",
    body: "Step-by-step Amazon KDP guidance matched to your book: categories, keywords, pricing bands, and cover dimensions.",
    icon: Route,
  },
] as const;

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal-scroll mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-editorial-cream sm:text-4xl">
            Everything a serious draft needs
          </h2>
          <p className="mt-4 text-editorial-muted">
            ChapterAI is built for authors who want manuscript-grade outputâ€”not a
            toy chat window that forgets yesterday&apos;s plot twist.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.title}
                className="reveal-scroll group rounded-xl border border-border/80 bg-card/50 p-6 transition-colors hover:border-gold/35 hover:bg-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold/10 text-gold transition-colors group-hover:bg-gold/15">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-editorial-cream">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
                  {f.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
~~~

## components/landing/landing-footer.tsx

~~~tsx
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/70 bg-editorial-bg px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <p className="font-serif text-2xl font-semibold text-gold">ChapterAI</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-editorial-muted">
            Built for writers. Powered by AI.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-editorial-muted">
          <a href="#features" className="hover:text-editorial-cream">
            Features
          </a>
          <a href="#pricing" className="hover:text-editorial-cream">
            Pricing
          </a>
          <a href="#how-it-works" className="hover:text-editorial-cream">
            How it Works
          </a>
          <Link href="/login" className="hover:text-editorial-cream">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-editorial-cream">
            Sign up
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-12 max-w-6xl text-center text-xs text-editorial-muted/80">
        Â© {new Date().getFullYear()} ChapterAI. Kindle Direct Publishing and
        Amazon are trademarks of Amazon.com, Inc. ChapterAI is not affiliated
        with Amazon.
      </p>
    </footer>
  );
}
~~~

## components/landing/landing-hero.tsx

~~~tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { GenreCycle } from "./genre-cycle";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 px-4 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(201,168,76,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="reveal-scroll text-xs font-semibold uppercase tracking-[0.2em] text-gold/90">
          AI book studio
        </p>
        <h1 className="reveal-scroll mt-5 font-serif text-[clamp(2.25rem,6vw+1rem,4.5rem)] font-semibold leading-[1.1] tracking-tight text-editorial-cream">
          Your Book.
          <br />
          Written.
        </h1>
        <p className="reveal-scroll mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-editorial-muted sm:text-xl">
          Turn a rough idea into a structured outline, full-length chapters, a
          professional cover, and a print-ready{" "}
          <span className="text-editorial-cream">.docx</span>â€”then walk into
          Kindle Direct Publishing with confidence. One calm workflow from pitch
          to publish.
        </p>
        <p className="reveal-scroll mt-8 text-base text-editorial-muted sm:text-lg">
          Built for every kind of bookâ€”including your next{" "}
          <GenreCycle />
          <span className="text-editorial-cream">.</span>
        </p>
        <div className="reveal-scroll mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <Button
            asChild
            size="lg"
            className="min-w-[200px] bg-gold text-base font-semibold text-editorial-bg hover:bg-gold/90"
          >
            <Link href="/signup">Start Free</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-w-[200px] border-border text-editorial-cream hover:bg-secondary hover:text-editorial-cream"
          >
            <a href="#how-it-works">See How it Works</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
~~~

## components/landing/landing-how.tsx

~~~tsx
import {
  BookOpen,
  ListOrdered,
  MessageSquareText,
  Rocket,
  Wand2,
} from "@/lib/lucide-icons";

const steps = [
  {
    n: 1,
    title: "Pitch Your Idea",
    body: "Drop a paragraph or a messy brain-dump. ChapterAI captures tone, audience, and what success looks like for this book.",
    icon: MessageSquareText,
  },
  {
    n: 2,
    title: "Refine the Concept",
    body: "A focused editorial chat sharpens premise, genre, and promiseâ€”so the manuscript has a spine before a single chapter ships.",
    icon: Wand2,
  },
  {
    n: 3,
    title: "Approve the Outline",
    body: "Drag-and-drop structure, edit chapter cards, then lock an outline that every later chapter will honor.",
    icon: ListOrdered,
  },
  {
    n: 4,
    title: "Generate Chapters",
    body: "Stream full chapters in your voice, revise in the editor, and keep continuity tight as the page count climbs.",
    icon: BookOpen,
  },
  {
    n: 5,
    title: "Publish on Amazon",
    body: "Export a polished .docx, pair it with a DALLÂ·E cover, and follow a KDP-ready checklist straight into Kindle Direct Publishing.",
    icon: Rocket,
  },
] as const;

export function LandingHow() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-b border-border/60 bg-editorial-card/30 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal-scroll mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-editorial-cream sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-editorial-muted">
            Five deliberate stagesâ€”no blank-page paralysis, no fifty-tab chaos.
            You steer; the model drafts.
          </p>
        </div>
        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.n}
                className="reveal-scroll relative rounded-xl border border-border/80 bg-card/60 p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <span className="mt-4 block font-serif text-sm font-semibold text-gold">
                  Step {step.n}
                </span>
                <h3 className="mt-1 font-serif text-lg font-semibold text-editorial-cream">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
~~~

## components/landing/landing-json-ld.tsx

~~~tsx
import { SITE_DESCRIPTION } from "@/lib/seo/constants";
import { siteUrlString } from "@/lib/seo/site-url";

export function LandingJsonLd() {
  const url = siteUrlString();
  const structured = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ChapterAI",
    description: SITE_DESCRIPTION,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier with paid Pro upgrade",
    },
    url,
    image: `${url}/og-image.png`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
    />
  );
}
~~~

## components/landing/landing-nav.tsx

~~~tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function LandingNav({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/70 bg-editorial-bg/90 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight text-gold sm:text-2xl"
        >
          ChapterAI
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-editorial-muted md:flex">
          <a
            href="#features"
            className="transition-colors hover:text-editorial-cream"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="transition-colors hover:text-editorial-cream"
          >
            Pricing
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-editorial-cream"
          >
            How it Works
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <nav className="flex max-w-[55vw] items-center justify-end gap-1 text-xs font-medium text-editorial-muted md:hidden">
            <a
              href="#features"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-1 hover:bg-muted/30 hover:text-editorial-cream"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-1 hover:bg-muted/30 hover:text-editorial-cream"
            >
              Pricing
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-1 hover:bg-muted/30 hover:text-editorial-cream"
            >
              How
            </a>
          </nav>
          <Button
            asChild
            className="bg-gold px-3 text-xs font-semibold text-editorial-bg shadow-sm hover:bg-gold/90 sm:px-4 sm:text-sm"
          >
            <Link href="/signup">Start Writing Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
~~~

## components/landing/landing-pricing.tsx

~~~tsx
import Link from "next/link";
import { Check } from "@/lib/lucide-icons";

import { Button } from "@/components/ui/button";

import { ProCheckoutButton } from "./pro-checkout-button";

const freeFeatures = [
  "Up to 3 active books",
  "Up to 10 chapters per book",
  "Idea refinement chat",
  "Outline editor & approval flow",
  "Chapter streaming & editor",
];

const proFeatures = [
  "Unlimited books",
  "Unlimited chapters",
  "Everything in Free",
  "Priority generation queue",
  "Remove â€œPublished with ChapterAIâ€ from exports (when enabled)",
];

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-t border-border/60 bg-editorial-card/25 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal-scroll mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-editorial-cream sm:text-4xl">
            Simple pricing
          </h2>
          <p className="mt-4 text-editorial-muted">
            Start free while you prove the workflow. Move to Pro when the
            manuscriptâ€”and your ambitionâ€”outgrow the caps.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="reveal-scroll flex flex-col rounded-2xl border border-border/80 bg-card/60 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-editorial-muted">
              Free
            </p>
            <p className="mt-2 font-serif text-4xl font-semibold text-editorial-cream">
              $0
            </p>
            <p className="mt-2 text-sm text-editorial-muted">
              For writers validating tone, structure, and pace before they scale
              up.
            </p>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-editorial-cream">
              {freeFeatures.map((line) => (
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
              asChild
              variant="outline"
              className="mt-10 border-border text-editorial-cream hover:bg-secondary hover:text-editorial-cream"
            >
              <Link href="/signup">Start Writing Free</Link>
            </Button>
          </div>
          <div className="reveal-scroll relative flex flex-col overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/10 to-card p-8 shadow-md">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              Pro
            </p>
            <p className="mt-2 font-serif text-4xl font-semibold text-editorial-cream">
              $19
              <span className="text-lg font-normal text-editorial-muted">
                /month
              </span>
            </p>
            <p className="mt-2 text-sm text-editorial-muted">
              When you are shipping multiple titles or long nonfiction without
              chapter ceilings.
            </p>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-editorial-cream">
              {proFeatures.map((line) => (
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
            <ProCheckoutButton />
            <p className="mt-4 text-center text-xs text-editorial-muted">
              Secure checkout powered by Stripe. You can manage billing anytime
              from your account.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
~~~

## components/landing/pro-checkout-button.tsx

~~~tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ProCheckoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.status === 401) {
        toast.info("Sign in to upgrade", {
          description: "Create an account or log in, then try again.",
        });
        router.push(`/login?next=${encodeURIComponent("/?checkout=pro#pricing")}`);
        return;
      }

      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Checkout is temporarily unavailable.");
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error("Could not reach checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      className="mt-8 w-full bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
      disabled={loading}
      onClick={() => void onClick()}
    >
      {loading ? "Redirectingâ€¦" : "Upgrade with Stripe"}
    </Button>
  );
}
~~~

## components/layout/dashboard-chrome.tsx

~~~tsx
"use client";

import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header";

function titleForPath(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return "Your library";
  }
  if (pathname.startsWith("/profile")) {
    return "Profile";
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return "Settings";
  }
  return "Dashboard";
}

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isProject = /^\/projects\/[^/]+/.test(pathname);

  if (isProject) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col bg-editorial-bg">
      <Header title={titleForPath(pathname)} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
~~~

## components/layout/dashboard-inner.tsx

~~~tsx
"use client";

import type { DashboardProfileValue } from "@/components/layout/dashboard-profile-context";
import { DashboardProfileProvider } from "@/components/layout/dashboard-profile-context";
import { DashboardChrome } from "@/components/layout/dashboard-chrome";
import { FreeTierBanner } from "@/components/layout/free-tier-banner";
import { PaymentIssueBanner } from "@/components/layout/payment-issue-banner";

export function DashboardInner({
  profile,
  children,
}: {
  profile: DashboardProfileValue;
  children: React.ReactNode;
}) {
  return (
    <DashboardProfileProvider value={profile}>
      <PaymentIssueBanner />
      <FreeTierBanner />
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardProfileProvider>
  );
}
~~~

## components/layout/dashboard-profile-context.tsx

~~~tsx
"use client";

import { createContext, useContext } from "react";

import type { SubscriptionTierDb } from "@/types/database.types";

export type DashboardProfileValue = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  penName: string | null;
  website: string | null;
  location: string | null;
  twitterHandle: string | null;
  subscriptionTier: SubscriptionTierDb;
  /** ISO timestamp if the last renewal invoice failed; null when billing is healthy. */
  paymentFailedAt: string | null;
  paymentFailureReason: string | null;
};

const DashboardProfileContext = createContext<DashboardProfileValue | null>(null);

export function DashboardProfileProvider({
  value,
  children,
}: {
  value: DashboardProfileValue;
  children: React.ReactNode;
}) {
  return (
    <DashboardProfileContext.Provider value={value}>{children}</DashboardProfileContext.Provider>
  );
}

export function useDashboardProfile(): DashboardProfileValue {
  const ctx = useContext(DashboardProfileContext);
  if (!ctx) {
    throw new Error("useDashboardProfile must be used within DashboardProfileProvider");
  }
  return ctx;
}
~~~

## components/layout/free-tier-banner.tsx

~~~tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";

export function FreeTierBanner() {
  const { subscriptionTier } = useDashboardProfile();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (subscriptionTier !== "free") {
    return null;
  }

  const onUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/dashboard")}`);
        return;
      }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Checkout unavailable.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not start checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-gold/25 bg-gold/10 px-4 py-2.5 text-center text-sm text-editorial-cream sm:px-6">
      <span className="text-editorial-muted">You&apos;re on the free plan.</span>{" "}
      <button
        type="button"
        disabled={loading}
        onClick={() => void onUpgrade()}
        className="font-semibold text-gold underline-offset-2 hover:underline disabled:opacity-60"
      >
        {loading ? "Redirectingâ€¦" : "Upgrade for unlimited books â†’"}
      </button>
      <span className="mx-2 text-editorial-muted/50">Â·</span>
      <Link
        href="/dashboard/settings#coupon"
        className="text-editorial-muted underline-offset-2 hover:text-gold hover:underline"
      >
        Have a coupon?
      </Link>
    </div>
  );
}
~~~

## components/layout/Header.tsx

~~~tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CreditCard, LogOut, Settings, UserRound } from "@/lib/lucide-icons";
import { toast } from "sonner";

import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

function LogoMark() {
  return (
    <Link
      prefetch
      href="/dashboard"
      className="font-serif text-lg font-semibold tracking-tight text-gold transition-opacity hover:opacity-90"
    >
      ChapterAI
    </Link>
  );
}

export type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const profile = useDashboardProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials =
    profile.fullName?.trim()?.charAt(0)?.toUpperCase() ??
    profile.email?.charAt(0)?.toUpperCase() ??
    "?";

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.replace("/login");
    router.refresh();
  };

  const onBilling = async () => {
    setBillingLoading(true);
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
      setBillingLoading(false);
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-editorial-bg/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="w-28 shrink-0 sm:w-36">
          <LogoMark />
        </div>
        <h1 className="min-w-0 flex-1 text-center font-serif text-lg font-medium text-editorial-cream sm:text-xl">
          {title}
        </h1>
        <div className="relative flex w-28 shrink-0 justify-end sm:w-36" ref={menuRef}>
          <button
            type="button"
            className={cn(
              "relative flex h-10 w-10 max-md:min-h-[44px] max-md:min-w-[44px] items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-gold transition hover:border-gold/40",
              menuOpen && "border-gold/50 ring-2 ring-gold/20",
            )}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default bg-transparent"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-12 z-40 min-w-[200px] rounded-lg border border-border bg-card py-1 shadow-xl"
                role="menu"
              >
                <Link
                  prefetch
                  href="/profile"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-cream hover:bg-muted/50"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound className="h-4 w-4 text-gold" aria-hidden />
                  Profile
                </Link>
                <Link
                  prefetch
                  href="/dashboard/settings"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-cream hover:bg-muted/50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 text-gold" aria-hidden />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  disabled={billingLoading}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-editorial-cream hover:bg-muted/50 disabled:opacity-50"
                  onClick={() => void onBilling()}
                >
                  <CreditCard className="h-4 w-4 text-gold" aria-hidden />
                  {billingLoading ? "Openingâ€¦" : "Billing"}
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-editorial-cream hover:bg-muted/50"
                  onClick={() => void onSignOut()}
                >
                  <LogOut className="h-4 w-4 text-editorial-muted" aria-hidden />
                  Sign out
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
~~~

## components/layout/payment-issue-banner.tsx

~~~tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";

/** Reason strings we want to render with friendlier copy. */
function humanizeReason(raw: string | null): string {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("insufficient")) return "Insufficient funds on the card on file.";
  if (lower.includes("expired")) return "The card on file has expired.";
  if (lower.includes("card_declined") || lower.includes("declined")) {
    return "The card on file was declined.";
  }
  if (lower.includes("authentication")) return "The bank requested additional authentication.";
  // Fall back to showing a trimmed version of Stripe's message.
  return raw.length > 140 ? `${raw.slice(0, 140)}â€¦` : raw;
}

export function PaymentIssueBanner() {
  const { paymentFailedAt, paymentFailureReason, subscriptionTier } = useDashboardProfile();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!paymentFailedAt) return null;

  const openPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.status === 401) {
        router.push("/login?next=/dashboard");
        return;
      }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Billing portal unavailable.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not open billing portal.");
    } finally {
      setLoading(false);
    }
  };

  const detail = humanizeReason(paymentFailureReason);
  const stillPro = subscriptionTier === "pro";

  return (
    <div
      role="alert"
      className="border-b border-destructive/40 bg-destructive/15 px-4 py-2.5 text-sm text-editorial-cream sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-destructive-foreground">
            Payment issue on your ChapterAI subscription.
          </span>{" "}
          <span className="text-editorial-cream/90">
            {detail ||
              "Your most recent renewal charge failed. Stripe will retry, but your Pro access may lapse if it keeps failing."}
          </span>
          {stillPro ? (
            <span className="ml-1 text-editorial-muted">
              You still have Pro access for now.
            </span>
          ) : (
            <span className="ml-1 text-editorial-muted">Your account has dropped to Free.</span>
          )}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void openPortal()}
          className="shrink-0 rounded-md border border-destructive/60 bg-destructive/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-destructive-foreground hover:bg-destructive/30 disabled:opacity-60"
        >
          {loading ? "Openingâ€¦" : "Update payment method"}
        </button>
      </div>
    </div>
  );
}
~~~

## components/layout/project-book-context.tsx

~~~tsx
"use client";

import { createContext, useContext } from "react";

import type { BookStatusDb } from "@/types/database.types";

export type ProjectBookValue = {
  bookId: string;
  bookTitle: string;
  bookStatus: BookStatusDb;
  firstChapterId: string | null;
};

const ProjectBookContext = createContext<ProjectBookValue | null>(null);

export function ProjectBookProvider({
  value,
  children,
}: {
  value: ProjectBookValue;
  children: React.ReactNode;
}) {
  return <ProjectBookContext.Provider value={value}>{children}</ProjectBookContext.Provider>;
}

export function useProjectBook(): ProjectBookValue {
  const ctx = useContext(ProjectBookContext);
  if (!ctx) {
    throw new Error("useProjectBook must be used within ProjectBookProvider");
  }
  return ctx;
}
~~~

## components/layout/Sidebar.tsx

~~~tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  BookOpen,
  Check,
  Download,
  ImageIcon,
  LayoutDashboard,
  Lightbulb,
  ListTree,
  Settings,
  Sparkles,
  X,
} from "@/lib/lucide-icons";

import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";
import { useProjectBook } from "@/components/layout/project-book-context";
import { Button } from "@/components/ui/button";
import { bookStatusIndex } from "@/lib/book/workflow";
import { useProjectSidebarStore } from "@/stores/project-sidebar-store";
import type { BookStatusDb } from "@/types/database.types";
import { cn } from "@/lib/utils/cn";

type NavStep = "idea" | "outline" | "chapters" | "cover" | "export";

const STEPS: {
  key: NavStep;
  label: string;
  Icon: typeof Lightbulb;
  href: (bookId: string, firstChapterId: string | null) => string;
}[] = [
  {
    key: "idea",
    label: "Idea",
    Icon: Lightbulb,
    href: (bookId) => `/projects/${bookId}/idea`,
  },
  {
    key: "outline",
    label: "Outline",
    Icon: ListTree,
    href: (bookId) => `/projects/${bookId}/outline`,
  },
  {
    key: "chapters",
    label: "Chapters",
    Icon: BookOpen,
    href: (bookId, first) =>
      first ? `/projects/${bookId}/chapters/${first}` : `/projects/${bookId}/outline`,
  },
  {
    key: "cover",
    label: "Cover",
    Icon: ImageIcon,
    href: (bookId) => `/projects/${bookId}/cover`,
  },
  {
    key: "export",
    label: "Export",
    Icon: Download,
    href: (bookId) => `/projects/${bookId}/export`,
  },
];

function activeStepFromPath(pathname: string): NavStep {
  if (pathname.includes("/export")) return "export";
  if (pathname.includes("/cover")) return "cover";
  if (pathname.includes("/chapters/")) return "chapters";
  if (pathname.includes("/outline")) return "outline";
  return "idea";
}

function stepCompleted(step: NavStep, bookStatus: BookStatusDb): boolean {
  const i = bookStatusIndex(bookStatus);
  switch (step) {
    case "idea":
      return i >= bookStatusIndex("outlining");
    case "outline":
      return i >= bookStatusIndex("writing");
    case "chapters":
      return i >= bookStatusIndex("cover");
    case "cover":
      return i >= bookStatusIndex("complete");
    case "export":
      return bookStatus === "complete";
    default:
      return false;
  }
}

type SidebarBodyProps = {
  compact: boolean;
  onNavigate?: () => void;
};

function SidebarBody({ compact, onNavigate }: SidebarBodyProps) {
  const pathname = usePathname() ?? "";
  const { bookId, bookTitle, bookStatus, firstChapterId } = useProjectBook();
  const profile = useDashboardProfile();
  const active = activeStepFromPath(pathname);

  const initials =
    profile.fullName?.trim()?.charAt(0)?.toUpperCase() ??
    profile.email?.charAt(0)?.toUpperCase() ??
    "?";

  return (
    <>
      {compact ? (
        <div className="border-b border-border/60 px-2 py-4 lg:px-4">
          <Link
            prefetch
            href="/dashboard"
            className="flex items-center justify-center gap-2 lg:justify-start"
            title="ChapterAI â€” Dashboard"
          >
            <Sparkles className="h-6 w-6 shrink-0 text-gold lg:hidden" aria-hidden />
            <span className="hidden font-serif text-lg font-semibold tracking-tight text-gold lg:inline">
              ChapterAI
            </span>
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
          <Link
            prefetch
            href="/dashboard"
            className="flex min-h-11 items-center gap-2 font-serif text-lg font-semibold tracking-tight text-gold"
            title="ChapterAI â€” Dashboard"
            onClick={onNavigate}
          >
            <Sparkles className="h-6 w-6 shrink-0 text-gold" aria-hidden />
            ChapterAI
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-editorial-muted hover:text-editorial-cream"
            aria-label="Close menu"
            onClick={onNavigate}
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      )}

      <div className={cn("border-b border-border/40 py-3", compact ? "px-2 lg:px-3" : "px-3")}>
        <p
          className={cn(
            "truncate text-[10px] font-medium uppercase tracking-wide text-editorial-muted",
            compact ? "text-center lg:text-left lg:text-xs" : "text-left text-xs",
          )}
          title={bookTitle}
        >
          <span className={cn(!compact ? "inline" : "hidden lg:inline")}>Project Â· </span>
          <span className={cn(compact && "lg:font-normal")}>{bookTitle}</span>
        </p>
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-0.5 overflow-y-auto py-3",
          compact ? "px-1 lg:px-2" : "px-2",
        )}
        aria-label="Project workflow"
      >
        {STEPS.map(({ key, label, Icon, href }) => {
          const to = href(bookId, firstChapterId);
          const isActive = active === key;
          const done = stepCompleted(key, bookStatus);
          return (
            <Link
              prefetch
              key={key}
              href={to}
              title={label}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm transition-colors",
                compact ? "px-2 py-2.5 lg:px-3" : "min-h-11 px-3 py-2",
                isActive
                  ? "bg-gold/15 text-gold"
                  : "text-editorial-muted hover:bg-muted/40 hover:text-editorial-cream",
              )}
            >
              <span
                className={cn(
                  "relative flex shrink-0 items-center justify-center rounded-full border border-border/80 bg-editorial-bg/80",
                  compact ? "h-9 w-9" : "h-11 w-11",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {done ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-medium",
                  compact ? "hidden lg:inline" : "inline",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-border/60", compact ? "p-2 lg:p-3" : "p-3")}>
        <Link
          prefetch
          href="/dashboard/settings"
          className={cn(
            "mb-1 flex items-center gap-2 rounded-lg text-xs font-medium text-editorial-muted transition hover:bg-muted/30 hover:text-gold",
            compact ? "justify-center py-2 lg:justify-start lg:px-3 lg:text-sm" : "min-h-11 px-3 py-2 text-sm",
          )}
          onClick={onNavigate}
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn(compact ? "hidden lg:inline" : "inline")}>Settings</span>
        </Link>
        <Link
          prefetch
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-lg text-xs font-medium text-editorial-muted transition hover:bg-muted/30 hover:text-gold",
            compact ? "justify-center py-2 lg:justify-start lg:px-3 lg:text-sm" : "min-h-11 px-3 py-2 text-sm",
          )}
          onClick={onNavigate}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn(compact ? "hidden lg:inline" : "inline")}>Back to Dashboard</span>
        </Link>
      </div>

      <div className={cn("border-t border-border/60", compact ? "p-2 lg:p-3" : "p-3")}>
        <div
          className={cn(
            "flex gap-2",
            compact ? "flex-col items-center lg:flex-row lg:items-center" : "flex-row items-center",
          )}
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-editorial-bg text-xs font-semibold text-gold">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className={cn("min-w-0 flex-1", compact ? "hidden lg:block" : "block")}>
            <p className="truncate text-sm font-medium text-editorial-cream">
              {profile.fullName?.trim() || profile.email}
            </p>
            <span
              className={cn(
                "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                profile.subscriptionTier === "pro"
                  ? "bg-gold/20 text-gold"
                  : "bg-muted text-editorial-muted",
              )}
            >
              {profile.subscriptionTier === "pro" ? "Pro" : "Free"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const mobileOpen = useProjectSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useProjectSidebarStore((s) => s.setMobileOpen);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      <div className="md:hidden" aria-hidden={!mobileOpen}>
        {mobileOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-[1px]"
              aria-label="Close menu"
              onClick={closeMobile}
            />
            <aside
              className="fixed inset-y-0 left-0 z-[60] flex h-[100dvh] w-[min(280px,100vw)] flex-col border-r border-border/70 bg-card/95 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Project navigation"
            >
              <SidebarBody compact={false} onNavigate={closeMobile} />
            </aside>
          </>
        ) : null}
      </div>

      <aside
        className={cn(
          "hidden h-[100dvh] w-16 shrink-0 flex-col border-r border-border/70 bg-card/50 md:flex md:flex-col lg:w-[240px]",
        )}
      >
        <SidebarBody compact />
      </aside>
    </>
  );
}
~~~

## components/layout/skeletons.tsx

~~~tsx
export function DashboardGridSkeleton() {
  function CardSkeleton() {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-5 shadow-sm">
        <div className="h-5 w-3/4 animate-pulse rounded bg-editorial-muted/25" />
        <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-editorial-muted/20" />
        <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-editorial-muted/15" />
        <div className="mt-2 flex justify-between gap-4">
          <div className="h-3 w-20 animate-pulse rounded bg-editorial-muted/15" />
          <div className="h-3 w-16 animate-pulse rounded bg-editorial-muted/15" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="h-9 w-48 animate-pulse rounded bg-editorial-muted/25 sm:h-10 sm:w-64" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-editorial-muted/15" />
          <div className="h-4 w-2/3 max-w-xl animate-pulse rounded bg-editorial-muted/15" />
          <div className="flex gap-2 pt-2">
            <div className="h-7 w-24 animate-pulse rounded-full bg-editorial-muted/20" />
            <div className="h-7 w-28 animate-pulse rounded-full bg-editorial-muted/20" />
          </div>
        </div>
        <div className="h-10 w-32 shrink-0 animate-pulse rounded-md bg-gold/20" />
      </div>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <CardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectWorkspaceSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-editorial-bg">
      <div className="border-b border-border/60 bg-card/40 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-editorial-muted/25 sm:h-10 sm:w-10" />
              {i < 7 ? (
                <div className="mx-0.5 h-0.5 min-w-[10px] flex-1 animate-pulse rounded-full bg-editorial-muted/20 sm:mx-1" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-16 shrink-0 flex-col border-r border-border/70 bg-card/50 lg:w-[240px]">
          <div className="border-b border-border/60 px-2 py-4 lg:px-4">
            <div className="mx-auto h-6 w-16 animate-pulse rounded bg-editorial-muted/25 lg:w-32" />
          </div>
          <div className="space-y-2 px-2 py-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 lg:px-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-editorial-muted/25" />
                <div className="hidden h-4 flex-1 animate-pulse rounded bg-editorial-muted/20 lg:block" />
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-border/60 p-2 lg:p-3">
            <div className="mx-auto h-9 w-9 animate-pulse rounded-full bg-editorial-muted/25" />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-6">
          <div className="mx-auto mb-6 h-8 w-2/3 max-w-md animate-pulse rounded bg-editorial-muted/20" />
          <div className="mx-auto h-4 w-full max-w-2xl animate-pulse rounded bg-editorial-muted/15" />
          <div className="mx-auto mt-3 h-4 w-5/6 max-w-2xl animate-pulse rounded bg-editorial-muted/15" />
          <div className="mx-auto mt-8 min-h-[280px] w-full max-w-3xl animate-pulse rounded-xl bg-editorial-muted/10" />
        </div>
      </div>
    </div>
  );
}

export function SimplePageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded bg-editorial-muted/25" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-editorial-muted/15" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-editorial-muted/15" />
      <div className="mt-8 min-h-[320px] animate-pulse rounded-xl bg-editorial-muted/10" />
    </div>
  );
}
~~~

## components/profile/profile-page-client.tsx

~~~tsx
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

      {/* Identity card â€” avatar + headline */}
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
                  Paste a profile URL or just the handle â€” we&apos;ll clean it up.
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
            Subscription & billing â†’
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
                  Savingâ€¦
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
~~~

## components/providers/navigation-progress-bar.tsx

~~~tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useGlobalProgressStore } from "@/stores/global-progress-store";

/**
 * Site-wide NProgress-style top bar.
 *
 * Starts as soon as the user initiates navigation (anchor click, form
 * submit, `router.push/replace` via history patching, `popstate`, or a full
 * page `beforeunload`) so the app never feels frozen while the next screen
 * compiles/fetches. Completes when the pathname changes or when the
 * `inFlight` counter from {@link useGlobalProgressStore} drops to zero.
 *
 * Also exposes a hard safety timer so a missed "done" event can never leave
 * the bar stuck.
 */
export function NavigationProgressBar() {
  const pathname = usePathname();
  const inFlight = useGlobalProgressStore((s) => s.inFlight);

  const [progress, setProgress] = useState(0);
  const [hiding, setHiding] = useState(false);

  const activeRef = useRef(false);
  const tickRef = useRef<number | null>(null);
  const finishRef = useRef<number | null>(null);
  const hideRef = useRef<number | null>(null);
  const safetyRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (finishRef.current !== null) {
      window.clearTimeout(finishRef.current);
      finishRef.current = null;
    }
    if (hideRef.current !== null) {
      window.clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    if (safetyRef.current !== null) {
      window.clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  };

  const startInternal = () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setHiding(false);
    clearTimers();
    setProgress((p) => (p > 0 && p < 90 ? p : 8));
    tickRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const step = Math.max(0.6, (92 - p) / 20);
        return Math.min(90, p + step);
      });
    }, 220);
    safetyRef.current = window.setTimeout(() => {
      doneInternal();
    }, 15000);
  };

  const doneInternal = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(100);
    finishRef.current = window.setTimeout(() => {
      setHiding(true);
      hideRef.current = window.setTimeout(() => {
        setProgress(0);
        setHiding(false);
      }, 240);
    }, 140);
  };

  // React to store-driven work (API calls flagged via useGlobalProgressStore).
  useEffect(() => {
    if (inFlight > 0) startInternal();
    else doneInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlight]);

  // Complete the bar on every route change.
  useEffect(() => {
    doneInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Global navigation intent listeners â€” the critical UX piece.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      )
        return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash !== ""
        )
          return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        )
          return;
        startInternal();
      } catch {
        // Malformed href â€” ignore.
      }
    };

    const handleSubmit = (_e: Event) => {
      startInternal();
    };

    const handlePopState = () => {
      startInternal();
    };

    const handleBeforeUnload = () => {
      startInternal();
    };

    // Patch history so programmatic `router.push/replace` also shows progress.
    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    const patchedPush: typeof window.history.pushState = (...args) => {
      startInternal();
      return originalPush(...args);
    };
    const patchedReplace: typeof window.history.replaceState = (...args) => {
      startInternal();
      return originalReplace(...args);
    };
    window.history.pushState = patchedPush;
    window.history.replaceState = patchedReplace;

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearTimers();
    };
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      aria-hidden
      role="presentation"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-visible"
    >
      <div
        className="relative h-full bg-gradient-to-r from-gold/40 via-gold to-gold/95 shadow-[0_0_12px_rgba(201,168,76,0.75),0_0_4px_rgba(201,168,76,0.55)]"
        style={{
          width: `${progress}%`,
          opacity: hiding ? 0 : 1,
          transition:
            progress === 100
              ? "width 220ms ease-out, opacity 260ms ease-out"
              : "width 220ms linear, opacity 200ms linear",
        }}
      >
        <span
          aria-hidden
          className="absolute right-0 top-1/2 block h-[14px] w-24 -translate-y-1/2 rounded-full bg-gold/70 opacity-80 blur-[10px]"
          style={{ opacity: hiding ? 0 : 0.75 }}
        />
      </div>
    </div>
  );
}
~~~

## components/providers/offline-service-worker.tsx

~~~tsx
"use client";

import { useEffect, useRef, useState } from "react";

function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-blocking */
    });
  });
}

/** Tiny same-origin fetch â€” if this succeeds, we treat the app as reachable even if `navigator.onLine` lies. */
async function canReachAppOrigin(): Promise<boolean> {
  const origin = window.location.origin;
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      credentials: "same-origin",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(id);
  }
}

export function OfflineServiceWorkerAndBanner() {
  const [offline, setOffline] = useState(false);
  /** Increment to invalidate pending offline debounce callbacks (avoids timer handle typing issues). */
  const offlineDebounceGen = useRef(0);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const reconcile = async () => {
      if (typeof navigator === "undefined" || cancelled) {
        return;
      }
      if (navigator.onLine) {
        setOffline(false);
        return;
      }
      const reachable = await canReachAppOrigin();
      if (!cancelled) {
        setOffline(!reachable);
      }
    };

    const invalidateOfflineDebounce = () => {
      offlineDebounceGen.current += 1;
    };

    const onOnline = () => {
      invalidateOfflineDebounce();
      setOffline(false);
    };

    const onOffline = () => {
      invalidateOfflineDebounce();
      const generation = offlineDebounceGen.current;
      window.setTimeout(() => {
        if (offlineDebounceGen.current !== generation) {
          return;
        }
        void reconcile();
      }, 500);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void reconcile();
      }
    };

    void reconcile();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      invalidateOfflineDebounce();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] max-w-md -translate-x-1/2 rounded-lg border border-amber-500/40 bg-amber-950/90 px-4 py-2 text-center text-sm text-amber-100 shadow-lg"
    >
      You appear to be offline. Changes will save when reconnected.
    </div>
  );
}
~~~

## components/providers/page-transition.tsx

~~~tsx
"use client";

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <div key={pathname} className="chapterai-page-transition-enter">
      {children}
    </div>
  );
}
~~~

## components/providers/root-app-chrome.tsx

~~~tsx
"use client";

import { NavigationProgressBar } from "@/components/providers/navigation-progress-bar";
import { PageTransition } from "@/components/providers/page-transition";

export function RootAppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavigationProgressBar />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
~~~

## components/settings/settings-page-client.tsx

~~~tsx
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
  "Remove â€œPublished with ChapterAIâ€ from exports (when enabled)",
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

  const lastSavedName = useRef((initialFullName ?? "").trim());

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
          description: "Refreshing your accountâ€¦",
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

      {/* Section 1 â€” Profile */}
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

      {/* Section 2 â€” Subscription */}
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
              {checkoutLoading ? "Redirectingâ€¦" : "Upgrade to Pro â€” $19/month"}
            </Button>

            {/* â”€â”€ Coupon code â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
            {portalLoading ? "Openingâ€¦" : "Manage subscription"}
          </Button>
        )}
      </section>

      {/* Section 3 â€” Danger */}
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
                    Deletingâ€¦
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
~~~

## components/subscription/ProUpgradeModal.tsx

~~~tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";

export type ProUpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
};

export function ProUpgradeModal({
  open,
  onClose,
  title,
  description,
}: ProUpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!open) {
    return null;
  }

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.status === 401) {
        toast.info("Sign in to upgrade", {
          description: "Create an account or log in, then try again.",
        });
        router.push(`/login?next=${encodeURIComponent("/dashboard")}`);
        onClose();
        return;
      }

      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Checkout is temporarily unavailable.");
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error("Could not reach checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={responsiveModalRoot("z-[100]")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-upgrade-title"
    >
      <button
        type="button"
        className={responsiveModalBackdrop()}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className={responsiveModalPanel("max-w-md border-gold/30 bg-editorial-card p-6")}>
        <h2 id="pro-upgrade-title" className="font-serif text-2xl text-gold">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-editorial-muted">{description}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-editorial-muted/50 text-editorial-cream hover:bg-editorial-bg/60"
            disabled={loading}
            onClick={onClose}
          >
            Not now
          </Button>
          <Button
            type="button"
            className="bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
            disabled={loading}
            onClick={() => void startCheckout()}
          >
            {loading ? "Redirectingâ€¦" : "Upgrade to Pro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
~~~

## components/ui/back-to-top.tsx

~~~tsx
"use client";

import { ArrowUp } from "@/lib/lucide-icons";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const THRESHOLD_PX = 400;

type BackToTopProps = {
  /** When set, listen to this elementâ€™s scroll; otherwise use the window. */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  /** Re-bind when layout changes (e.g. chapter id) so ref points at the new scroll container. */
  bindKey?: string | number;
  className?: string;
};

export function BackToTop({ scrollContainerRef, bindKey, className }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  const update = useCallback(() => {
    if (scrollContainerRef?.current) {
      setVisible(scrollContainerRef.current.scrollTop > THRESHOLD_PX);
      return;
    }
    setVisible(window.scrollY > THRESHOLD_PX);
  }, [scrollContainerRef]);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (el) {
      el.addEventListener("scroll", update, { passive: true });
      update();
      return () => el.removeEventListener("scroll", update);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [scrollContainerRef, bindKey, update]);

  const scrollTop = useCallback(() => {
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [scrollContainerRef]);

  if (!visible) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      aria-label="Back to top"
      className={cn(
        "fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full border border-gold/35 bg-card/95 text-gold shadow-lg backdrop-blur-sm transition hover:bg-gold/15",
        className,
      )}
      onClick={scrollTop}
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </Button>
  );
}
~~~

## components/ui/button.tsx

~~~tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Loader2 } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 max-md:min-h-[44px] motion-reduce:transition-colors active:scale-[0.98] motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "chapterai-btn-primary-shimmer bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10 max-md:min-h-[44px] max-md:min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render the button with a leading spinner and force `disabled`/`aria-busy`.
   * Leave children intact so screen readers still announce the action.
   *
   * Ignored when `asChild` is true (you control the node directly in that case).
   */
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children as React.ReactElement}
        </Slot>
      );
    }

    const isDisabled = disabled || loading;
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2
            className="mr-2 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
~~~

## components/ui/input.tsx

~~~tsx
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
~~~

## components/ui/label.tsx

~~~tsx
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none text-editorial-cream peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}
~~~

## components/ui/page-loader.tsx

~~~tsx
import { Loader2 } from "@/lib/lucide-icons";

type Props = {
  label?: string;
  /**
   * When true (default) the loader fills the viewport. Set false to render it
   * inline inside a card / panel.
   */
  fullScreen?: boolean;
};

/**
 * Branded loading placeholder used by route-level `loading.tsx` files and
 * any async boundary that doesn't already render a tailored skeleton. Keeps
 * the UI from feeling frozen while a screen compiles or fetches.
 */
export function PageLoader({
  label = "Loadingâ€¦",
  fullScreen = true,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? "flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-editorial-muted"
          : "flex flex-col items-center justify-center gap-3 py-8 text-editorial-muted"
      }
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-gold/15 motion-reduce:animate-none"
        />
        <span
          aria-hidden
          className="absolute inset-1 rounded-full border border-gold/30"
        />
        <Loader2
          className="h-7 w-7 animate-spin text-gold motion-reduce:animate-none"
          aria-hidden
        />
      </div>
      <p className="font-serif text-sm tracking-wide text-editorial-cream/90">
        {label}
      </p>
      <span className="sr-only">Loading, please wait.</span>
    </div>
  );
}
~~~

## components/ui/textarea.tsx

~~~tsx
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => {
    return (
      <textarea
        rows={rows}
        className={cn(
          "flex w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-y leading-relaxed",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
~~~

## hooks/useBook.ts

~~~ts
"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { createClient } from "@/lib/supabase/client";
import {
  BOOK_ROW_COLUMNS,
  CHAPTER_ROW_COLUMNS,
  OUTLINE_ROW_COLUMNS,
} from "@/lib/supabase/select-columns";
import type { BookWithChapters } from "@/types/book.types";
import type { Database } from "@/types/database.types";

export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type Outline = Database["public"]["Tables"]["outlines"]["Row"];

type BookRow = Database["public"]["Tables"]["books"]["Row"];

export type BookStoreState = {
  currentBook: BookWithChapters | null;
  chapters: Chapter[];
  outline: Outline | null;
  isGenerating: boolean;
  generatingChapterId: string | null;
};

type BookStoreActions = {
  setCurrentBook: (book: BookWithChapters | null) => void;
  setChapters: (chapters: Chapter[]) => void;
  updateChapter: (chapterId: string, patch: Partial<Chapter>) => void;
  setOutline: (outline: Outline | null) => void;
  setGenerating: (isGenerating: boolean, generatingChapterId: string | null) => void;
  reset: () => void;
  loadBook: (bookId: string) => Promise<void>;
};

const initialState: BookStoreState = {
  currentBook: null,
  chapters: [],
  outline: null,
  isGenerating: false,
  generatingChapterId: null,
};

function mergeChapterList(
  list: Chapter[],
  chapterId: string,
  patch: Partial<Chapter>,
): Chapter[] {
  let hit = false;
  const next = list.map((c) => {
    if (c.id !== chapterId) return c;
    hit = true;
    return { ...c, ...patch };
  });
  if (!hit) return list;
  return next;
}

export const useBookStore = create<BookStoreState & BookStoreActions>((set, _get) => ({
  ...initialState,

  setCurrentBook: (book) =>
    set({
      currentBook: book,
      chapters: book?.chapters ?? [],
    }),

  setChapters: (chapters) =>
    set((state) => ({
      chapters,
      currentBook: state.currentBook ? { ...state.currentBook, chapters } : null,
    })),

  updateChapter: (chapterId, patch) =>
    set((state) => {
      const chapters = mergeChapterList(state.chapters, chapterId, patch);
      const currentBook = state.currentBook
        ? {
            ...state.currentBook,
            chapters: mergeChapterList(state.currentBook.chapters, chapterId, patch),
          }
        : null;
      return { chapters, currentBook };
    }),

  setOutline: (outline) => set({ outline }),

  setGenerating: (isGenerating, generatingChapterId) =>
    set({ isGenerating, generatingChapterId }),

  reset: () => set({ ...initialState }),

  loadBook: async (bookId) => {
    const supabase = createClient();
    const [bookRes, chaptersRes, outlineRes] = await Promise.all([
      supabase.from("books").select(BOOK_ROW_COLUMNS).eq("id", bookId).single(),
      supabase
        .from("chapters")
        .select(CHAPTER_ROW_COLUMNS)
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true }),
      supabase.from("outlines").select(OUTLINE_ROW_COLUMNS).eq("book_id", bookId).maybeSingle(),
    ]);

    if (bookRes.error) {
      throw new Error(bookRes.error.message || "Failed to load book.");
    }
    if (!bookRes.data) {
      throw new Error("Book not found.");
    }
    if (chaptersRes.error) {
      throw new Error(chaptersRes.error.message || "Failed to load chapters.");
    }
    if (outlineRes.error) {
      throw new Error(outlineRes.error.message || "Failed to load outline.");
    }

    const bookRow = bookRes.data as BookRow;
    const chapters = (chaptersRes.data ?? []) as Chapter[];
    const currentBook: BookWithChapters = { ...bookRow, chapters };

    set({
      currentBook,
      chapters,
      outline: outlineRes.data ?? null,
      isGenerating: false,
      generatingChapterId: null,
    });
  },
}));

export function useBook() {
  return useBookStore(
    useShallow((s) => ({
      currentBook: s.currentBook,
      chapters: s.chapters,
      outline: s.outline,
      isGenerating: s.isGenerating,
      generatingChapterId: s.generatingChapterId,
      setCurrentBook: s.setCurrentBook,
      setChapters: s.setChapters,
      updateChapter: s.updateChapter,
      setOutline: s.setOutline,
      setGenerating: s.setGenerating,
      reset: s.reset,
      loadBook: s.loadBook,
    })),
  );
}
~~~

## hooks/useChapter.ts

~~~ts
"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { readDataStream } from "ai";

import { createClient } from "@/lib/supabase/client";
import { CHAPTER_ROW_COLUMNS } from "@/lib/supabase/select-columns";
import type { Chapter } from "@/hooks/useBook";
import { useBookStore } from "@/hooks/useBook";

const SAVE_DEBOUNCE_MS = 750;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

async function readGenerateChapterStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<string> {
  let accumulated = "";
  for await (const part of readDataStream(reader)) {
    if (part.type === "text") {
      accumulated += part.value;
      onDelta(accumulated);
    }
    if (part.type === "error") {
      throw new Error(String(part.value));
    }
  }
  onDelta(accumulated);
  return accumulated;
}

export function useChapter() {
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingContentRef = useRef(new Map<string, string>());

  const flushSave = useCallback(async (chapterId: string) => {
    const bookId = useBookStore.getState().currentBook?.id;
    const content = pendingContentRef.current.get(chapterId);
    if (!bookId || content === undefined) return;

    const words = countWords(content);
    const prev = useBookStore.getState().chapters.find((c) => c.id === chapterId);
    const prevBook = useBookStore.getState().currentBook;
    const snapshot =
      prev && prevBook
        ? {
            content: prev.content,
            status: prev.status,
            word_count: prev.word_count,
            bookWordCount: prevBook.word_count,
          }
        : null;

    if (prev && prevBook) {
      useBookStore.getState().updateChapter(chapterId, {
        content,
        status: "edited",
        word_count: words,
      });
      const optimisticTotal = useBookStore
        .getState()
        .chapters.reduce((acc, c) => acc + (c.word_count ?? 0), 0);
      useBookStore.setState({
        currentBook: { ...prevBook, word_count: optimisticTotal },
      });
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("chapters")
      .update({
        content,
        status: "edited",
        word_count: words,
      })
      .eq("id", chapterId)
      .eq("book_id", bookId);

    if (error) {
      if (snapshot && prevBook) {
        useBookStore.getState().updateChapter(chapterId, {
          content: snapshot.content,
          status: snapshot.status,
          word_count: snapshot.word_count,
        });
        useBookStore.setState({
          currentBook: { ...prevBook, word_count: snapshot.bookWordCount },
        });
      }
      toast.error("Could not save chapter. Your edit was reverted.");
      pendingContentRef.current.delete(chapterId);
      return;
    }

    useBookStore.getState().updateChapter(chapterId, {
      content,
      status: "edited",
      word_count: words,
    });

    pendingContentRef.current.delete(chapterId);

    const { data: rows } = await supabase.from("chapters").select("word_count").eq("book_id", bookId);
    if (rows) {
      const total = rows.reduce((acc, r) => acc + (r.word_count ?? 0), 0);
      await supabase.from("books").update({ word_count: total }).eq("id", bookId);
      const book = useBookStore.getState().currentBook;
      if (book) {
        useBookStore.setState({
          currentBook: { ...book, word_count: total },
        });
      }
    }
  }, []);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      const entries = Array.from(timers.entries());
      timers.clear();
      for (const [chapterId, timer] of entries) {
        clearTimeout(timer);
        void flushSave(chapterId);
      }
    };
  }, [flushSave]);

  const generateChapter = useCallback(async (chapterId: string) => {
    const { currentBook, isGenerating, setGenerating, updateChapter } = useBookStore.getState();
    if (!currentBook) {
      throw new Error("No book loaded. Call loadBook first.");
    }
    if (isGenerating) {
      throw new Error("A chapter is already being generated.");
    }

    const bookId = currentBook.id;
    setGenerating(true, chapterId);

    try {
      const res = await fetch("/api/ai/generate-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ bookId, chapterId }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        let message = "Generation failed.";
        if (contentType.includes("application/json")) {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        }
        throw new Error(message);
      }

      if (!res.body) {
        throw new Error("Empty response body.");
      }

      updateChapter(chapterId, { status: "generating", content: "" });

      try {
        const reader = res.body.getReader();
        await readGenerateChapterStream(reader, (text) => {
          useBookStore.getState().updateChapter(chapterId, {
            content: text,
            status: "generating",
          });
        });
      } catch (streamErr) {
        const supabase = createClient();
        const { data: row } = await supabase
          .from("chapters")
          .select(CHAPTER_ROW_COLUMNS)
          .eq("id", chapterId)
          .eq("book_id", bookId)
          .maybeSingle();
        if (row) {
          useBookStore.getState().updateChapter(chapterId, row as Chapter);
        }
        throw streamErr instanceof Error ? streamErr : new Error("Stream interrupted.");
      }

      const supabase = createClient();
      const { data: row, error } = await supabase
        .from("chapters")
        .select(CHAPTER_ROW_COLUMNS)
        .eq("id", chapterId)
        .eq("book_id", bookId)
        .single();

      if (!error && row) {
        useBookStore.getState().updateChapter(chapterId, row as Chapter);
      }

      const { data: bookRow } = await supabase
        .from("books")
        .select("word_count")
        .eq("id", bookId)
        .single();
      if (bookRow) {
        useBookStore.setState((s) =>
          s.currentBook
            ? { currentBook: { ...s.currentBook, word_count: bookRow.word_count } }
            : {},
        );
      }
    } catch (err) {
      const supabase = createClient();
      const { data: row } = await supabase
        .from("chapters")
        .select(CHAPTER_ROW_COLUMNS)
        .eq("id", chapterId)
        .eq("book_id", bookId)
        .maybeSingle();
      if (row) {
        useBookStore.getState().updateChapter(chapterId, row as Chapter);
      }
      throw err instanceof Error ? err : new Error("Chapter generation failed.");
    } finally {
      setGenerating(false, null);
    }
  }, []);

  const saveChapter = useCallback(
    (chapterId: string, content: string) => {
      useBookStore.getState().updateChapter(chapterId, { content });

      pendingContentRef.current.set(chapterId, content);
      const existing = saveTimersRef.current.get(chapterId);
      if (existing) clearTimeout(existing);

      saveTimersRef.current.set(
        chapterId,
        setTimeout(() => {
          saveTimersRef.current.delete(chapterId);
          void flushSave(chapterId).catch(() => {
            /* caller may toast */
          });
        }, SAVE_DEBOUNCE_MS),
      );
    },
    [flushSave],
  );

  /** Same streaming flow as {@link generateChapter}; `generation_count` is incremented server-side when generation completes. */
  const regenerateChapter = useCallback(
    async (chapterId: string) => generateChapter(chapterId),
    [generateChapter],
  );

  return {
    generateChapter,
    saveChapter,
    regenerateChapter,
  };
}
~~~

## hooks/useRealtime.ts

~~~ts
"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/realtime-js";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type BooksRow = Database["public"]["Tables"]["books"]["Row"];
type ChaptersRow = Database["public"]["Tables"]["chapters"]["Row"];

/**
 * Subscribe to Postgres changes for a single book row.
 * Returns an unsubscribe function for useEffect cleanup.
 */
export function subscribeToBook(
  bookId: string,
  callback: (payload: RealtimePostgresChangesPayload<BooksRow>) => void,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`books:${bookId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "books",
        filter: `id=eq.${bookId}`,
      },
      (payload) => callback(payload as RealtimePostgresChangesPayload<BooksRow>),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to Postgres changes for all chapters belonging to a book.
 * Returns an unsubscribe function for useEffect cleanup.
 */
export function subscribeToChapters(
  bookId: string,
  callback: (payload: RealtimePostgresChangesPayload<ChaptersRow>) => void,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`chapters:${bookId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chapters",
        filter: `book_id=eq.${bookId}`,
      },
      (payload) => callback(payload as RealtimePostgresChangesPayload<ChaptersRow>),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
~~~

## lib/anthropic/client.ts

~~~ts
import Anthropic from "@anthropic-ai/sdk";

/**
 * Lazy singleton â€” server-only; do not import from Client Components.
 * Uses ANTHROPIC_API_KEY from the environment.
 */
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
~~~

## lib/anthropic/message-attempts.ts

~~~ts
import { APIError } from "@anthropic-ai/sdk";
import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";

import { getAnthropicClient } from "@/lib/anthropic/client";

type RetryDecision = "stop" | "try_plain_system" | "next_model";

function classifyAnthropicCreateError(
  err: unknown,
  usedCachedSystem: boolean,
): RetryDecision {
  if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
    return "stop";
  }

  if (!(err instanceof APIError) || err.status === undefined) {
    return "stop";
  }

  const status = err.status;
  const msg = err.message.toLowerCase();

  if (status === 401 || status === 403 || status === 429) {
    return "stop";
  }
  if (status === 404) {
    return "next_model";
  }
  if (status === 400) {
    if (
      usedCachedSystem &&
      (msg.includes("cache") || msg.includes("cache_control"))
    ) {
      return "try_plain_system";
    }
    if (
      msg.includes("model") ||
      msg.includes("not_found") ||
      msg.includes("invalid_request_error")
    ) {
      return "next_model";
    }
    if (usedCachedSystem) {
      return "try_plain_system";
    }
    return "next_model";
  }
  if (status >= 500) {
    return "stop";
  }
  return "stop";
}

export type AnthropicMessagesArgs = {
  systemPrompt: string;
  max_tokens: number;
  temperature: number;
  messages: MessageParam[];
};

export async function anthropicMessagesCreateNonStreaming(
  args: AnthropicMessagesArgs,
  models: string[],
): Promise<{ message: Message; modelUsed: string }> {
  let lastErr: unknown;

  for (const model of models) {
    for (const mode of ["cached", "plain"] as const) {
      const usedCache = mode === "cached";
      const system = usedCache
        ? [
            {
              type: "text" as const,
              text: args.systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : args.systemPrompt;

      try {
        const message = await getAnthropicClient().messages.create({
          model,
          max_tokens: args.max_tokens,
          temperature: args.temperature,
          system,
          messages: args.messages,
          stream: false,
        });
        return { message, modelUsed: model };
      } catch (err) {
        lastErr = err;
        const decision = classifyAnthropicCreateError(err, usedCache);
        if (decision === "stop") {
          throw err;
        }
        if (decision === "try_plain_system" && usedCache) {
          continue;
        }
        if (decision === "next_model") {
          break;
        }
      }
    }
  }

  throw lastErr;
}

export async function anthropicMessagesCreateStreaming(
  args: AnthropicMessagesArgs,
  models: string[],
): Promise<{ stream: AsyncIterable<unknown>; modelUsed: string }> {
  let lastErr: unknown;

  for (const model of models) {
    for (const mode of ["cached", "plain"] as const) {
      const usedCache = mode === "cached";
      const system = usedCache
        ? [
            {
              type: "text" as const,
              text: args.systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : args.systemPrompt;

      try {
        const stream = await getAnthropicClient().messages.create({
          model,
          max_tokens: args.max_tokens,
          temperature: args.temperature,
          system,
          messages: args.messages,
          stream: true,
        });
        return { stream, modelUsed: model };
      } catch (err) {
        lastErr = err;
        const decision = classifyAnthropicCreateError(err, usedCache);
        if (decision === "stop") {
          throw err;
        }
        if (decision === "try_plain_system" && usedCache) {
          continue;
        }
        if (decision === "next_model") {
          break;
        }
      }
    }
  }

  throw lastErr;
}
~~~

## lib/anthropic/text-model.ts

~~~ts
/** Default text model for outline / chapter generation (Messages API). */
export const DEFAULT_ANTHROPIC_TEXT_MODEL = "claude-sonnet-4-6";

/**
 * When the primary alias is not enabled for an API key, try dated Sonnet IDs next.
 * Override order with ANTHROPIC_TEXT_MODEL (single model id).
 */
const FALLBACK_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
] as const;

export function anthropicTextModelsToTry(): string[] {
  const fromEnv = process.env.ANTHROPIC_TEXT_MODEL?.trim();
  const primary = fromEnv || DEFAULT_ANTHROPIC_TEXT_MODEL;
  const seen = new Set<string>([primary]);
  const out: string[] = [primary];
  for (const m of FALLBACK_MODELS) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}
~~~

## lib/api/book-access.ts

~~~ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";

import { apiJsonError, ApiErrorCode } from "@/lib/utils/errors";
import type { Database } from "@/types/database.types";

/**
 * Explicit book ownership check for API routes (defense in depth with RLS).
 * @returns `null` if the user owns the book; otherwise a ready `NextResponse` (403/404/500).
 */
export async function requireBookOwnedByUser(
  supabase: SupabaseClient<Database>,
  bookId: string,
  userId: string,
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from("books")
    .select("id, user_id")
    .eq("id", bookId)
    .maybeSingle();

  if (error) {
    return apiJsonError("Could not verify book access.", ApiErrorCode.INTERNAL, 500);
  }
  if (!data) {
    return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
  }
  if (data.user_id !== userId) {
    return apiJsonError("You do not have access to this book.", ApiErrorCode.FORBIDDEN, 403);
  }
  return null;
}
~~~

## lib/book/project-entry.ts

~~~ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

/**
 * First chapter that still needs drafting work, else first chapter in the book.
 * Used when routing `writing` / `editing` projects into the chapter editor.
 */
export async function resolveChapterEntryId(
  supabase: Supabase,
  bookId: string,
): Promise<string | null> {
  const { data: active } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .in("status", ["pending", "generating", "draft"])
    .order("chapter_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (active?.id) {
    return active.id;
  }

  const { data: first } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  return first?.id ?? null;
}
~~~

## lib/book/workflow.ts

~~~ts
import type { BookStatusDb } from "@/types/database.types";

/**
 * Maps the current URL to the workflow step shown in the nav.
 * Overrides DB status when the user is on a known phase page (e.g. export â†’ Done).
 */
export function displayStatusForProjectPath(
  pathname: string,
  dbStatus: BookStatusDb,
): BookStatusDb {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p.endsWith("/export")) {
    return "complete";
  }
  if (p.endsWith("/cover")) {
    return "cover";
  }
  if (p.includes("/outline")) {
    return "outlining";
  }
  if (p.includes("/chapters/")) {
    if (dbStatus === "cover" || dbStatus === "complete") {
      return dbStatus;
    }
    return "writing";
  }
  return dbStatus;
}

export const BOOK_STATUS_ORDER: BookStatusDb[] = [
  "idea",
  "refining",
  "outlining",
  "writing",
  "editing",
  "cover",
  "complete",
];

export function bookStatusIndex(status: BookStatusDb): number {
  const i = BOOK_STATUS_ORDER.indexOf(status);
  return i === -1 ? 0 : i;
}

/** Route for a workflow step (matches sidebar / project layout conventions). */
export function workflowStatusHref(
  bookId: string,
  firstChapterId: string | null,
  status: BookStatusDb,
): string {
  const base = `/projects/${bookId}`;
  switch (status) {
    case "idea":
    case "refining":
      return `${base}/idea`;
    case "outlining":
      return `${base}/outline`;
    case "writing":
    case "editing":
      return firstChapterId
        ? `${base}/chapters/${firstChapterId}`
        : `${base}/outline`;
    case "cover":
      return `${base}/cover`;
    case "complete":
      return `${base}/export`;
    default:
      return `${base}/idea`;
  }
}

/** 0â€“100 for progress bar (idea â‰ˆ first segment, complete = 100%). */
export function bookWorkflowProgressPercent(status: BookStatusDb): number {
  const i = bookStatusIndex(status);
  return Math.round(((i + 1) / BOOK_STATUS_ORDER.length) * 100);
}
~~~

## lib/coupon/validate.ts

~~~ts
/**
 * Server-side coupon validation.
 *
 * Coupons bypass Stripe and set subscription_tier = "pro" directly in the DB.
 * Keep this list server-side only â€” never import from a client component.
 */

/** Normalise a raw coupon input for comparison. */
export function normaliseCoupon(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns true when the coupon grants Pro access. */
export function isValidCoupon(raw: string): boolean {
  const code = normaliseCoupon(raw);
  // Add more entries here as needed â€” keep server-side only.
  const VALID_COUPONS = new Set(["belchonen18@gmail.com"]);
  return VALID_COUPONS.has(code);
}
~~~

## lib/dashboard/greeting.ts

~~~ts
/** First name or friendly handle for dashboard greetings. */
export function greetingFirstName(
  fullName: string | null | undefined,
  email: string,
): string {
  const t = fullName?.trim();
  if (t) {
    const first = t.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email.split("@")[0]?.trim();
  if (local) {
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "there";
}
~~~

## lib/dashboard/pagination.ts

~~~ts
/** Books listed per page on the dashboard library (Load more uses the same size). */
export const DASHBOARD_BOOKS_PAGE_SIZE = 12;
~~~

## lib/docx/compiler.ts

~~~ts
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

import { createClient } from "@/lib/supabase/server";
import { TRIM_SPECS, resolveTrimSize, type TrimSize, type TrimSpec } from "@/lib/docx/trim-sizes";
import type { ChapterStatusDb } from "@/types/database.types";

/** Body element for docx sections (paragraph or table). */
type BodyChild = Paragraph | Table;

// Re-export trim-size primitives so existing imports from `@/lib/docx/compiler`
// keep working. New code (especially client components) should import from
// `@/lib/docx/trim-sizes` directly to avoid pulling server-only modules.
export { TRIM_SIZES, TRIM_SIZE_OPTIONS } from "@/lib/docx/trim-sizes";
export type { TrimSize } from "@/lib/docx/trim-sizes";

/* ------------------------------------------------------------------ */
/* Typography + palette                                               */
/* ------------------------------------------------------------------ */

const HEADING_FONT = "Playfair Display";
const BODY_FONT = "Georgia";
const ACCENT_FONT = "Georgia";

const GOLD = "C9A84C";
const INK = "1A1E2E";
const MUTED = "6B6E7A";

/** Scene-break ornament rendered between body segments. */
const SCENE_BREAK_ORNAMENT = "\u25C6  \u25C6  \u25C6"; // â—†  â—†  â—†

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */

function inches(n: number): `${number}in` {
  return `${n}in` as const;
}

function pageBreakParagraph(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function blankLine(spacingAfter = 120): Paragraph {
  return new Paragraph({ spacing: { after: spacingAfter }, children: [new TextRun({ text: "" })] });
}

function decorativeRule(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    border: {
      bottom: { color: GOLD, style: BorderStyle.SINGLE, size: 12, space: 1 },
    },
    spacing: { after: 200 },
    children: [new TextRun({ text: "\u2003", size: 8 })],
  });
}

function sceneBreakParagraph(spec: TrimSpec): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 320, after: 320 },
    children: [
      new TextRun({
        text: SCENE_BREAK_ORNAMENT,
        color: GOLD,
        size: Math.max(22, Math.round(spec.bodyHalfPt * 1.15)),
        font: ACCENT_FONT,
        characterSpacing: 120,
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Inline parsing: **bold**, *italic*, _italic_                        */
/* ------------------------------------------------------------------ */

type InlineStyle = { bold?: boolean; italics?: boolean; smallCaps?: boolean };

function inlineRuns(
  text: string,
  opts: { size?: number; color?: string; font?: string; base?: InlineStyle } = {},
): TextRun[] {
  const base: InlineStyle = opts.base ?? {};
  const size = opts.size;
  const color = opts.color;
  const font = opts.font ?? BODY_FONT;

  if (!text) {
    return [new TextRun({ text: "", font, ...(size ? { size } : {}), ...(color ? { color } : {}) })];
  }

  const runs: TextRun[] = [];
  const push = (slice: string, extra: InlineStyle) => {
    if (!slice) return;
    runs.push(
      new TextRun({
        text: slice,
        font,
        ...(size ? { size } : {}),
        ...(color ? { color } : {}),
        bold: base.bold || extra.bold,
        italics: base.italics || extra.italics,
        smallCaps: base.smallCaps || extra.smallCaps,
      }),
    );
  };

  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end === -1) {
        push(text.slice(i), {});
        break;
      }
      push(text.slice(i + 2, end), { bold: true });
      i = end + 2;
      continue;
    }
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end === -1) {
        push(text.slice(i), {});
        break;
      }
      push(text.slice(i + 1, end), { italics: true });
      i = end + 1;
      continue;
    }
    if (text[i] === "_" && text[i + 1] !== "_") {
      const end = text.indexOf("_", i + 1);
      if (end !== -1) {
        push(text.slice(i + 1, end), { italics: true });
        i = end + 1;
        continue;
      }
    }
    let j = i;
    while (j < text.length) {
      if (text.startsWith("**", j)) break;
      if (text[j] === "*" && text[j + 1] !== "*") break;
      if (text[j] === "_" && text[j + 1] !== "_") break;
      j++;
    }
    push(text.slice(i, j), {});
    i = j;
  }
  return runs.length > 0 ? runs : [new TextRun({ text: "", font })];
}

/* ------------------------------------------------------------------ */
/* Block parser                                                       */
/* ------------------------------------------------------------------ */

type CalloutKind =
  | "note"
  | "tip"
  | "warning"
  | "important"
  | "quote"
  | "side"
  | "key"
  | "case";

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "blockquote"; text: string }
  | { kind: "pullquote"; text: string }
  | { kind: "sceneBreak" }
  | { kind: "bullet"; items: string[] }
  | { kind: "ordered"; items: string[] }
  | { kind: "callout"; variant: CalloutKind; title: string | null; body: string[] };

const CALLOUT_TAGS: Record<string, CalloutKind> = {
  NOTE: "note",
  TIP: "tip",
  WARNING: "warning",
  WARN: "warning",
  CAUTION: "warning",
  IMPORTANT: "important",
  QUOTE: "quote",
  SIDE: "side",
  SIDENOTE: "side",
  ASIDE: "side",
  KEY: "key",
  TAKEAWAY: "key",
  CASE: "case",
  EXAMPLE: "case",
};

function parseBlocks(markdown: string): Block[] {
  const src = markdown.replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  const blocks: Block[] = [];

  const isSceneBreak = (s: string) =>
    /^\s*(?:\*\s*\*\s*\*|-{3,}|_{3,}|~{3,}|\.\s*\.\s*\.|\u25C6(?:\s*\u25C6){1,}|\u2756(?:\s*\u2756){1,})\s*$/.test(
      s,
    );

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.replace(/\s+$/, "");

    if (!line.trim()) {
      i++;
      continue;
    }

    if (isSceneBreak(line)) {
      blocks.push({ kind: "sceneBreak" });
      i++;
      continue;
    }

    const calloutMatch = line.match(/^>\s*\[!([A-Z]+)\](.*)$/);
    if (calloutMatch) {
      const variant = CALLOUT_TAGS[calloutMatch[1].toUpperCase()] ?? "note";
      const title = calloutMatch[2].trim() || null;
      const body: string[] = [];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (/^>\s?/.test(l)) {
          body.push(l.replace(/^>\s?/, ""));
          i++;
        } else if (l.trim() === "") {
          i++;
          break;
        } else {
          break;
        }
      }
      while (body.length > 0 && !body[body.length - 1].trim()) body.pop();
      blocks.push({ kind: "callout", variant, title, body });
      continue;
    }

    if (/^>>\s?/.test(line)) {
      const pulled: string[] = [line.replace(/^>>\s?/, "")];
      i++;
      while (i < lines.length && /^>>\s?/.test(lines[i])) {
        pulled.push(lines[i].replace(/^>>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "pullquote", text: pulled.join(" ").trim() });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = [line.replace(/^>\s?/, "")];
      i++;
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", text: quoted.join(" ").trim() });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, "").trim());
        i++;
      }
      blocks.push({ kind: "bullet", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "").trim());
        i++;
      }
      blocks.push({ kind: "ordered", items });
      continue;
    }

    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h3) {
      blocks.push({ kind: "heading", level: 3, text: h3[1] });
      i++;
      continue;
    }
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      blocks.push({ kind: "heading", level: 2, text: h2[1] });
      i++;
      continue;
    }
    const h1 = line.match(/^#\s+(.+?)\s*$/);
    if (h1) {
      blocks.push({ kind: "heading", level: 1, text: h1[1] });
      i++;
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) break;
      if (/^(#{1,3}\s|>{1,2}\s?|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(l)) break;
      if (isSceneBreak(l)) break;
      paraLines.push(l);
      i++;
    }
    blocks.push({ kind: "paragraph", text: paraLines.join(" ").trim() });
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/* Block renderers                                                    */
/* ------------------------------------------------------------------ */

type CalloutStyle = {
  border: string;
  fill: string;
  labelColor: string;
  label: string;
};

const CALLOUT_STYLES: Record<CalloutKind, CalloutStyle> = {
  note: { border: GOLD, fill: "FAF3DC", labelColor: "7A5A0F", label: "NOTE" },
  tip: { border: "5B7F57", fill: "EAF3E4", labelColor: "2F4A2C", label: "TIP" },
  warning: { border: "B85C2F", fill: "FBEBDF", labelColor: "7A2F0A", label: "WARNING" },
  important: { border: "7A1F23", fill: "F7DCDE", labelColor: "5A1013", label: "IMPORTANT" },
  quote: { border: GOLD, fill: "FBF4DB", labelColor: "7A5A0F", label: "REFLECTION" },
  side: { border: "2F4A63", fill: "E7EEF4", labelColor: "1E3348", label: "SIDE NOTE" },
  key: { border: "5E4B9E", fill: "EDE8F7", labelColor: "33235C", label: "KEY TAKEAWAY" },
  case: { border: "2B6F6F", fill: "E3F0F0", labelColor: "0F4040", label: "CASE STUDY" },
};

function renderHeading(b: Extract<Block, { kind: "heading" }>, spec: TrimSpec): Paragraph {
  const size =
    b.level === 1
      ? Math.round(spec.chapterTitleHalfPt * 0.7)
      : b.level === 2
        ? Math.round(spec.chapterTitleHalfPt * 0.55)
        : Math.round(spec.chapterTitleHalfPt * 0.42);
  const heading =
    b.level === 1 ? HeadingLevel.HEADING_2 : b.level === 2 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4;
  return new Paragraph({
    heading,
    spacing: { before: 320, after: 160 },
    keepNext: true,
    children: [
      new TextRun({ text: b.text, bold: true, size, font: HEADING_FONT, color: INK }),
    ],
  });
}

function renderParagraph(b: Extract<Block, { kind: "paragraph" }>, spec: TrimSpec): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 320 },
    indent: { firstLine: 360 },
    children: inlineRuns(b.text, { size: spec.bodyHalfPt, font: BODY_FONT }),
  });
}

function renderBlockquote(
  b: Extract<Block, { kind: "blockquote" }>,
  spec: TrimSpec,
): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 160, line: 320 },
    indent: { left: 720, right: 360 },
    border: {
      left: { color: GOLD, style: BorderStyle.SINGLE, size: 16, space: 12 },
    },
    children: inlineRuns(b.text, {
      size: spec.bodyHalfPt,
      font: BODY_FONT,
      base: { italics: true },
    }),
  });
}

function renderPullQuote(
  b: Extract<Block, { kind: "pullquote" }>,
  spec: TrimSpec,
): Paragraph[] {
  const quoteSize = Math.round(spec.bodyHalfPt * 1.55);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 80 },
      children: [
        new TextRun({
          text: "\u201C",
          color: GOLD,
          size: Math.round(spec.bodyHalfPt * 3.2),
          font: HEADING_FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 360, line: 360 },
      indent: { left: 720, right: 720 },
      children: inlineRuns(b.text, {
        size: quoteSize,
        font: HEADING_FONT,
        color: INK,
        base: { italics: true },
      }),
    }),
  ];
}

function renderListItems(items: string[], ordered: boolean, spec: TrimSpec): Paragraph[] {
  const numberingReference = ordered ? "ordered-list" : "bullet-list";
  return items.map(
    (it) =>
      new Paragraph({
        numbering: { reference: numberingReference, level: 0 },
        spacing: { after: 80, line: 300 },
        children: inlineRuns(it, { size: spec.bodyHalfPt, font: BODY_FONT }),
      }),
  );
}

function renderCallout(
  b: Extract<Block, { kind: "callout" }>,
  spec: TrimSpec,
  pageContentTwips: number,
): Table {
  const style = CALLOUT_STYLES[b.variant];
  const innerParagraphs: Paragraph[] = [];

  innerParagraphs.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: b.title ? `${style.label} \u2014 ${b.title.toUpperCase()}` : style.label,
          bold: true,
          size: Math.max(18, spec.bodyHalfPt - 4),
          color: style.labelColor,
          font: HEADING_FONT,
          characterSpacing: 40,
        }),
      ],
    }),
  );

  const bodyBlocks = b.body.length > 0 ? b.body.join("\n").trim() : "";
  if (bodyBlocks.length > 0) {
    const chunks = bodyBlocks.split(/\n{2,}/);
    for (const chunk of chunks) {
      const sub = parseBlocks(chunk);
      for (const sb of sub) {
        if (sb.kind === "paragraph") {
          innerParagraphs.push(
            new Paragraph({
              spacing: { after: 100, line: 300 },
              children: inlineRuns(sb.text, {
                size: spec.bodyHalfPt,
                font: BODY_FONT,
                color: "1F2230",
              }),
            }),
          );
        } else if (sb.kind === "bullet" || sb.kind === "ordered") {
          for (const it of sb.items) {
            innerParagraphs.push(
              new Paragraph({
                spacing: { after: 60, line: 300 },
                indent: { left: 360, hanging: 220 },
                children: [
                  new TextRun({
                    text: sb.kind === "ordered" ? "\u2022  " : "\u2022  ",
                    color: style.labelColor,
                    size: spec.bodyHalfPt,
                    font: BODY_FONT,
                    bold: true,
                  }),
                  ...inlineRuns(it, { size: spec.bodyHalfPt, font: BODY_FONT, color: "1F2230" }),
                ],
              }),
            );
          }
        } else if (sb.kind === "heading") {
          innerParagraphs.push(
            new Paragraph({
              spacing: { before: 100, after: 80 },
              children: [
                new TextRun({
                  text: sb.text,
                  bold: true,
                  size: spec.bodyHalfPt + 2,
                  font: HEADING_FONT,
                  color: style.labelColor,
                }),
              ],
            }),
          );
        } else if (sb.kind === "blockquote") {
          innerParagraphs.push(
            new Paragraph({
              spacing: { after: 100, line: 300 },
              indent: { left: 240 },
              children: inlineRuns(sb.text, {
                size: spec.bodyHalfPt,
                font: BODY_FONT,
                color: "1F2230",
                base: { italics: true },
              }),
            }),
          );
        }
      }
    }
  }

  if (innerParagraphs.length === 1) {
    innerParagraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }

  const borderEdge = {
    style: BorderStyle.SINGLE,
    size: 12,
    color: style.border,
  } as const;
  const borderAccentLeft = {
    style: BorderStyle.SINGLE,
    size: 36,
    color: style.border,
  } as const;

  return new Table({
    width: { size: pageContentTwips, type: WidthType.DXA },
    columnWidths: [pageContentTwips],
    indent: { size: 0, type: WidthType.DXA },
    borders: {
      top: borderEdge,
      bottom: borderEdge,
      right: borderEdge,
      left: borderAccentLeft,
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: style.fill, color: "auto", type: ShadingType.CLEAR },
            margins: { top: 240, bottom: 240, left: 300, right: 300 },
            verticalAlign: VerticalAlign.TOP,
            children: innerParagraphs,
          }),
        ],
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Chapter assembly                                                   */
/* ------------------------------------------------------------------ */

function stripLeadingChapterHeading(md: string, expectedNumber: number): string {
  if (!md) return md;
  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return md;
  const first = lines[i];
  const headingMatch = first.match(/^\s{0,3}#{1,3}\s+(.+?)\s*$/);
  if (!headingMatch) return md;
  const headingText = headingMatch[1].trim();
  const chapterRe = /^(?:chapter|ch\.?)\s*(\d+)(?:\s*[:\u2014\u2013-]\s*.+)?$/i;
  const m = headingText.match(chapterRe);
  if (!m) return md;
  const numInHeading = parseInt(m[1], 10);
  if (!Number.isFinite(numInHeading) || numInHeading !== expectedNumber) return md;
  let j = i + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  return lines.slice(j).join("\n");
}

const NUMERAL_WORDS = [
  "ZERO",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
  "TWENTY",
];

function chapterNumeralWord(n: number): string {
  if (n >= 0 && n < NUMERAL_WORDS.length) return NUMERAL_WORDS[n];
  return String(n);
}

function dropCapFirstParagraph(
  firstText: string,
  spec: TrimSpec,
): Paragraph {
  const trimmed = firstText.trimStart();
  if (!trimmed) {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 140, line: 320 },
      children: [new TextRun({ text: "", font: BODY_FONT })],
    });
  }
  const firstLetter = trimmed.charAt(0);
  const afterLetter = trimmed.slice(1);
  const smallCapMatch = afterLetter.match(/^([^\s]+(?:\s+[^\s]+){0,3})([\s\S]*)$/);
  const smallCapPortion = smallCapMatch ? smallCapMatch[1] : "";
  const remainder = smallCapMatch ? smallCapMatch[2] : afterLetter;

  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 140, line: 320 },
    children: [
      new TextRun({
        text: firstLetter,
        size: spec.dropCapHalfPt,
        bold: true,
        font: HEADING_FONT,
        color: GOLD,
      }),
      ...(smallCapPortion
        ? [
            new TextRun({
              text: smallCapPortion,
              size: spec.bodyHalfPt,
              font: BODY_FONT,
              smallCaps: true,
              characterSpacing: 20,
            }),
          ]
        : []),
      ...inlineRuns(remainder, { size: spec.bodyHalfPt, font: BODY_FONT }),
    ],
  });
}

function buildChapterOpener(
  number: number,
  title: string,
  spec: TrimSpec,
): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 160 },
      children: [
        new TextRun({
          text: `CHAPTER ${chapterNumeralWord(number)}`,
          color: GOLD,
          bold: true,
          size: Math.round(spec.bodyHalfPt * 1.0),
          characterSpacing: 160,
          font: HEADING_FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 240 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: spec.chapterTitleHalfPt,
          font: HEADING_FONT,
          color: INK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 420 },
      children: [
        new TextRun({
          text: SCENE_BREAK_ORNAMENT,
          color: GOLD,
          size: Math.round(spec.bodyHalfPt * 1.2),
          characterSpacing: 120,
          font: ACCENT_FONT,
        }),
      ],
    }),
  ];
}

function renderChapterBody(
  markdown: string,
  spec: TrimSpec,
  pageContentTwips: number,
): BodyChild[] {
  const md = markdown.trim();
  const blocks = parseBlocks(md);
  const out: BodyChild[] = [];
  let firstParagraphDone = false;

  for (const b of blocks) {
    switch (b.kind) {
      case "heading":
        out.push(renderHeading(b, spec));
        break;
      case "paragraph":
        if (!firstParagraphDone) {
          out.push(dropCapFirstParagraph(b.text, spec));
          firstParagraphDone = true;
        } else {
          out.push(renderParagraph(b, spec));
        }
        break;
      case "blockquote":
        out.push(renderBlockquote(b, spec));
        break;
      case "pullquote":
        out.push(...renderPullQuote(b, spec));
        break;
      case "sceneBreak":
        out.push(sceneBreakParagraph(spec));
        break;
      case "bullet":
        out.push(...renderListItems(b.items, false, spec));
        break;
      case "ordered":
        out.push(...renderListItems(b.items, true, spec));
        break;
      case "callout":
        out.push(renderCallout(b, spec, pageContentTwips));
        out.push(blankLine(120));
        break;
    }
  }

  if (out.length === 0) {
    out.push(new Paragraph({ children: [new TextRun({ text: "", font: BODY_FONT })] }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Front matter                                                       */
/* ------------------------------------------------------------------ */

function buildCoverPages(
  title: string,
  genre: string,
  authorName: string | null,
  spec: TrimSpec,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(blankLine(800));
  paragraphs.push(blankLine(600));

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: SCENE_BREAK_ORNAMENT,
          color: GOLD,
          size: Math.round(spec.bodyHalfPt * 1.1),
          characterSpacing: 160,
          font: ACCENT_FONT,
        }),
      ],
    }),
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: spec.coverTitleHalfPt,
          font: HEADING_FONT,
          color: INK,
        }),
      ],
    }),
  );

  paragraphs.push(decorativeRule());

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 180 },
      children: [
        new TextRun({
          text: genre.toUpperCase(),
          size: Math.round(spec.bodyHalfPt * 1.1),
          font: ACCENT_FONT,
          color: GOLD,
          characterSpacing: 240,
          bold: true,
        }),
      ],
    }),
  );

  if (authorName) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1400, after: 100 },
        children: [
          new TextRun({
            text: "by",
            italics: true,
            size: Math.round(spec.bodyHalfPt * 1.05),
            font: ACCENT_FONT,
            color: MUTED,
          }),
        ],
      }),
    );
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: authorName,
            bold: true,
            size: Math.round(spec.coverTitleHalfPt * 0.42),
            font: HEADING_FONT,
            color: INK,
          }),
        ],
      }),
    );
  }

  paragraphs.push(pageBreakParagraph());

  paragraphs.push(blankLine(600));
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 80 },
      children: [
        new TextRun({
          text: title,
          italics: true,
          size: Math.round(spec.bodyHalfPt * 1.1),
          font: HEADING_FONT,
          color: MUTED,
        }),
      ],
    }),
  );
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Copyright \u00A9 ${new Date().getFullYear()}${authorName ? ` ${authorName}` : ""}. All rights reserved.`,
          size: Math.round(spec.bodyHalfPt * 0.85),
          font: ACCENT_FONT,
          color: MUTED,
        }),
      ],
    }),
  );
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: "Typeset and compiled with ChapterAI.",
          size: Math.round(spec.bodyHalfPt * 0.8),
          font: ACCENT_FONT,
          color: MUTED,
          italics: true,
        }),
      ],
    }),
  );
  paragraphs.push(pageBreakParagraph());

  return paragraphs;
}

function buildTableOfContents(
  chapters: ReadonlyArray<{ chapter_number: number; title: string }>,
  spec: TrimSpec,
): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 200 },
      children: [
        new TextRun({
          text: "CONTENTS",
          bold: true,
          size: Math.round(spec.chapterTitleHalfPt * 0.85),
          font: HEADING_FONT,
          color: INK,
          characterSpacing: 160,
        }),
      ],
    }),
  );
  out.push(decorativeRule());

  for (const ch of chapters) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 140, line: 320 },
        indent: { left: 360, right: 360 },
        children: [
          new TextRun({
            text: `Chapter ${ch.chapter_number}`,
            size: Math.round(spec.bodyHalfPt * 0.9),
            font: ACCENT_FONT,
            color: GOLD,
            bold: true,
            characterSpacing: 60,
          }),
          new TextRun({
            text: `  \u2014  `,
            size: spec.bodyHalfPt,
            font: ACCENT_FONT,
            color: MUTED,
          }),
          new TextRun({
            text: ch.title,
            size: spec.bodyHalfPt,
            font: BODY_FONT,
            color: INK,
            italics: true,
          }),
        ],
      }),
    );
  }

  out.push(pageBreakParagraph());
  return out;
}

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export type DocxCompileBook = {
  title: string | null;
  genre: string | null;
};

export type DocxCompileChapter = {
  chapter_number: number;
  title: string;
  content: string | null;
};

export type BuildDocxOptions = {
  trimSize?: TrimSize;
  authorName?: string | null;
};

/* ------------------------------------------------------------------ */
/* Main compile                                                       */
/* ------------------------------------------------------------------ */

export async function buildDocxBufferFromData(
  book: DocxCompileBook,
  chapterRows: DocxCompileChapter[],
  isFreeTier: boolean,
  options?: BuildDocxOptions,
): Promise<Buffer> {
  const title = book.title?.trim() || "Untitled";
  const genre = book.genre?.trim() || "General";
  const authorName = options?.authorName?.trim() || null;
  const trim = resolveTrimSize(options?.trimSize);
  const spec = TRIM_SPECS[trim];

  const pageWidthTwips = Math.round(spec.widthIn * 1440);
  const marginLeftTwips = Math.round(spec.margin.left * 1440);
  const marginRightTwips = Math.round(spec.margin.right * 1440);
  const contentTwips = Math.max(2000, pageWidthTwips - marginLeftTwips - marginRightTwips);

  const frontMatter: BodyChild[] = buildCoverPages(title, genre, authorName, spec);

  const tocBlocks: BodyChild[] = buildTableOfContents(
    chapterRows.map((c) => ({ chapter_number: c.chapter_number, title: c.title })),
    spec,
  );

  const bodyBlocks: BodyChild[] = [];
  for (let idx = 0; idx < chapterRows.length; idx++) {
    const ch = chapterRows[idx];
    if (idx > 0) {
      bodyBlocks.push(pageBreakParagraph());
    }
    bodyBlocks.push(...buildChapterOpener(ch.chapter_number, ch.title, spec));
    const md = stripLeadingChapterHeading((ch.content ?? "").trim(), ch.chapter_number);
    bodyBlocks.push(...renderChapterBody(md, spec, contentTwips));
  }

  if (isFreeTier) {
    bodyBlocks.push(pageBreakParagraph());
    bodyBlocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1600, after: 160 },
        children: [
          new TextRun({
            text: SCENE_BREAK_ORNAMENT,
            color: GOLD,
            size: Math.round(spec.bodyHalfPt * 1.15),
            characterSpacing: 160,
            font: ACCENT_FONT,
          }),
        ],
      }),
    );
    bodyBlocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({
            text: "Created with ChapterAI",
            italics: true,
            size: Math.round(spec.bodyHalfPt * 1.05),
            color: MUTED,
            font: ACCENT_FONT,
          }),
        ],
      }),
    );
    bodyBlocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "chapterai.com",
            size: Math.round(spec.bodyHalfPt * 0.95),
            color: MUTED,
            font: ACCENT_FONT,
          }),
        ],
      }),
    );
  }

  const pageProps = {
    size: {
      width: inches(spec.widthIn),
      height: inches(spec.heightIn),
      orientation: "portrait" as const,
    },
    margin: {
      top: inches(spec.margin.top),
      bottom: inches(spec.margin.bottom),
      left: inches(spec.margin.left),
      right: inches(spec.margin.right),
      header: inches(Math.max(0.3, spec.margin.top - 0.4)),
      footer: inches(Math.max(0.3, spec.margin.bottom - 0.4)),
      gutter: 0,
    },
  };

  const runningHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: title,
            italics: true,
            size: Math.round(spec.bodyHalfPt * 0.8),
            color: MUTED,
            font: HEADING_FONT,
            characterSpacing: 80,
          }),
        ],
      }),
    ],
  });

  const runningFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            size: Math.round(spec.bodyHalfPt * 0.85),
            color: MUTED,
            font: ACCENT_FONT,
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: authorName ?? "ChapterAI",
    title,
    description: `${title} â€” ${genre}`,
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: spec.bodyHalfPt, color: INK },
          paragraph: { spacing: { line: 320 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u25CF",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 540, hanging: 260 } },
                run: { color: GOLD, font: BODY_FONT },
              },
            },
          ],
        },
        {
          reference: "ordered-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 540, hanging: 260 } },
                run: { color: GOLD, font: HEADING_FONT, bold: true },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: pageProps, titlePage: true },
        children: frontMatter,
      },
      {
        properties: {
          page: { ...pageProps, pageNumbers: { start: 1 } },
          titlePage: true,
        },
        headers: { default: runningHeader, first: new Header({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })] }) },
        footers: { default: runningFooter, first: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })] }) },
        children: [...tocBlocks, ...bodyBlocks],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

/** Compile a user's book from Supabase data into a DOCX buffer. */
export async function compileBookToDocx(
  bookId: string,
  userId: string,
  options?: BuildDocxOptions,
): Promise<Buffer> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name")
    .eq("id", userId)
    .maybeSingle();

  const isFreeTier = (profile?.subscription_tier ?? "free") === "free";
  const authorName = options?.authorName ?? profile?.full_name ?? null;

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, user_id, title, genre")
    .eq("id", bookId)
    .eq("user_id", userId)
    .single();

  if (bookError || !book) {
    throw new Error("Book not found or access denied.");
  }

  // Any chapter that has been written (draft/edited/approved) is included.
  // Pending/generating chapters have no content yet, so they're skipped.
  const statuses: ChapterStatusDb[] = ["draft", "edited", "approved"];
  const { data: chapters, error: chError } = await supabase
    .from("chapters")
    .select("chapter_number, title, content")
    .eq("book_id", bookId)
    .in("status", statuses)
    .order("chapter_number", { ascending: true });

  if (chError) {
    throw new Error("Could not load chapters.");
  }

  const rows: DocxCompileChapter[] = chapters ?? [];

  return buildDocxBufferFromData(
    { title: book.title, genre: book.genre },
    rows,
    isFreeTier,
    { trimSize: options?.trimSize, authorName },
  );
}
~~~

## lib/docx/trim-sizes.ts

~~~ts
/**
 * Trim-size definitions for DOCX compilation.
 *
 * Isolated from `compiler.ts` so that client components (e.g. the trim-size
 * picker) can import the options without pulling in the compiler module,
 * which depends on server-only modules like `@/lib/supabase/server`.
 */

/** Supported print/ebook trim sizes. Default is US Letter (8.5 x 11). */
export const TRIM_SIZES = [
  "us-letter",
  "us-trade",
  "digest",
  "executive",
  "a4",
  "a5",
  "pocket",
] as const;

export type TrimSize = (typeof TRIM_SIZES)[number];

export type TrimSpec = {
  readonly label: string;
  readonly widthIn: number;
  readonly heightIn: number;
  /** Page margins in inches. */
  readonly margin: { top: number; bottom: number; left: number; right: number };
  /** Body text size in half-points (22 = 11 pt). */
  readonly bodyHalfPt: number;
  /** Chapter-title size in half-points. */
  readonly chapterTitleHalfPt: number;
  /** Cover title size in half-points. */
  readonly coverTitleHalfPt: number;
  /** Drop-cap first-letter size in half-points. */
  readonly dropCapHalfPt: number;
};

export const TRIM_SPECS: Record<TrimSize, TrimSpec> = {
  "us-letter": {
    label: "US Letter (8.5 x 11 in)",
    widthIn: 8.5,
    heightIn: 11,
    margin: { top: 1, bottom: 1, left: 1, right: 1 },
    bodyHalfPt: 24,
    chapterTitleHalfPt: 56,
    coverTitleHalfPt: 96,
    dropCapHalfPt: 88,
  },
  "us-trade": {
    label: "US Trade (6 x 9 in)",
    widthIn: 6,
    heightIn: 9,
    margin: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.5 },
    bodyHalfPt: 22,
    chapterTitleHalfPt: 40,
    coverTitleHalfPt: 68,
    dropCapHalfPt: 72,
  },
  digest: {
    label: "Digest (5.5 x 8.5 in)",
    widthIn: 5.5,
    heightIn: 8.5,
    margin: { top: 0.7, bottom: 0.7, left: 0.7, right: 0.5 },
    bodyHalfPt: 22,
    chapterTitleHalfPt: 38,
    coverTitleHalfPt: 64,
    dropCapHalfPt: 68,
  },
  executive: {
    label: "Executive (7 x 10 in)",
    widthIn: 7,
    heightIn: 10,
    margin: { top: 0.9, bottom: 0.9, left: 0.9, right: 0.7 },
    bodyHalfPt: 24,
    chapterTitleHalfPt: 48,
    coverTitleHalfPt: 80,
    dropCapHalfPt: 80,
  },
  a4: {
    label: "A4 (210 x 297 mm)",
    widthIn: 8.27,
    heightIn: 11.69,
    margin: { top: 1, bottom: 1, left: 1, right: 1 },
    bodyHalfPt: 24,
    chapterTitleHalfPt: 56,
    coverTitleHalfPt: 96,
    dropCapHalfPt: 88,
  },
  a5: {
    label: "A5 (148 x 210 mm)",
    widthIn: 5.83,
    heightIn: 8.27,
    margin: { top: 0.7, bottom: 0.7, left: 0.7, right: 0.5 },
    bodyHalfPt: 22,
    chapterTitleHalfPt: 38,
    coverTitleHalfPt: 64,
    dropCapHalfPt: 68,
  },
  pocket: {
    label: "Mass Market (4.25 x 6.87 in)",
    widthIn: 4.25,
    heightIn: 6.87,
    margin: { top: 0.55, bottom: 0.55, left: 0.55, right: 0.4 },
    bodyHalfPt: 20,
    chapterTitleHalfPt: 32,
    coverTitleHalfPt: 52,
    dropCapHalfPt: 60,
  },
};

/** Human-readable metadata for the trim-size picker in the UI. */
export const TRIM_SIZE_OPTIONS: ReadonlyArray<{
  id: TrimSize;
  label: string;
  widthIn: number;
  heightIn: number;
  description: string;
}> = TRIM_SIZES.map((id) => {
  const spec = TRIM_SPECS[id];
  const description = (() => {
    switch (id) {
      case "us-letter":
        return "Non-fiction, workbooks, photo books, business guides.";
      case "us-trade":
        return "Most common novel and memoir size on Amazon KDP.";
      case "digest":
        return "Poetry, devotionals, short fiction â€” a handheld classic.";
      case "executive":
        return "Textbooks, journals, academic works.";
      case "a4":
        return "European standard â€” reports, non-fiction, large print.";
      case "a5":
        return "European trade paperback â€” novels, novellas.";
      case "pocket":
        return "Mass-market paperback â€” thrillers, romance, travel.";
    }
  })();
  return {
    id,
    label: spec.label,
    widthIn: spec.widthIn,
    heightIn: spec.heightIn,
    description,
  };
});

/** Resolve an arbitrary input string into a valid `TrimSize` (defaults to `us-letter`). */
export function resolveTrimSize(input?: string | null): TrimSize {
  if (!input) return "us-letter";
  const match = TRIM_SIZES.find((t) => t === input);
  return match ?? "us-letter";
}
~~~

## lib/kdp/build-kdp-pack-zip.ts

~~~ts
import JSZip from "jszip";

export type KdpPackFile = {
  path: string;
  content: string;
};

export async function buildKdpPackZip(files: KdpPackFile[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path, f.content);
  }
  const nodeBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return Buffer.from(nodeBuffer);
}
~~~

## lib/kdp/format-listing-markdown.ts

~~~ts
import type { KdpListingPayload } from "@/lib/kdp/generate-kdp-listing";

export function formatKdpListingMarkdown(
  bookTitle: string,
  data: KdpListingPayload,
): string {
  const kw = data.keywords.map((k, i) => `${i + 1}. ${k}`).join("\n");
  const titles = data.titleSuggestions.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const subs = data.subtitleSuggestions.map((t, i) => `${i + 1}. ${t}`).join("\n");

  return `# KDP listing metadata â€” ${bookTitle}

AI-assisted draft â€” **edit for accuracy, voice, and compliance** before pasting into KDP.

---

## Title ideas (pick one for the KDP Title field)

${titles}

_Current working title in ChapterAI: â€œ${bookTitle}â€_

---

## Subtitle ideas (optional)

${subs}

---

## Amazon book description

Paste into KDP **Description** (plain text; KDP may accept limited formattingâ€”follow their current rules).

${data.amazonDescription}

---

## Seven keywords

KDP provides **7 keyword boxes**. Paste **one line per box** (not comma-separated in one box).

${kw}

---

## About the author (two sentences)

For **paperback back cover**, **Author Central**, or your website. Third person.

${data.aboutTheAuthorTwoSentences}

---

## Back of the book (paperback)

Marketing blurb for the **back cover** (trim to fit your cover designerâ€™s layout).

${data.backCoverPaperbackBlurb}

---

## Category hints

Use these as a guide when picking **two categories** in KDPâ€”they must match options in KDPâ€™s picker.

1. ${data.bisacCategoryHints[0]}
2. ${data.bisacCategoryHints[1]}

---

*Generated by ChapterAI. You are responsible for final copy and KDP compliance.*
`;
}
~~~

## lib/kdp/generate-kdp-listing.ts

~~~ts
import { z } from "zod";

import { openai } from "@/lib/openai/client";

export type KdpBookContext = {
  title: string;
  genre: string;
  refinedIdea: string | null;
  rawIdea: string | null;
  targetAudience: string | null;
  tone: string | null;
  wordCount: number;
  chapterCount: number;
  outlineSummary: string;
  authorDisplayName: string;
};

const listingResponseSchema = z.object({
  titleSuggestions: z.array(z.string()).length(3),
  subtitleSuggestions: z.array(z.string()).length(3),
  amazonDescription: z.string().min(80).max(4000),
  keywords: z.array(z.string().min(1)).length(7),
  aboutTheAuthorTwoSentences: z.string().min(20).max(1200),
  backCoverPaperbackBlurb: z.string().min(80).max(2500),
  bisacCategoryHints: z.tuple([z.string(), z.string()]),
});

export type KdpListingPayload = z.infer<typeof listingResponseSchema>;

function stripJsonFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return m?.[1]?.trim() ?? t;
}

function buildUserContent(ctx: KdpBookContext): string {
  const parts = [
    `## Working title\n${ctx.title}`,
    `## Genre\n${ctx.genre}`,
    `## Author name to assume (for About the author; user may use a pen name)\n${ctx.authorDisplayName}`,
    `## Word count / chapters\n${ctx.wordCount} words, ${ctx.chapterCount} chapters`,
  ];
  if (ctx.targetAudience?.trim()) {
    parts.push(`## Target audience\n${ctx.targetAudience.trim()}`);
  }
  if (ctx.tone?.trim()) {
    parts.push(`## Tone\n${ctx.tone.trim()}`);
  }
  if (ctx.refinedIdea?.trim()) {
    parts.push(`## Refined idea / brief\n${ctx.refinedIdea.trim().slice(0, 12_000)}`);
  } else if (ctx.rawIdea?.trim()) {
    parts.push(`## Raw idea\n${ctx.rawIdea.trim().slice(0, 12_000)}`);
  }
  if (ctx.outlineSummary.trim()) {
    parts.push(`## Outline summary (chapter titles & beats)\n${ctx.outlineSummary.slice(0, 8000)}`);
  }
  return parts.join("\n\n");
}

const SYSTEM = `You are a Kindle Direct Publishing (KDP) copy specialist for independent authors.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "titleSuggestions": [string, string, string],
  "subtitleSuggestions": [string, string, string],
  "amazonDescription": string,
  "keywords": [string, string, string, string, string, string, string],
  "aboutTheAuthorTwoSentences": string,
  "backCoverPaperbackBlurb": string,
  "bisacCategoryHints": [string, string]
}

Rules:
- titleSuggestions: three compelling title options (the user may keep their working title; include one close variant and two fresh angles appropriate to genre).
- subtitleSuggestions: three subtitle options that clarify promise/audience (can be shorter phrases).
- amazonDescription: persuasive KDP product description with plain paragraphs (no HTML). Aim for roughly 150â€“350 words unless the book needs more; stay under 4000 characters. No misleading claims.
- keywords: exactly 7 entries. Each may be a short phrase (1â€“4 words) readers might searchâ€”no repetition of the title alone, no comma-stuffed spam.
- aboutTheAuthorTwoSentences: exactly two sentences in third person for paperback/Author Central style, warm and professional. If the author name is unknown, write for a debut indie author and they can edit.
- backCoverPaperbackBlurb: back-of-book marketing copy for a print editionâ€”hook, stakes, tone; about 120â€“220 words unless genre needs tighter copy; no spoilers of the ending.
- bisacCategoryHints: two strings naming plausible BISAC-style category paths (e.g. "Fiction / Mystery & Detective / Cozy") to guide the author in KDPâ€™s picker.

Match genre conventions and the tone of the supplied brief.`;

export async function generateKdpListingPayload(
  ctx: KdpBookContext,
): Promise<KdpListingPayload> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: buildUserContent(ctx),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.65,
    max_tokens: 4096,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from listing generator.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonFence(raw)) as unknown;
  } catch {
    throw new Error("Could not parse listing JSON from the model.");
  }

  const zResult = listingResponseSchema.safeParse(parsedJson);
  if (!zResult.success) {
    throw new Error("Listing JSON failed validation.");
  }
  return zResult.data;
}
~~~

## lib/kdp/outline-summary.ts

~~~ts
import type { Json } from "@/types/database.types";

/**
 * Turn `outlines.sections` JSON into a compact string for KDP listing context.
 */
export function summarizeOutlineSections(sections: Json): string {
  if (!Array.isArray(sections) || sections.length === 0) {
    return "";
  }
  const lines: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    const row = sections[i];
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "Untitled";
    const description = typeof o.description === "string" ? o.description : "";
    const n = typeof o.number === "number" ? o.number : i + 1;
    const tl = o.tension_level;
    const tension =
      typeof tl === "number" && tl >= 1 && tl <= 10 ? ` [tension ${Math.round(tl)}/10]` : "";
    const rt = o.reader_takeaway;
    const takeaway =
      typeof rt === "string" && rt.trim() ? ` [takeaway: ${rt.trim()}]` : "";
    lines.push(
      `Chapter ${n}: ${title}${tension}${takeaway}${description ? ` â€” ${description}` : ""}`,
    );
  }
  return lines.join("\n");
}
~~~

## lib/kdp/walkthrough-markdown.ts

~~~ts
/**
 * Static Kindle Direct Publishing walkthrough (eBook + paperback).
 * Bundled in the KDP listing ZIP alongside AI-generated metadata.
 */
export function getStaticKdpWalkthroughMarkdown(): string {
  return `# Kindle Direct Publishing â€” guided walkthrough

Use this checklist on **https://kdp.amazon.com** together with the **KDP listing metadata** file from this ZIP. Nothing here is legal or tax adviceâ€”follow KDPâ€™s own help pages for tax interviews and payment setup.

---

## Before you start

1. **Amazon account** you can use for publishing (separate from your buyer account is fine).
2. **Manuscript** as .docx (from ChapterAI **Compile & Download**).
3. **Cover image** meeting KDP minimums (eBook and paperback have different requirementsâ€”KDP shows current pixel sizes when you upload).
4. **Bank account / tax forms**â€”KDP will prompt you during setup.

---

## Part A â€” Create the book on KDP

### 1. Sign in and create a new book

1. Go to **kdp.amazon.com** and sign in.
2. Open **Your Bookshelf**.
3. Click **\\+ Create** and choose **Kindle eBook** and/or **Paperback** (you can add the other format later with â€œCreate new versionâ€ or a linked editionâ€”follow KDPâ€™s current UI).

### 2. Language, title, and edition

1. Set **Primary language** to match your manuscript.
2. **Book title** â€” paste your chosen title from the metadata file (you can edit before publishing).
3. **Subtitle** â€” optional; paste a subtitle option from the metadata file if you use one.
4. **Edition** â€” leave blank for first edition, or enter â€œ2nd editionâ€ etc. if applicable.
5. **Author** â€” your real name or pen name (should match your cover).

### 3. Description and keywords

1. **Book description** â€” open your metadata file and paste the **Amazon book description** into KDPâ€™s description field. You can tweak length to fit; avoid ALL CAPS spam.
2. **Publishing rights** â€” confirm you hold the rights (typical for your own work).
3. **Keywords** â€” KDP allows **7 keyword boxes**. Paste one keyword or short phrase per box from the metadata file. Use phrases readers actually search; avoid unrelated trending words.

### 4. Categories

1. Choose **two categories** that best fit your book (genre + niche).
2. Use the **category hints** in the metadata file as a starting point; pick the closest match KDP offers in the picker.

### 5. ISBN and publication (paperback)

- **Paperback** may require an ISBN or a free KDP ISBN depending on your choicesâ€”read KDPâ€™s explanation on that screen and pick what fits your goals.
- **Release date** â€” many indies use â€œas soon as possibleâ€ unless youâ€™re planning a preorder.

---

## Part B â€” Upload interior and preview

### 6. Manuscript upload

1. In the **Manuscript** section, upload your **.docx** from ChapterAI.
2. Wait for processing; fix any errors KDP reports (fonts, images, etc.).

### 7. Preview

1. Open **Online Previewer** (or download the preview) and scroll **every chapter**: chapter titles, scene breaks, and paragraph spacing.
2. Fix issues in your source manuscript, re-export from ChapterAI, and re-upload if needed.

---

## Part C â€” Cover

### 8. eBook cover

1. Upload a cover that meets KDPâ€™s **current** dimension and file-type rules (shown on the upload page).
2. Check the thumbnail viewâ€”most readers see the book first as a small image.

### 9. Paperback cover

1. Paperback requires a **full cover** (back + spine + front). KDP provides a **cover template** after you choose trim size, paper, and page countâ€”download it and use a design tool, or use a service that accepts the template.
2. **Back cover copy** â€” use the **Back of book (paperback)** text from your metadata file on the back cover layout (you may shorten to fit the design).

### 10. About the author (paperback / optional)

- Many paperbacks include a short **About the author** on the back cover or inside flap. Use the **two-sentence author bio** from your metadata file (edit to match your voice).

---

## Part D â€” Pricing and territories

### 11. Royalties and price

1. Choose **35% or 70% royalty** where offered; 70% often requires price within KDPâ€™s stated band and territory rulesâ€”read the on-screen help.
2. Set **list price** per marketplace or use a global price. The metadata file may suggest a band for your genreâ€”adjust based on your strategy.

### 12. Territories

- **Worldwide** is typical unless you have a reason to limit regions.

---

## Part E â€” Review and publish

### 13. Review summary

1. Open **Review** and confirm title, author, categories, price, and that preview looks correct.

### 14. Publish

1. Click **Publish** (wording may vary). KDP will move the book to **In review**, then **Live**â€”often within **72 hours**, sometimes faster.

### 15. After launch

1. Claim **Author Central** (Amazonâ€™s author profile) to add bio and photos when available in your region.
2. Monitor **Reviews**, **Reports**, and any **quality notifications** from KDP.

---

## Need help?

- KDPâ€™s official help: use the **?** links inside each KDP step.
- Re-download your manuscript or regenerate listing ideas from **ChapterAI** on your projectâ€™s **Export** page.

*Generated by ChapterAI â€” listing copy in the companion file is AI-assisted; edit for accuracy and your voice before publishing.*
`;
}
~~~

## lib/lucide-icons.ts

~~~ts
/**
 * Per-icon lucide modules â€” avoids Next.js RSC/webpack `__barrel_optimize__` linking the wrong
 * file when multiple icons are imported from `lucide-react` (runtime: __webpack_modules__[id] is not a function).
 */
export { default as AlertTriangle } from "lucide-react/dist/esm/icons/alert-triangle.js";
export { default as AtSign } from "lucide-react/dist/esm/icons/at-sign.js";
export { default as ArrowLeft } from "lucide-react/dist/esm/icons/arrow-left.js";
export { default as ArrowRight } from "lucide-react/dist/esm/icons/arrow-right.js";
export { default as ArrowUp } from "lucide-react/dist/esm/icons/arrow-up.js";
export { default as Bold } from "lucide-react/dist/esm/icons/bold.js";
export { default as BookMarked } from "lucide-react/dist/esm/icons/book-marked.js";
export { default as BookOpen } from "lucide-react/dist/esm/icons/book-open.js";
export { default as BookOpenCheck } from "lucide-react/dist/esm/icons/book-open-check.js";
export { default as Check } from "lucide-react/dist/esm/icons/check.js";
export { default as CheckCircle2 } from "lucide-react/dist/esm/icons/check-circle-2.js";
export { default as ChevronDown } from "lucide-react/dist/esm/icons/chevron-down.js";
export { default as Code } from "lucide-react/dist/esm/icons/code.js";
export { default as Code2 } from "lucide-react/dist/esm/icons/code-2.js";
export { default as ChevronLeft } from "lucide-react/dist/esm/icons/chevron-left.js";
export { default as ChevronRight } from "lucide-react/dist/esm/icons/chevron-right.js";
export { default as ChevronUp } from "lucide-react/dist/esm/icons/chevron-up.js";
export { default as Copy } from "lucide-react/dist/esm/icons/copy.js";
export { default as CreditCard } from "lucide-react/dist/esm/icons/credit-card.js";
export { default as DollarSign } from "lucide-react/dist/esm/icons/dollar-sign.js";
export { default as Download } from "lucide-react/dist/esm/icons/download.js";
export { default as Expand } from "lucide-react/dist/esm/icons/expand.js";
export { default as Eye } from "lucide-react/dist/esm/icons/eye.js";
export { default as FileArchive } from "lucide-react/dist/esm/icons/file-archive.js";
export { default as FileDown } from "lucide-react/dist/esm/icons/file-down.js";
export { default as FileUp } from "lucide-react/dist/esm/icons/file-up.js";
export { default as Globe } from "lucide-react/dist/esm/icons/globe.js";
export { default as Grid3x3 } from "lucide-react/dist/esm/icons/grid-3x3.js";
export { default as GripVertical } from "lucide-react/dist/esm/icons/grip-vertical.js";
export { default as Hash } from "lucide-react/dist/esm/icons/hash.js";
export { default as Heading1 } from "lucide-react/dist/esm/icons/heading-1.js";
export { default as Heading2 } from "lucide-react/dist/esm/icons/heading-2.js";
export { default as Heading3 } from "lucide-react/dist/esm/icons/heading-3.js";
export { default as Heading4 } from "lucide-react/dist/esm/icons/heading-4.js";
export { default as ImageIcon } from "lucide-react/dist/esm/icons/image.js";
export { default as Italic } from "lucide-react/dist/esm/icons/italic.js";
export { default as Keyboard } from "lucide-react/dist/esm/icons/keyboard.js";
export { default as Languages } from "lucide-react/dist/esm/icons/languages.js";
export { default as LayoutDashboard } from "lucide-react/dist/esm/icons/layout-dashboard.js";
export { default as Lightbulb } from "lucide-react/dist/esm/icons/lightbulb.js";
export { default as Link2 } from "lucide-react/dist/esm/icons/link-2.js";
export { default as Link2Off } from "lucide-react/dist/esm/icons/link-2-off.js";
export { default as List } from "lucide-react/dist/esm/icons/list.js";
export { default as ListOrdered } from "lucide-react/dist/esm/icons/list-ordered.js";
export { default as ListTree } from "lucide-react/dist/esm/icons/list-tree.js";
export { default as Loader2 } from "lucide-react/dist/esm/icons/loader-2.js";
export { default as LogOut } from "lucide-react/dist/esm/icons/log-out.js";
export { default as MapPin } from "lucide-react/dist/esm/icons/map-pin.js";
export { default as Maximize2 } from "lucide-react/dist/esm/icons/maximize-2.js";
export { default as Menu } from "lucide-react/dist/esm/icons/menu.js";
export { default as Minimize2 } from "lucide-react/dist/esm/icons/minimize-2.js";
export { default as MessageSquareText } from "lucide-react/dist/esm/icons/message-square-text.js";
export { default as MessagesSquare } from "lucide-react/dist/esm/icons/messages-square.js";
export { default as MoreVertical } from "lucide-react/dist/esm/icons/more-vertical.js";
export { default as Pencil } from "lucide-react/dist/esm/icons/pencil.js";
export { default as PencilLine } from "lucide-react/dist/esm/icons/pencil-line.js";
export { default as PenLine } from "lucide-react/dist/esm/icons/pen-line.js";
export { default as Plus } from "lucide-react/dist/esm/icons/plus.js";
export { default as Quote } from "lucide-react/dist/esm/icons/quote.js";
export { default as Redo2 } from "lucide-react/dist/esm/icons/redo-2.js";
export { default as Replace } from "lucide-react/dist/esm/icons/replace.js";
export { default as Rocket } from "lucide-react/dist/esm/icons/rocket.js";
export { default as Route } from "lucide-react/dist/esm/icons/route.js";
export { default as Ruler } from "lucide-react/dist/esm/icons/ruler.js";
export { default as Save } from "lucide-react/dist/esm/icons/save.js";
export { default as Search } from "lucide-react/dist/esm/icons/search.js";
export { default as Send } from "lucide-react/dist/esm/icons/send.js";
export { default as Settings } from "lucide-react/dist/esm/icons/settings.js";
export { default as Share2 } from "lucide-react/dist/esm/icons/share-2.js";
export { default as Sparkles } from "lucide-react/dist/esm/icons/sparkles.js";
export { default as SpellCheck2 } from "lucide-react/dist/esm/icons/spell-check-2.js";
export { default as Strikethrough } from "lucide-react/dist/esm/icons/strikethrough.js";
export { default as Tags } from "lucide-react/dist/esm/icons/tags.js";
export { default as Target } from "lucide-react/dist/esm/icons/target.js";
export { default as Trash2 } from "lucide-react/dist/esm/icons/trash-2.js";
export { default as TrendingUp } from "lucide-react/dist/esm/icons/trending-up.js";
export { default as Type } from "lucide-react/dist/esm/icons/type.js";
export { default as Underline } from "lucide-react/dist/esm/icons/underline.js";
export { default as Undo2 } from "lucide-react/dist/esm/icons/undo-2.js";
export { default as Upload } from "lucide-react/dist/esm/icons/upload.js";
export { default as UserPlus } from "lucide-react/dist/esm/icons/user-plus.js";
export { default as UserRound } from "lucide-react/dist/esm/icons/user-round.js";
export { default as Wand2 } from "lucide-react/dist/esm/icons/wand-2.js";
export { default as X } from "lucide-react/dist/esm/icons/x.js";
~~~

## lib/openai/brief-context.ts

~~~ts
import { sanitizeText } from "@/lib/utils/sanitize";

/**
 * Turn the structured `refined_idea` JSON into a labelled multi-line brief
 * block suitable for feeding into any meta-prompt (cover, metadata, blurb).
 *
 * Falls back to the raw text (clipped) if `refinedIdea` isn't valid JSON.
 * Returns a minimal title/genre stub if no brief is present at all.
 */
export function buildBriefContext(
  refinedIdea: string | null,
  bookTitle: string,
  bookGenre: string,
): string {
  const fallback = `Title: ${bookTitle}\nGenre: ${bookGenre}\nNo further brief on file.`;
  if (!refinedIdea?.trim()) return fallback;

  try {
    const o = JSON.parse(refinedIdea) as Record<string, unknown>;
    const lines: string[] = [];

    const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const arr = (v: unknown) =>
      Array.isArray(v) ? (v as unknown[]).map(String).filter(Boolean).join(", ") : null;

    if (s(o.suggested_title ?? o.title)) lines.push(`Title: ${s(o.suggested_title ?? o.title)}`);
    if (s(o.genre)) lines.push(`Genre: ${s(o.genre)}${s(o.subgenre) ? ` / ${s(o.subgenre)}` : ""}`);
    if (s(o.target_audience ?? o.audience)) lines.push(`Target audience: ${s(o.target_audience ?? o.audience)}`);
    if (s(o.core_premise ?? o.premise ?? o.core_promise)) lines.push(`Premise: ${s(o.core_premise ?? o.premise ?? o.core_promise)}`);
    if (s(o.emotional_contract)) lines.push(`Emotional tone: ${s(o.emotional_contract)}`);
    if (s(o.tone ?? o.tone_and_style)) lines.push(`Voice/style: ${s(o.tone ?? o.tone_and_style)}`);
    if (arr(o.comparable_titles)) lines.push(`Comparable titles: ${arr(o.comparable_titles)}`);
    if (arr(o.key_themes ?? o.themes)) lines.push(`Themes: ${arr(o.key_themes ?? o.themes)}`);
    if (s(o.world_specific_detail)) lines.push(`World detail: ${s(o.world_specific_detail)}`);
    if (s(o.protagonist_core_wound)) lines.push(`Protagonist wound: ${s(o.protagonist_core_wound)}`);
    if (s(o.must_have_scene)) lines.push(`Key image: ${s(o.must_have_scene)}`);
    if (s(o.arc_shape)) lines.push(`Arc: ${s(o.arc_shape)}`);
    if (s(o.unique_angle)) lines.push(`Unique angle: ${s(o.unique_angle)}`);
    if (s(o.before_state)) lines.push(`Reader before: ${s(o.before_state)}`);
    if (s(o.after_state)) lines.push(`Reader after: ${s(o.after_state)}`);

    return lines.length > 0 ? lines.join("\n") : fallback;
  } catch {
    return sanitizeText(refinedIdea.trim().slice(0, 2000));
  }
}

/**
 * Short, human-readable digest of outline sections for blurb grounding.
 * Keeps the first ~12 chapters (more than enough for back-cover copy) and
 * truncates each description so the total stays well under 4K chars.
 */
export function buildOutlineDigest(sections: unknown): string {
  if (!Array.isArray(sections) || sections.length === 0) return "";

  const entries = sections
    .slice(0, 12)
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const s = raw as Record<string, unknown>;
      const num = typeof s.number === "number" ? s.number : null;
      const title = typeof s.title === "string" ? s.title.trim() : "";
      const descRaw = typeof s.description === "string" ? s.description.trim() : "";
      const desc = descRaw.length > 260 ? `${descRaw.slice(0, 260)}â€¦` : descRaw;
      if (!title && !desc) return null;
      const label = num ? `Ch. ${num}` : "Ch.";
      return `${label} â€” ${title || "Untitled"}: ${desc}`;
    })
    .filter((s): s is string => Boolean(s));

  return entries.join("\n");
}
~~~

## lib/openai/client.ts

~~~ts
import OpenAI from "openai";

/**
 * Reuse one client instance per Node isolate (avoids duplicate clients on HMR / reload).
 * Server-only â€” never import this module from Client Components.
 */
const globalForOpenAI = globalThis as unknown as {
  __chapterai_openai?: OpenAI;
};

function requireApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return key;
}

globalForOpenAI.__chapterai_openai ??= new OpenAI({ apiKey: requireApiKey() });

export const openai: OpenAI = globalForOpenAI.__chapterai_openai;
~~~

## lib/openai/generate-character-bible.ts

~~~ts
import { z } from "zod";

import { openai } from "@/lib/openai/client";
import { getCharacterBiblePromptForBookType } from "@/lib/openai/prompts";
import type { BookTypeDb, Json } from "@/types/database.types";
import { logServerError } from "@/lib/utils/errors";
import { sanitizeText } from "@/lib/utils/sanitize";

const characterEntrySchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  physical_description: z.string().optional(),
  voice_and_speech: z.string().optional(),
  motivation_or_wound: z.string().optional(),
  relationships: z.string().optional(),
});

export const characterBibleResponseSchema = z.object({
  characters: z.array(characterEntrySchema).min(1),
  setting_anchors: z.string().optional(),
  continuity_rules: z.string().optional(),
});

export type CharacterBiblePayload = z.infer<typeof characterBibleResponseSchema>;

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = t.match(fence);
  if (m?.[1]) return m[1].trim();
  return t;
}

/** Plain text block for the chapter system prompt (JSON is readable and unambiguous for the model). */
export function characterBibleToPromptBlock(bible: Json | null): string | null {
  if (bible === null || bible === undefined) return null;
  if (typeof bible === "string") {
    const t = bible.trim();
    return t.length > 0 ? sanitizeText(t) : null;
  }
  if (typeof bible !== "object") return null;
  try {
    const s = JSON.stringify(bible, null, 2).trim();
    return s.length > 0 ? s : null;
  } catch {
    return null;
  }
}

export async function generateCharacterBiblePayload(params: {
  bookTitle: string;
  bookType: BookTypeDb;
  genre: string | null;
  tone: string | null;
  brief: string;
  outlineSections: Json;
}): Promise<{ payload: CharacterBiblePayload; tokensUsed: number } | null> {
  const systemPrompt = getCharacterBiblePromptForBookType(params.bookType);
  const userContent = [
    `Book title: ${sanitizeText(params.bookTitle.trim() || "Untitled")}`,
    params.genre ? `Genre: ${sanitizeText(params.genre)}` : null,
    params.tone ? `Tone: ${sanitizeText(params.tone)}` : null,
    "",
    "Author brief (refined idea and/or raw concept):",
    sanitizeText(params.brief.trim()) || "(No brief text â€” infer only from outline.)",
    "",
    "Approved outline (JSON array of chapter sections):",
    JSON.stringify(params.outlineSections ?? []),
  ]
    .filter((l) => l !== null)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
    });

    const tokensUsed =
      completion.usage?.total_tokens ??
      Math.ceil((systemPrompt.length + userContent.length) / 4);

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const completionText = stripJsonFence(raw);
    let obj: unknown;
    try {
      obj = JSON.parse(completionText) as unknown;
    } catch {
      logServerError("character-bible.json-parse", new Error("invalid JSON"));
      return null;
    }

    const zResult = characterBibleResponseSchema.safeParse(obj);
    if (!zResult.success) {
      logServerError("character-bible.zod", zResult.error);
      return null;
    }

    return { payload: zResult.data, tokensUsed };
  } catch (e) {
    logServerError("character-bible.openai", e);
    return null;
  }
}
~~~

## lib/openai/prompts.ts

~~~ts
/**
 * System prompts for ChapterAI â€” aligned with `.cursor/rules/chapterai-autopilot.mdc`.
 * All functions return full system prompt strings for the OpenAI API (server-side only).
 */

/** Idea refinement â€” verbatim from project rules. */
export function getIdeaRefinementSystemPrompt(): string {
  return `You are a professional book development editor. Your job is to ask focused questions
to extract the user's full vision for their book. Ask one clarifying question at a time.
After 8-10 exchanges, summarize the refined idea as a structured brief with:
- Title (suggested)
- Subtitle (ALWAYS required â€” craft a compelling 4-14 word subtitle that hooks the target
  reader, clarifies the angle, and sits naturally under the title on an Amazon KDP cover;
  never return an empty subtitle)
- Genre
- Target audience
- Core premise (2-3 sentences)
- Tone and style
- Key themes
- Estimated length (chapters and word count)
Signal completion by returning a JSON block wrapped in <REFINED_IDEA>...</REFINED_IDEA>
with keys: title, subtitle, genre, target_audience, core_premise, tone_and_style, key_themes, estimated_length.`;
}

/**
 * Focused prompt used by `/api/ai/generate-subtitle` to craft a single
 * retail-quality subtitle from an in-progress (unsaved) brief. The response
 * MUST be a single line of plain text â€” no quotes, no markdown, no prefixes
 * like "Subtitle:".
 */
export function getSubtitlePrompt(brief: {
  title: string;
  genre?: string | null;
  tone?: string | null;
  audience?: string | null;
  premise?: string | null;
  themes?: string | null;
}): string {
  const lines = [
    `Title: ${brief.title.trim() || "Untitled"}`,
    brief.genre?.trim() ? `Genre: ${brief.genre.trim()}` : null,
    brief.tone?.trim() ? `Tone: ${brief.tone.trim()}` : null,
    brief.audience?.trim() ? `Audience: ${brief.audience.trim()}` : null,
    brief.premise?.trim() ? `Premise: ${brief.premise.trim()}` : null,
    brief.themes?.trim() ? `Themes: ${brief.themes.trim()}` : null,
  ].filter((line): line is string => Boolean(line));

  return `You write Amazon KDP subtitles for indie authors. Given the brief below, craft ONE compelling subtitle that:
- Is 4â€“14 words, no more than ~90 characters.
- Clarifies the angle or promise of the book in a way that hooks the target reader.
- Matches the genre conventions and tone (literary novels lean evocative; non-fiction leans outcome-first; thrillers/romance lean high-stakes).
- Uses Title Case; no trailing punctuation, no quotes, no emojis, no markdown.
- Does NOT repeat the main title verbatim.

## Brief
${lines.join("\n")}

Respond with the subtitle only â€” one line of plain text, nothing else.`;
}

/** Outline generation â€” verbatim from project rules. */
export function getOutlineSystemPrompt(): string {
  return `You are a bestselling author and structural editor. Given the book brief below,
generate a detailed chapter-by-chapter outline. Each chapter must have a title
and a 2-3 sentence description of what it covers. Return ONLY valid JSON in this format:
{"chapters": [{"number": 1, "title": "...", "description": "..."}]}
Generate between 8-15 chapters appropriate to the genre and scope.`;
}

function normalizePriorSummaries(
  priorChapterSummaries?: string | readonly string[],
): string {
  if (priorChapterSummaries === undefined || priorChapterSummaries === null) {
    return "None yet â€” this is an early chapter or no prior summaries were supplied.";
  }
  if (typeof priorChapterSummaries === "string") {
    const t = priorChapterSummaries.trim();
    return t.length > 0 ? t : "None yet.";
  }
  if (priorChapterSummaries.length === 0) {
    return "None yet.";
  }
  return priorChapterSummaries
    .map((s, i) => `### Prior chapter ${i + 1}\n${s.trim()}`)
    .join("\n\n");
}

/**
 * Chapter writing â€” attacks the four failure modes of AI fiction (explaining
 * instead of showing, concept-characters, tension-free prose, prose that
 * "sounds like writing") with concrete, testable instructions rather than
 * abstract advice. Branches on `bookType` for genre-specific craft rules.
 */
export function getChapterSystemPrompt(
  chapterNumber: number,
  chapterTitle: string,
  targetWordCount: number,
  bookContext: string,
  priorChapterSummaries?: string | readonly string[],
  bookType?: "fiction" | "non_fiction" | null,
): string {
  const bookTypeGuidance = getChapterSystemPromptForBookType(bookType ?? null);
  const trimmedContext =
    bookContext.trim() ||
    "No additional context supplied â€” infer consistency from the outline and user message.";
  const priorBlock = normalizePriorSummaries(priorChapterSummaries);

  return `You are a novelist with a reputation for making readers physically unable to put the book down.

Write Chapter ${chapterNumber}: "${chapterTitle}" as the complete, published chapter â€” not a summary, not a sketch, not a "draft." The real thing.

TARGET: ${targetWordCount.toLocaleString()} words. Hit within 10%.

---

## The four things that kill AI fiction (avoid all of them):

1. EXPLAINING INSTEAD OF SHOWING
   Bad: "Aria felt a growing sense of unease about the situation."
   Good: Her finger hovered over the send button for eleven seconds. She counted.
   Never tell the reader what to feel. Make them feel it.

2. CHARACTERS WHO ARE CONCEPTS, NOT PEOPLE
   Every character needs one specific, slightly irrational thing that makes them real:
   a nervous habit, a contradiction, a belief they'd be embarrassed to say out loud.
   Generic characters have goals. Real characters have damage.
   Ask: what does this person want that they would never admit to wanting?

3. TENSION-FREE FORWARD MOTION
   Every scene needs an open question the reader is dying to see answered.
   Plant it in the first paragraph. Don't answer it until you have to.
   If a scene has no threat â€” to a plan, a relationship, a belief, a secret â€” cut it or add one.

4. PROSE THAT SOUNDS LIKE WRITING
   The moment a reader thinks "that's a well-constructed sentence," you've lost them.
   Write like the character is living it, not like an author is describing it.
   Specific, concrete, sensory. Not: "the room felt cold."
   Yes: "The AC had been broken since March. Nobody had fixed it."

---

## Craft requirements for this chapter:

OPENING â€” Don't start with weather, backstory, or a character waking up.
Start with something already happening that creates immediate forward pull.
The first sentence should make it impossible not to read the second.

EVERY SCENE needs all three:
- A specific physical location with at least two sensory details
- A power dynamic between whoever is in the scene
- Something that changes by the end of it â€” a decision, a revelation, a shift in who holds leverage

DIALOGUE â€” Each line should do two things simultaneously:
what it appears to say + what it actually means.
People lie, deflect, perform, and test each other. They rarely just communicate.
No dialogue that only moves plot. No dialogue that only reveals character. Both, always.

PACING â€” Vary sentence length deliberately.
Short sentences hit hard. Use them after something lands.
Long sentences create a feeling of things accumulating, building, getting out of hand, the way real dread works.

THE ENDING â€” Do not resolve. Complicate.
The last line of a chapter should make stopping feel like abandonment.
Either a question just opened, or something just changed that we don't understand yet.

---

${bookTypeGuidance}

---

## FORMATTING
Clean Markdown. The compiler adds the chapter heading â€” do not open with "# Chapter N".

- \`## Subheading\` for major section breaks (nonfiction) or scene headers if needed
- \`* * *\` on its own line for scene breaks
- \`> text\` for block quotes
- \`>> text\` for a single pull quote (at most once per chapter)
- Callout boxes: \`> [!NOTE]\` / \`[!TIP]\` / \`[!WARNING]\` / \`[!IMPORTANT]\` / \`[!QUOTE]\` / \`[!SIDE]\` / \`[!KEY]\` / \`[!CASE]\`
- \`**bold**\` \`*italic*\` for inline emphasis
- Never stack callouts. Always a blank line before and after.

---

## Book context
${trimmedContext}

## Prior chapter summaries
${priorBlock}`;
}

/**
 * Returns the fiction-vs-nonfiction craft block interpolated into the chapter
 * system prompt. Defaults to the fiction block when `bookType` is null/unknown.
 */
export function getChapterSystemPromptForBookType(
  bookType: "fiction" | "non_fiction" | null,
): string {
  if (bookType === "non_fiction") {
    return `## Nonfiction-specific

VOICE: You have a point of view. State it. Hedge nothing.
The reader didn't pick up this book to hear "it depends" â€” they picked it up because they trust you know something they don't.

STRUCTURE per section:
1. The claim â€” say the thing plainly, even if it's uncomfortable
2. The evidence â€” one real, specific, named example beats three vague ones
3. The implication â€” what does this mean for the reader's actual life or work?

OPENINGS: Start with the story, not the concept.
The concept earns its place after the story makes the reader care.

ENDINGS: Each chapter should leave the reader with one thing they can't stop thinking about.
Not a summary. A provocation, a reframe, or an unresolved question that the next chapter will answer.

WHAT TO AVOID:
- Transition sentences that summarize what you just said ("As we've seen...")
- Hedging language that dilutes authority ("In many cases...", "Often...", "Some might argue...")
- Examples without specificity (no "a Fortune 500 company" â€” name it, or make the unnamed detail so vivid it feels real)`;
  }

  return `## Fiction-specific

POV: Stay locked. If you're in a character's head, see only what they see, know only what they know.
The moment the narration knows more than the POV character, the reader detaches.

SUBTEXT: What your characters say and what they mean should rarely be the same thing.
The real conversation is always happening underneath the surface one.

INTERIORITY: We need to be inside the protagonist's body, not watching from above.
Not: "She was angry."
Yes: "She smiled, which was easier than explaining."

SCENE CONSTRUCTION:
- Enter late (skip the setup, start in the middle of what matters)
- Leave early (cut before the natural conclusion â€” the reader's imagination is better than your resolution)
- Every scene exits differently than it entered: in mood, in power, in what's known

AVOID AT ALL COSTS:
- Characters who exist only to deliver information to the protagonist
- Violence or conflict that has no cost
- Coincidences that solve problems (coincidences that create problems are fine)
- Any sentence that could appear in a different book without modification`;
}

/** DALL-E 3 meta-prompt â€” asks for flat, print/ebook-ready cover art (not a photo of a book). */
export function getCoverPromptSystemPrompt(
  title: string,
  genre: string,
  premise: string,
  tone: string,
  subtitle?: string | null,
  authorDisplayName?: string | null,
): string {
  const trimmedTitle = title.trim();
  const trimmedSubtitle = subtitle?.trim() ?? "";
  const trimmedAuthor = authorDisplayName?.trim() ?? "";

  const textLines: string[] = [`  â€¢ Title: "${trimmedTitle}" â€” largest, dominant typography on the cover`];
  if (trimmedSubtitle) {
    textLines.push(
      `  â€¢ Subtitle: "${trimmedSubtitle}" â€” smaller than the title, placed directly beneath it`,
    );
  }
  if (trimmedAuthor) {
    textLines.push(
      `  â€¢ Author by-line: "${trimmedAuthor}" â€” smallest of the three, placed where an author name traditionally sits on a book cover (usually lower-third or bottom)`,
    );
  }
  const textBlock = textLines.join("\n");

  const spellingCheck = [trimmedTitle, trimmedSubtitle, trimmedAuthor]
    .filter((s) => s.length > 0)
    .map((s) => `"${s}"`)
    .join(", ");

  return `Generate a single DALL-E 3 image prompt for FRONT COVER ARTWORK for this book â€” a FLAT, FULL-BLEED, 2D image that IS the finished cover (the exact PNG/JPG an author uploads to Amazon KDP). This is NOT a marketing shot, NOT a mockup of a printed book, NOT a 3D render of a book object.

Book: Title "${trimmedTitle}", Genre: ${genre}, Premise: ${premise}, Tone: ${tone}.

The image prompt MUST require ALL of the following:
- A single flat, 2D, full-bleed front-cover illustration (portrait orientation, roughly 2:3), filling the entire frame edge to edge
- The cover MUST render these exact text elements as integrated typography baked into the artwork â€” correctly spelled, clearly legible, with strong contrast against the background:
${textBlock}
- Spell every word exactly as shown. Do not add, translate, paraphrase, or invent additional text (no taglines, review quotes, series labels, publisher logos, or barcodes).
- Choose fonts, hierarchy, and placement that suit the ${genre} genre and a ${tone} tone, consistent with bestseller covers in that category.
- Composition leaves clean, uncluttered space for each text block so nothing is cropped or overlapped by busy detail.
- Professional, commercially viable cover design â€” the final image should look like a real published book cover when viewed as a flat rectangle.
- NO 3D books, NO hardcover or paperback mockups, NO book-on-a-table, NO angled product shots, NO e-reader/tablet/phone, NO hands holding a book, NO bookshelf scenes, NO spine, NO back cover, NO page edges â€” only the front cover art itself as one rectangular poster-like image.
- NO frame-within-frame, NO "book inside the image" â€” the entire image IS the cover.

Before finalizing the prompt, double-check that the following strings appear verbatim in the prompt so the image generator renders them correctly: ${spellingCheck}.

Return only the image generation prompt text, nothing else â€” no quotes, no preamble, no markdown.`;
}

/**
 * System prompt to generate a personalized KDP publishing guide for a specific title/genre.
 * Grounds the model in Amazon KDP best practices and the static checklist from project rules.
 */
export function getKDPInstructionsPrompt(bookTitle: string, genre: string): string {
  const title = bookTitle.trim() || "Untitled work";
  const g = genre.trim() || "General fiction";

  return `You are a Kindle Direct Publishing (KDP) onboarding specialist helping an independent author publish on Amazon.

The author's book is titled "${title}" and is best described as: ${g}.

Write a concise, personalized KDP publishing guide for THIS book. Use clear headings and numbered steps. Address the author directly ("you"). Tailor category ideas, keyword examples, pricing bands, and tone of the description to the title and genre.

You MUST cover all of the following areas (adapt examples to the book):

1. Create your KDP account at kdp.amazon.com
2. Click "Create" â†’ "Kindle eBook" or "Paperback"
3. Enter your book title, subtitle, author name, and description (suggest a short description draft for "${title}")
4. Set language, publication date, and add relevant keywords (7 allowed) â€” suggest realistic keyword phrases for this genre
5. Choose 2 categories that best match this book â€” name plausible BISAC-style category pairs for ${g}
6. Upload your manuscript (.docx is accepted â€” reference the file they will upload from ChapterAI)
7. Use KDP's previewer to review formatting â€” note common issues for ${g}
8. Upload your cover image (minimum 2560 x 1600px â€” remind them to use their generated cover)
9. Set your pricing (70% royalty available for books priced $2.99â€“$9.99) â€” suggest a sample price range appropriate to ${g}
10. Select territories (choose "worldwide" unless you have regional restrictions)
11. Click "Publish" â€” your book goes live within 24-72 hours

End with a short checklist of final clicks before hitting Publish. Do not invent legal or tax advice; stay within general KDP workflow guidance.`;
}

/** Back cover / marketing blurb â€” uses full brief + optional outline digest. */
export function getBackCoverPrompt(
  bookType: string,
  title: string,
  genre: string,
  tone: string,
  audience: string,
  briefContext: string,
  outlineDigest: string,
): string {
  const typeLine =
    bookType === "nonfiction"
      ? "This is a nonfiction work. Emphasize transformation, credibility, and reader outcome."
      : "This is a work of fiction. Emphasize stakes, mood, and emotional hook without spoiling major twists.";

  return `You write compelling back-cover copy for print and ebook listings.

${typeLine}

## Book
- Title: ${title}
- Genre: ${genre || "General"}
- Tone: ${tone || "Not specified"}
- Audience: ${audience || "General readers"}

## Brief / premise
${briefContext.trim() || "Use the title and genre only."}

## Outline snapshot (for structure â€” do not list chapter titles in the blurb)
${outlineDigest.trim() || "No outline summary supplied."}

Write a single back-cover blurb in plain prose: 150â€“200 words, second person or third person as fits the genre, no markdown, no headings, no bullet points.`;
}

/**
 * Short "About the Author" paragraph for the paperback back cover and KDP
 * author bio field. Grounded in the author's profile (if set) and the book
 * itself so the voice matches the project â€” not a generic bio.
 */
export function getAboutAuthorPrompt(args: {
  bookTitle: string;
  genre: string;
  tone: string;
  authorDisplayName: string;
  fullName: string;
  penName: string;
  profileBio: string;
  location: string;
  website: string;
  twitterHandle: string;
  briefContext: string;
}): string {
  const {
    bookTitle,
    genre,
    tone,
    authorDisplayName,
    fullName,
    penName,
    profileBio,
    location,
    website,
    twitterHandle,
    briefContext,
  } = args;

  const byline =
    authorDisplayName.trim() ||
    penName.trim() ||
    fullName.trim() ||
    "the author";

  const profileLines = [
    profileBio.trim() ? `Existing author bio: ${profileBio.trim()}` : null,
    location.trim() ? `Location: ${location.trim()}` : null,
    website.trim() ? `Website: ${website.trim()}` : null,
    twitterHandle.trim() ? `X/Twitter: @${twitterHandle.trim().replace(/^@/, "")}` : null,
  ].filter((l): l is string => Boolean(l));

  return `You write short "About the Author" paragraphs for the back cover of a paperback and the KDP author bio field.

## Author
- Name on the cover: ${byline}
- Legal / full name (context only â€” use the by-line in the text): ${fullName || "unknown"}
${profileLines.length > 0 ? profileLines.map((l) => `- ${l}`).join("\n") : "- No profile bio on file."}

## This book
- Title: ${bookTitle}
- Genre: ${genre || "General"}
- Tone: ${tone || "Not specified"}

## Brief
${briefContext.trim() || "Infer from the title and genre only."}

## Rules
- Write ONE paragraph, third person, 60â€“110 words.
- Lead with the author's name as it appears on the cover (${byline}).
- If an existing bio is provided, honour its factual claims â€” do NOT invent new credentials, awards, publications, or biographical facts. You MAY rephrase for tone and tighten length.
- If no bio is provided, keep it grounded: describe the author's interests as a writer of this book's genre/tone, without inventing specific degrees, jobs, cities, or family details.
- Optional closing line: where to find the author online (website / X handle) â€” ONLY if supplied above.
- No markdown, no headings, no quotes, no emojis, no first person, no "the author" filler phrasing once the name has been introduced.

Respond with the paragraph only â€” plain prose, one paragraph, nothing else.`;
}

/** KDP-style title, subtitle, author positioning from manuscript context. */
export function getBookMetadataPrompt(
  title: string,
  genre: string,
  tone: string,
  briefContext: string,
): string {
  return `You help indie authors polish Amazon KDP listing metadata.

Current working title: ${title}
Genre: ${genre || "General"}
Tone: ${tone || "Not specified"}

## Book context
${briefContext.trim() || "Infer from title and genre only."}

Return ONLY a JSON object wrapped in <METADATA>...</METADATA> with exactly these string fields:
- "title": compelling retail title (may refine the working title; max ~120 chars)
- "subtitle": optional subtitle or empty string if none fits
- "author_tagline": one short line for "from the author ofâ€¦" style positioning (can be a theme hook, not a real prior book unless implied in context)

No other keys. Valid JSON inside the tags only.`;
}

/**
 * Rewrite a selected passage following a free-form author instruction. The
 * instruction is inserted verbatim from the client; the caller is responsible
 * for sanitising and length-capping it.
 */
export function getChapterRewriteSystemPrompt(
  genre: string | null,
  tone: string | null,
): string {
  return `You are a skilled line editor. Rewrite the selected passage per the author's instruction below. Stay consistent with genre (${genre ?? "general"}) and tone (${tone ?? "unspecified"}). Preserve plot, characters, and factual content unless the instruction explicitly changes them. Return ONLY the rewritten passage â€” no preamble, no quotes, no commentary.`;
}

/** Shorten / tighten a selected passage without losing meaning or voice. */
export function getChapterShortenSystemPrompt(
  genre: string | null,
  tone: string | null,
): string {
  return `You are a skilled editor. Tighten the selected passage by roughly 25â€“35% â€” cut filler words, compress redundant phrases, merge short sentences when it improves rhythm. Preserve meaning, voice, and the author's idiom. Stay consistent with genre (${genre ?? "general"}) and tone (${tone ?? "unspecified"}). Return ONLY the shortened passage â€” no preamble or quotes.`;
}

/** Proofread: grammar/spelling/typography only, zero stylistic change. */
export function getChapterProofreadSystemPrompt(): string {
  return `You are a careful proofreader. Fix grammar, spelling, punctuation, capitalisation, and obvious typographic mistakes in the selected passage. Do NOT rephrase sentences, change voice, restructure paragraphs, or add/remove content. Keep the author's wording whenever it is correct. Return ONLY the corrected passage â€” no preamble, no quotes, no list of changes.`;
}

/** Continue-writing: draft 1â€“3 new paragraphs from where the chapter ends. */
export function getChapterContinueSystemPrompt(
  chapterNumber: number,
  chapterTitle: string,
  genre: string | null,
  tone: string | null,
  targetWords: number,
): string {
  return `You are the author continuing Chapter ${chapterNumber}: ${chapterTitle}. Draft the NEXT 1â€“3 paragraphs (roughly 150â€“400 words) picking up exactly where the current chapter text ends. Match the existing voice, tense, and POV. Advance the scene naturally; do not restart the chapter, do not summarise earlier events, do not include meta commentary. Stay consistent with genre (${genre ?? "general"}), tone (${tone ?? "unspecified"}), and the chapter's overall target of ~${targetWords} words. Return ONLY the new paragraphs â€” no preamble, no quotes.`;
}

/** Character bible JSON for continuity across chapters (fiction vs nonfiction). */
export function getCharacterBiblePromptForBookType(bookType: string): string {
  const isNonfiction = bookType === "nonfiction";
  const castLine = isNonfiction
    ? "For nonfiction, focus on the authorial persona, reader avatar, recurring metaphors, and any 'characters' (case studies, historical figures) that must stay consistent."
    : "For fiction, include protagonists, antagonists, supporting cast, and setting anchors with voice, motivation, and relationship notes.";

  return `You are a series continuity editor. ${castLine}

Return ONLY valid JSON matching this shape:
{
  "characters": [
    {
      "name": "string (required)",
      "role": "string optional",
      "physical_description": "string optional",
      "voice_and_speech": "string optional",
      "motivation_or_wound": "string optional",
      "relationships": "string optional"
    }
  ],
  "setting_anchors": "string optional â€” time, place, world rules",
  "continuity_rules": "string optional â€” things writers must not contradict"
}

Include at least one character entry. Be concrete and useful for drafting chapters; avoid generic placeholders.`;
}
~~~

## lib/seo/constants.ts

~~~ts
export const SITE_DESCRIPTION =
  "Turn your idea into a complete, publishable book with AI. Write, edit, generate covers, and publish to Amazon KDP.";
~~~

## lib/seo/site-url.ts

~~~ts
/** Canonical site origin for metadata, sitemap, and JSON-LD. */
export function siteUrlString(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return "http://localhost:3010";
}

export function metadataBaseUrl(): URL {
  return new URL(siteUrlString());
}
~~~

## lib/stripe/client.ts

~~~ts
import Stripe from "stripe";

/** Lazily constructed Stripe SDK client (singleton for the Node process). */
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripe) {
    stripe = new Stripe(key, {
      typescript: true,
    });
  }
  return stripe;
}
~~~

## lib/subscription/limits.ts

~~~ts
/** Free plan: max books per user (dashboard enforcement). */
export const FREE_BOOK_LIMIT = 3;

/** Free plan: max chapters per book before generation is blocked (matches generate-chapter API). */
export const FREE_MAX_CHAPTERS_PER_BOOK = 10;

/** First chapter number that requires Pro (11+). */
export const FREE_FIRST_LOCKED_CHAPTER_NUMBER = FREE_MAX_CHAPTERS_PER_BOOK + 1;
~~~

## lib/supabase/admin.ts

~~~ts
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Service-role client (bypasses RLS). Use only for trusted server tasks such as Stripe webhooks.
 * User-facing API routes must use the session-scoped `createClient` from `@/lib/supabase/server`.
 * Do not import from client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
~~~

## lib/supabase/client.ts

~~~ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/** Raw browser client from @supabase/ssr (structural typing). */
export type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

/**
 * Browser Supabase client. Uses @supabase/ssr singleton + cookie storage (do not wrap in a
 * second module-level cache â€” that kept a stale client after sign-out).
 */
export function createClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient<Database>(url, anonKey) as unknown as SupabaseClient<Database>;
}
~~~

## lib/supabase/ensure-profile-row.ts

~~~ts
import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Upserts `public.profiles` for the given auth user (id + email).
 * Used after sign-in and from dashboard layout when the trigger/backfill never ran.
 */
export async function ensureProfileRowForUser(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = (user.email ?? "").trim();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: email.length > 0 ? email : `${user.id}@users.local`,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
~~~

## lib/supabase/middleware.ts

~~~ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database.types";

/**
 * Refreshes the Supabase session from cookies and returns the updated response + user.
 * Used by root `middleware.ts` for session rotation and route protection.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { response, user: null };
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user: user ?? null };
}
~~~

## lib/supabase/select-columns.ts

~~~ts
/** Shared explicit `.select()` lists to keep payloads small and stable. */

export const BOOK_ROW_COLUMNS =
  "id, user_id, title, book_type, genre, target_audience, tone, raw_idea, refined_idea, character_bible, idea_conversation, status, cover_prompt, cover_url, kdp_instructions, word_count, chapter_count, created_at, updated_at" as const;

export const CHAPTER_ROW_COLUMNS =
  "id, book_id, chapter_number, title, outline_summary, content, word_count, status, generation_count, created_at, updated_at" as const;

export const OUTLINE_ROW_COLUMNS =
  "id, book_id, sections, approved, created_at, updated_at" as const;
~~~

## lib/supabase/server.ts

~~~ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

async function createServerSupabase() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* Called from a Server Component where cookies are read-only */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* Called from a Server Component where cookies are read-only */
        }
      },
    },
  });
}

/**
 * SSR client shape from @supabase/ssr (structural typing).
 * Prefer {@link createClient} return type for application code.
 */
export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabase>>;

/**
 * Server Supabase client bound to the current request cookies (session).
 * Cast to `SupabaseClient<Database>` so table CRUD is fully typed.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const client = await createServerSupabase();
  return client as unknown as SupabaseClient<Database>;
}
~~~

## lib/ui/responsive-modal.ts

~~~ts
import { cn } from "@/lib/utils/cn";

/** Full-viewport flex shell: mobile bottom sheet, desktop centered dialog. */
export function responsiveModalRoot(className?: string) {
  return cn(
    "fixed inset-0 flex max-md:items-end md:items-center max-md:justify-stretch md:justify-center max-md:p-0 md:p-4",
    className,
  );
}

export function responsiveModalBackdrop() {
  return "absolute inset-0 bg-black/70 max-md:backdrop-blur-[1px]";
}

/** Scrollable panel: near full-screen on mobile (bottom sheet), card on md+. */
export function responsiveModalPanel(className?: string) {
  return cn(
    "relative z-10 w-full overflow-y-auto border border-border bg-card shadow-2xl",
    "max-md:max-h-[100dvh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:border-t",
    "md:max-h-[min(90vh,900px)] md:rounded-xl",
    className,
  );
}
~~~

## lib/utils/analytics.ts

~~~ts
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export const BOOK_EVENT_TYPES = [
  "book_created",
  "idea_refined",
  "outline_approved",
  "chapter_generated",
  "chapter_approved",
  "cover_generated",
  "book_compiled",
  "book_downloaded",
  "kdp_pack_downloaded",
  "upgrade_clicked",
  "subscription_started",
] as const;

export type BookEventType = (typeof BOOK_EVENT_TYPES)[number];

function isBookEventType(value: string): value is BookEventType {
  return (BOOK_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Inserts a row into `book_events` using the current session (RLS).
 * Verifies `userId` matches the signed-in user to avoid spoofing.
 */
export async function trackEvent(
  userId: string,
  eventType: BookEventType,
  bookId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  if (!isBookEventType(eventType)) {
    return;
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return;
    }

    const meta = (metadata && typeof metadata === "object" ? metadata : {}) as Record<
      string,
      unknown
    >;

    await supabase.from("book_events").insert({
      user_id: userId,
      book_id: bookId ?? null,
      event_type: eventType,
      metadata: meta as Json,
    });
  } catch {
    /* analytics must never break primary flows */
  }
}

/** Service-role insert (e.g. Stripe webhooks). Bypasses RLS. */
export async function trackEventAdmin(
  userId: string,
  eventType: BookEventType,
  bookId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  if (!isBookEventType(eventType)) {
    return;
  }
  try {
    const admin = createAdminClient();
    const meta = (metadata && typeof metadata === "object" ? metadata : {}) as Record<
      string,
      unknown
    >;
    await admin.from("book_events").insert({
      user_id: userId,
      book_id: bookId ?? null,
      event_type: eventType,
      metadata: meta as Json,
    });
  } catch {
    /* non-blocking */
  }
}
~~~

## lib/utils/cn.ts

~~~ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
~~~

## lib/utils/env.ts

~~~ts
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
  NEXT_PUBLIC_APP_URL: z.preprocess(
    emptyToUndefined,
    z.string().min(1, "NEXT_PUBLIC_APP_URL is required").url(),
  ),
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
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.errors
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Environment validation failed â€” ${details}`);
  }
  cachedEnv = parsed.data;
  return parsed.data;
}

/** Optional explicit check (e.g. scripts). App validates via `middleware.ts` on first request. */
export function validateServerEnv(): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  getServerEnv();
}
~~~

## lib/utils/errors.ts

~~~ts
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

/** Log full error server-side; return nothing sensitive. */
export function logServerError(context: string, err: unknown): void {
  const detail = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error(`[${context}]`, detail);
}
~~~

## lib/utils/format.ts

~~~ts
import { format as formatDateFns, type Locale } from "date-fns";

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

/**
 * e.g. 12400 â†’ "12,400 words"
 */
export function formatWordCount(
  count: number,
  options?: { singular?: string; plural?: string },
): string {
  const plural = options?.plural ?? "words";
  const singular = options?.singular ?? "word";
  const label = count === 1 ? singular : plural;
  const formatted = Math.max(0, Math.floor(count)).toLocaleString("en-US");
  return `${formatted} ${label}`;
}

/**
 * Locale-aware date string (default pattern: Apr 19, 2026).
 */
export function formatDate(
  date: Date | string | number,
  pattern = "PP",
  locale?: Locale,
): string {
  return formatDateFns(toDate(date), pattern, locale ? { locale } : undefined);
}

/**
 * Shorten long strings with an ellipsis; does not break on words unless trim is used.
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis = "â€¦",
): string {
  if (maxLength <= 0) {
    return ellipsis.slice(0, maxLength) || "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  const budget = Math.max(0, maxLength - ellipsis.length);
  const slice = text.slice(0, budget).trimEnd();
  return `${slice}${ellipsis}`;
}
~~~

## lib/utils/rate-limit.ts

~~~ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// When Upstash isn't configured (e.g. local dev without Redis), we skip
// distributed rate limiting and allow the request. This prevents a missing
// env var from taking down every AI route with `TypeError: Failed to parse
// URL from /pipeline`.
const rateLimitingEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

let warnedMissingEnv = false;
if (!rateLimitingEnabled && process.env.NODE_ENV !== "test") {
  // Warn once at module init so the reason is obvious in dev logs.
  if (!warnedMissingEnv) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
        "Rate limiting is DISABLED for this process.",
    );
    warnedMissingEnv = true;
  }
}

const redis = rateLimitingEnabled
  ? new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! })
  : null;

type RouteConfig = { tokens: number; window: "1 h"; prefix: string };

const ROUTE_CONFIG = {
  "refine-idea": { tokens: 30, window: "1 h", prefix: "rl:refine-idea" },
  "generate-chapter": { tokens: 20, window: "1 h", prefix: "rl:generate-chapter" },
  "generate-cover": { tokens: 10, window: "1 h", prefix: "rl:generate-cover" },
  "generate-book-metadata": {
    tokens: 20,
    window: "1 h",
    prefix: "rl:generate-book-metadata",
  },
  "generate-back-cover": {
    tokens: 20,
    window: "1 h",
    prefix: "rl:generate-back-cover",
  },
  "generate-about-author": {
    tokens: 20,
    window: "1 h",
    prefix: "rl:generate-about-author",
  },
  "generate-subtitle": {
    tokens: 40,
    window: "1 h",
    prefix: "rl:generate-subtitle",
  },
} satisfies Record<string, RouteConfig>;

const limiters: Record<string, Ratelimit> | null = redis
  ? Object.fromEntries(
      Object.entries(ROUTE_CONFIG).map(([key, cfg]) => [
        key,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
          prefix: cfg.prefix,
        }),
      ]),
    )
  : null;

export type RateLimitRouteKey = keyof typeof ROUTE_CONFIG;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export async function checkRateLimit(
  userId: string,
  route: RateLimitRouteKey,
): Promise<RateLimitResult> {
  // No Upstash configured: skip the check entirely.
  if (!limiters) {
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }

  try {
    const { success, remaining, reset } = await limiters[route]!.limit(userId);
    return {
      allowed: success,
      remaining,
      resetAt: new Date(reset),
    };
  } catch (err) {
    // Fail-open on transient Redis/network errors so a Redis blip doesn't
    // take down AI generation. The upstream provider (OpenAI/Anthropic) is
    // the ultimate rate limit backstop.
    console.error("[rate-limit] Redis check failed; allowing request.", err);
    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}
~~~

## lib/utils/sanitize.ts

~~~ts
/**
 * Remove HTML tags and obvious HTML-like fragments from free-form user text
 * before sending to models or storing from API bodies.
 */
export function sanitizeText(input: string): string {
  if (!input) return input;
  let out = input.replace(
    /<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi,
    "",
  );
  out = out.replace(/<\/(?:script|style)[^>]*>/gi, "");
  out = out.replace(/<[^>]+>/g, "");
  return out.replace(/\u0000/g, "").trim();
}
~~~

## lib/utils/schemas.ts

~~~ts
import { z } from "zod";

export const RefinementConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(32_000),
});

/** POST /api/ai/refine-idea */
export const RefinementRequestSchema = z.object({
  bookId: z.string().uuid(),
  messages: z.array(RefinementConversationMessageSchema).max(120),
  userMessage: z.string().min(1).max(32_000),
});

/** POST /api/ai/generate-outline */
export const OutlineRequestSchema = z.object({
  bookId: z.string().uuid(),
  rawIdea: z.string().max(50_000).optional(),
  refinedIdeaOverride: z.string().max(50_000).optional(),
  conversation: z.array(RefinementConversationMessageSchema).max(120).optional(),
});

/** POST /api/ai/generate-chapter */
export const ChapterRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
});

/** POST /api/ai/generate-cover */
export const CoverRequestSchema = z.object({
  bookId: z.string().uuid(),
  customPrompt: z.string().min(1).max(4000).optional(),
});

/** POST /api/ai/generate-book-metadata */
export const BookMetadataRequestSchema = z.object({
  bookId: z.string().uuid(),
});

/** POST /api/ai/generate-subtitle â€” brief fields live in client state only. */
export const SubtitleRequestSchema = z.object({
  bookId: z.string().uuid(),
  brief: z.object({
    title: z.string().min(1).max(300),
    genre: z.string().max(200).optional(),
    tone: z.string().max(400).optional(),
    audience: z.string().max(400).optional(),
    premise: z.string().max(4_000).optional(),
    themes: z.string().max(600).optional(),
  }),
});

/** POST /api/ai/generate-back-cover */
export const BackCoverRequestSchema = z.object({
  bookId: z.string().uuid(),
});

/** POST /api/ai/generate-about-author */
export const AboutAuthorRequestSchema = z.object({
  bookId: z.string().uuid(),
});

/** Supported book trim sizes for DOCX export. */
export const TrimSizeSchema = z.enum([
  "us-letter",
  "us-trade",
  "digest",
  "executive",
  "a4",
  "a5",
  "pocket",
]);
export type TrimSizeId = z.infer<typeof TrimSizeSchema>;

/** POST /api/compile-book */
export const CompileRequestSchema = z.object({
  bookId: z.string().uuid(),
  trimSize: TrimSizeSchema.optional(),
});

/** POST /api/export-kdp-pack */
export const KdpPackRequestSchema = z.object({
  bookId: z.string().uuid(),
});

/** POST /api/ai/expand-outline */
export const ExpandOutlineRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
  // Optional author direction that steers the outline expansion
  // (e.g. "focus more on the antagonist's motivations").
  prompt: z.string().max(2_000).optional(),
});

/** POST /api/ai/chapter-assist */
export const ChapterAssistRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("expand"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
    // Optional author instruction that steers the expansion (e.g.
    // "add a vivid sensory description of the storm"). Kept short so prompts
    // stay focused and predictable.
    prompt: z.string().max(2_000).optional(),
  }),
  z.object({
    action: z.literal("tone"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
    tone: z.enum(["formal", "casual", "dramatic"]),
  }),
  z.object({
    action: z.literal("rewrite"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
    // Required for rewrite: free-form direction ("make this more tense").
    prompt: z.string().min(1).max(2_000),
  }),
  z.object({
    action: z.literal("shorten"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
  }),
  z.object({
    action: z.literal("proofread"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
  }),
  z.object({
    action: z.literal("continue"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
  }),
]);
~~~

## middleware.ts

~~~ts
import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { getServerEnv } from "@/lib/utils/env";

let serverEnvChecked = false;

function ensureServerEnvOnce(): void {
  if (serverEnvChecked) {
    return;
  }
  serverEnvChecked = true;
  if (process.env.NODE_ENV === "test") {
    return;
  }
  getServerEnv();
}

function copySessionCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

export async function middleware(request: NextRequest) {
  ensureServerEnvOnce();
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile");

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${request.nextUrl.search}`;
    if (nextPath !== "/dashboard" && nextPath !== "/login") {
      loginUrl.searchParams.set("next", nextPath);
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    copySessionCookies(response, redirectResponse);
    return redirectResponse;
  }

  /**
   * Logged-in users normally skip auth pages. When `recover=1`, allow them to stay so they can
   * sign out â€” otherwise dashboard layout redirects here (no profile row) and middleware would
   * send them back to /dashboard â†’ infinite redirect / blank RedirectErrorBoundary.
   */
  const authRecover = request.nextUrl.searchParams.get("recover") === "1";
  if (user && (pathname === "/login" || pathname === "/signup") && !authRecover) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    copySessionCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

/**
 * Skip all `/_next/*` (chunks, CSS, HMR, RSC data) and common static paths â€” but still run on
 * `/api/*` so Supabase can refresh the session cookie before server handlers.
 * Excluding only `_next/static` + `_next/image` still ran middleware on `/_next/chunks/*`,
 * which can cause 404/unstyled pages in dev (Windows / multiple Node processes).
 */
export const config = {
  matcher: [
    "/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
~~~

## next.config.mjs

~~~js
/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname = "localhost";
let supabaseOrigin = "";
let supabaseWsOrigin = "";
try {
  if (supabaseUrl) {
    const u = new URL(supabaseUrl);
    supabaseHostname = u.hostname;
    supabaseOrigin = u.origin;
    supabaseWsOrigin = `wss://${u.host}`;
  }
} catch {
  /* keep defaults */
}

const isDev = process.env.NODE_ENV === "development";

function contentSecurityPolicy() {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com";

  const connectParts = [
    "'self'",
    supabaseOrigin,
    supabaseWsOrigin,
    "https://api.openai.com",
    "https://api.stripe.com",
    "https://r.stripe.com",
    "https://m.stripe.com",
    "https://m.stripe.network",
    "https://*.stripe.com",
  ].filter(Boolean);

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectParts.join(" ")}`,
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://hooks.stripe.com",
  ].join("; ");
}

const nextConfig = {
  /** Dev-only: avoid corrupted webpack filesystem cache on Windows (e.g. paths with spaces), which can yield unstyled pages / missing `/_next/static` chunks. */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    // CSP is for production; in dev it can interact badly with HMR/chunk loading on Windows.
    if (isDev) {
      return [];
    }
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
~~~

## next-env.d.ts

~~~ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
~~~

## package.json

~~~json
{
  "name": "chapterai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "dev:clean": "node -e \"try{require('fs').rmSync('.next',{recursive:true,force:true})}catch(e){}\" && next dev -p 3000",
    "dev:turbo": "next dev --turbo -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@supabase/ssr": "^0.3.0",
    "@supabase/supabase-js": "^2.43.0",
    "@tiptap/extension-bubble-menu": "^2.27.2",
    "@tiptap/extension-link": "^2.27.2",
    "@tiptap/extension-underline": "^2.27.2",
    "@tiptap/react": "^2.4.0",
    "@tiptap/starter-kit": "^2.4.0",
    "@upstash/ratelimit": "^2.0.8",
    "@upstash/redis": "^1.37.0",
    "ai": "^3.2.0",
    "canvas-confetti": "^1.9.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.6.0",
    "docx": "^8.5.0",
    "lucide-react": "^0.400.0",
    "marked": "^18.0.2",
    "next": "14.2.0",
    "openai": "^4.52.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.52.0",
    "sonner": "^1.5.0",
    "stripe": "^16.0.0",
    "tailwind-merge": "^2.4.0",
    "turndown": "^7.2.4",
    "zod": "^3.23.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^20.12.7",
    "@types/react": "^18.2.79",
    "@types/react-dom": "^18.2.25",
    "@types/turndown": "^5.0.6",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.4.5"
  }
}
~~~

## postcss.config.js

~~~js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
~~~

## scripts/bundle-for-review.mjs

~~~js
/**
 * Writes all review-relevant source into one UTF-8 text file at repo root.
 * Usage: node scripts/bundle-for-review.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "code-review-bundle.txt");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "dist",
  "build",
]);

const EXT_ALLOW = new Set([
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".js",
  ".css",
  ".sql",
  ".json",
]);

const FILE_ALLOW = new Set(["package.json", "tsconfig.json", ".eslintrc.json"]);

const SKIP_FILE_NAMES = new Set([
  "package-lock.json",
  "code-review-bundle.txt",
]);

function shouldIncludeFile(rel, base) {
  if (SKIP_FILE_NAMES.has(base)) return false;
  if (FILE_ALLOW.has(base)) return true;
  const ext = path.extname(base);
  return EXT_ALLOW.has(ext);
}

function walk(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR_NAMES.has(e.name)) continue;
      walk(full, acc);
    } else if (e.isFile() && shouldIncludeFile(path.relative(ROOT, full), e.name)) {
      acc.push(full);
    }
  }
}

const files = [];
walk(ROOT, files);
files.sort((a, b) => a.localeCompare(b, "en"));

const parts = [
  `# ChapterAI â€” code review bundle`,
  ``,
  `Generated: ${new Date().toISOString()}`,
  `Root: ${ROOT}`,
  `Files: ${files.length}`,
  ``,
  repeat("=", 80),
  ``,
];

function repeat(s, n) {
  return s.repeat(n);
}

for (const full of files) {
  const rel = path.relative(ROOT, full).split(path.sep).join("/");
  let body;
  try {
    body = fs.readFileSync(full, "utf8");
  } catch {
    body = `<< could not read file >>\n`;
  }
  parts.push(`FILE: ${rel}`);
  parts.push(repeat("-", 80));
  parts.push(body);
  if (!body.endsWith("\n")) parts.push("");
  parts.push("");
  parts.push(repeat("=", 80));
  parts.push("");
}

fs.writeFileSync(OUT, parts.join("\n"), "utf8");
console.log(`Wrote ${files.length} files to ${OUT}`);
console.log(`Size: ${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB`);
~~~

## stores/global-progress-store.ts

~~~ts
import { create } from "zustand";

/**
 * Top-of-page progress bar: ref-count in-flight work (API / streaming) plus optional route pulse.
 */
type GlobalProgressState = {
  inFlight: number;
  start: () => void;
  stop: () => void;
};

export const useGlobalProgressStore = create<GlobalProgressState>((set, get) => ({
  inFlight: 0,
  start: () => set({ inFlight: get().inFlight + 1 }),
  stop: () => set({ inFlight: Math.max(0, get().inFlight - 1) }),
}));
~~~

## stores/project-sidebar-store.ts

~~~ts
import { create } from "zustand";

type ProjectSidebarState = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
};

export const useProjectSidebarStore = create<ProjectSidebarState>((set) => ({
  mobileOpen: false,
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
}));
~~~

## supabase/migrations/001_create_profiles.sql

~~~sql
-- profiles: extends auth.users (ChapterAI schema)

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users (id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  books_generated INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Application profile row per auth user; subscription and Stripe metadata.';
~~~

## supabase/migrations/002_create_books.sql

~~~sql
-- books: one row per manuscript / project

CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Book',
  genre TEXT,
  target_audience TEXT,
  tone TEXT,
  raw_idea TEXT,
  refined_idea TEXT,
  idea_conversation JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'idea' CHECK (
    status IN (
      'idea',
      'refining',
      'outlining',
      'writing',
      'editing',
      'cover',
      'complete'
    )
  ),
  cover_prompt TEXT,
  cover_url TEXT,
  kdp_instructions TEXT,
  word_count INT NOT NULL DEFAULT 0,
  chapter_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX books_user_id_idx ON public.books (user_id);
CREATE INDEX books_status_idx ON public.books (status);

COMMENT ON TABLE public.books IS 'Book projects: idea, outline, chapters, cover, export metadata.';
~~~

## supabase/migrations/003_create_outlines.sql

~~~sql
-- outlines: one outline per book (sections JSON matches app types)

CREATE TABLE public.outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL UNIQUE REFERENCES public.books (id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]',
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX outlines_book_id_idx ON public.outlines (book_id);

COMMENT ON TABLE public.outlines IS 'Structured outline; sections is JSON array of outline segments / chapters.';
~~~

## supabase/migrations/004_create_chapters.sql

~~~sql
-- chapters: one row per chapter; unique (book_id, chapter_number)

CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books (id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  outline_summary TEXT,
  content TEXT,
  word_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'generating', 'draft', 'edited', 'approved')
  ),
  generation_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, chapter_number)
);

CREATE INDEX chapters_book_id_idx ON public.chapters (book_id);
CREATE INDEX chapters_status_idx ON public.chapters (status);

COMMENT ON TABLE public.chapters IS 'Generated/edited chapter bodies and workflow status.';
~~~

## supabase/migrations/005_create_api_usage.sql

~~~sql
-- api_usage: token / model logging per authenticated user (server routes)

CREATE TABLE public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  tokens_used INT NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX api_usage_user_id_created_at_idx ON public.api_usage (user_id, created_at DESC);

COMMENT ON TABLE public.api_usage IS 'OpenAI (and other) API usage rows for billing and monitoring.';
~~~

## supabase/migrations/006_enable_rls.sql

~~~sql
-- Row Level Security: profiles, books, outlines, chapters, api_usage

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users own their profile"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id);

-- books
CREATE POLICY "Users own their books"
  ON public.books
  FOR ALL
  USING (auth.uid() = user_id);

-- outlines (via owning book)
CREATE POLICY "Users own their outlines"
  ON public.outlines
  FOR ALL
  USING (
    book_id IN (SELECT b.id FROM public.books b WHERE b.user_id = auth.uid())
  );

-- chapters (via owning book)
CREATE POLICY "Users own their chapters"
  ON public.chapters
  FOR ALL
  USING (
    book_id IN (SELECT b.id FROM public.books b WHERE b.user_id = auth.uid())
  );

-- api_usage: read and append own rows only (typical server insert with user JWT)
CREATE POLICY "Users read own api_usage"
  ON public.api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own api_usage"
  ON public.api_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
~~~

## supabase/migrations/007_create_triggers.sql

~~~sql
-- Auto-create public.profiles when a new auth.users row is inserted

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Syncs auth.users signups into public.profiles.';
~~~

## supabase/migrations/008_enable_realtime.sql

~~~sql
-- Supabase Realtime: books and chapters (dashboard + editor live updates)

ALTER TABLE public.books REPLICA IDENTITY FULL;
ALTER TABLE public.chapters REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chapters;
~~~

## supabase/migrations/009_create_storage.sql

~~~sql
-- Storage buckets: public cover art, private compiled exports
-- Object paths MUST start with the owning user id, e.g. "{user_id}/covers/{book_id}.png"

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- covers: world-readable; only the owning user can write/update/delete under their prefix
CREATE POLICY "Cover images are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Users upload covers under own prefix"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users update own cover objects"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'covers'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users delete own cover objects"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- exports: private bucket; only owning user can read/write objects under their prefix
CREATE POLICY "Users read own export files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users upload exports under own prefix"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exports'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users update own export files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'exports'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users delete own export files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
~~~

## supabase/migrations/010_fix_profiles_trigger_rls.sql

~~~sql
-- Fix profile rows not appearing after signup:
-- 1) Harden handle_new_user so INSERT is not blocked by RLS on profiles.
-- 2) Backfill profiles for any auth.users missing a row (e.g. trigger was absent).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- RLS can still apply to SECURITY DEFINER in some configurations; disable for this insert.
  SET LOCAL row_security = off;
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Syncs auth.users signups into public.profiles (RLS-safe insert).';

-- Backfill: users who signed up while trigger was missing or failing
INSERT INTO public.profiles (id, email)
SELECT u.id, COALESCE(u.email::text, '')
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL;
~~~

## supabase/migrations/011_add_onboarding_flag.sql

~~~sql
-- First-run product tour: dismissed from dashboard OnboardingModal
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.has_seen_onboarding IS 'User has completed or skipped the ChapterAI onboarding tour.';
~~~

## supabase/migrations/012_storage_avatars.sql

~~~sql
-- Public avatars bucket: paths "{user_id}/avatar.{ext}"

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload avatars under own prefix"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users update own avatar objects"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users delete own avatar objects"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
~~~

## supabase/migrations/013_create_book_events.sql

~~~sql
-- Analytics: append-only events per user (011 was onboarding; this is PROMPT 25).

CREATE TABLE public.book_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books (id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX book_events_user_id_idx ON public.book_events (user_id);
CREATE INDEX book_events_book_id_idx ON public.book_events (book_id);
CREATE INDEX book_events_created_at_idx ON public.book_events (created_at DESC);
CREATE INDEX book_events_type_idx ON public.book_events (event_type);

ALTER TABLE public.book_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own book_events"
  ON public.book_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own book_events"
  ON public.book_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.book_events IS 'Product analytics: keyed events for dashboards and admin reporting.';
~~~

## supabase/migrations/014_add_character_bible.sql

~~~sql
-- Canonical character / continuity facts for long-form chapter generation

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS character_bible JSONB;

COMMENT ON COLUMN public.books.character_bible IS
  'Structured character bible and continuity anchors; populated when the outline is approved.';
~~~

## supabase/migrations/015_book_type.sql

~~~sql
-- Fiction vs non-fiction: drives idea, outline, and chapter prompts

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS book_type TEXT NOT NULL DEFAULT 'fiction'
  CHECK (book_type IN ('fiction', 'non_fiction'));

COMMENT ON COLUMN public.books.book_type IS
  'fiction: novel-style prompts; non_fiction: memoir, how-to, business, etc.';
~~~

## supabase/migrations/016_book_metadata.sql

~~~sql
-- Adds editable publishing metadata displayed on the cover + export screens.
-- All fields are optional; existing rows stay valid.

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS author_display_name TEXT,
ADD COLUMN IF NOT EXISTS back_cover_copy TEXT;

COMMENT ON COLUMN public.books.subtitle IS
  'Optional subtitle shown under the title on the cover / export.';
COMMENT ON COLUMN public.books.author_display_name IS
  'Pen-name / by-line as the author wants it printed on the cover.';
COMMENT ON COLUMN public.books.back_cover_copy IS
  'AI-assisted, user-editable back cover blurb (150â€“200 words).';
~~~

## supabase/migrations/017_payment_failed.sql

~~~sql
-- Adds fields for surfacing Stripe `invoice.payment_failed` events.
-- `payment_failed_at`: last time a renewal charge failed (NULL = healthy).
-- `payment_failure_reason`: human-readable reason from Stripe (for banner detail).
-- Cleared when a subsequent successful invoice or subscription.updated arrives.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;

COMMENT ON COLUMN public.profiles.payment_failed_at IS
  'Set by the Stripe webhook when invoice.payment_failed fires. Cleared on invoice.payment_succeeded.';
COMMENT ON COLUMN public.profiles.payment_failure_reason IS
  'Short human-readable reason (e.g. "card_declined") for the most recent failed charge.';
~~~

## supabase/migrations/018_profiles_rls_explicit.sql

~~~sql
-- Replace blanket FOR ALL policy with explicit SELECT / INSERT / UPDATE / DELETE policies.
-- Some Postgres versions treat ALL + USING alone ambiguously for INSERT; upsert needs a clear WITH CHECK.
--
-- Idempotent: safe to re-run. Each policy is dropped (if present) before being recreated, so
-- repeated applications (or partial previous runs) don't fail with `42710 policy ... already exists`.

DROP POLICY IF EXISTS "Users own their profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);
~~~

## supabase/migrations/019_chapter_author_notes.sql

~~~sql
-- Per-chapter steering notes the author can write to influence AI
-- regeneration without rewriting the outline itself. Persisted so notes
-- survive reloads and are applied on every regeneration automatically.

ALTER TABLE public.chapters
ADD COLUMN IF NOT EXISTS author_notes TEXT;

COMMENT ON COLUMN public.chapters.author_notes IS
  'Optional freeform steering instructions passed into the chapter-generation prompt.';
~~~

## supabase/migrations/020_profile_author_fields.sql

~~~sql
-- Extended profile / author fields rendered on /profile.
-- All optional; users can fill them in from the editable Profile page.
--
-- Idempotent: constraints are dropped (if present) before being re-added so this
-- migration can be safely re-applied after partial failures.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS pen_name TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT;

-- Length guards matched to what the UI enforces (keeps DB defensible even if
-- the client is bypassed). NULL is always allowed.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pen_name_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_website_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_location_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_twitter_handle_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 600),
  ADD CONSTRAINT profiles_pen_name_length CHECK (pen_name IS NULL OR char_length(pen_name) <= 120),
  ADD CONSTRAINT profiles_website_length CHECK (website IS NULL OR char_length(website) <= 200),
  ADD CONSTRAINT profiles_location_length CHECK (location IS NULL OR char_length(location) <= 120),
  ADD CONSTRAINT profiles_twitter_handle_length CHECK (
    twitter_handle IS NULL OR char_length(twitter_handle) <= 32
  );

COMMENT ON COLUMN public.profiles.bio IS 'Short author biography shown on the profile page.';
COMMENT ON COLUMN public.profiles.pen_name IS 'Author / pen name used on generated books (overrides full_name when set).';
COMMENT ON COLUMN public.profiles.website IS 'Optional personal / author website URL.';
COMMENT ON COLUMN public.profiles.location IS 'Optional location string (e.g. "Brooklyn, NY").';
COMMENT ON COLUMN public.profiles.twitter_handle IS 'Optional X / Twitter handle without the leading @.';
~~~

## supabase/migrations/021_book_about_author.sql

~~~sql
-- Per-book "About the Author" blurb rendered on the cover-prep screen and
-- the paperback back cover. Optional; can be pre-filled from profiles.bio
-- by the UI, but stored per-book so each title can have its own bio.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS about_author TEXT;

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_about_author_length;

ALTER TABLE public.books
  ADD CONSTRAINT books_about_author_length CHECK (
    about_author IS NULL OR char_length(about_author) <= 1500
  );

COMMENT ON COLUMN public.books.about_author IS
  'Optional per-book "About the Author" blurb shown on the paperback back cover / KDP listing. Defaults to profiles.bio in the UI when unset.';
~~~

## supabase/migrations/021_chapter_word_target.sql

~~~sql
-- Optional per-chapter writing target. When set, the editor renders a progress
-- bar under the title and the chapter-generation prompt uses this value instead
-- of the genre-derived default.
--
-- Bounds match the UI input: 100â€“20,000 words. NULL means "fall back to the
-- genre default at generation time."

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS target_word_count INT;

ALTER TABLE public.chapters
  ADD CONSTRAINT chapters_target_word_count_range
  CHECK (target_word_count IS NULL OR (target_word_count BETWEEN 100 AND 20000));

COMMENT ON COLUMN public.chapters.target_word_count IS
  'Optional author-specified word target for this chapter (100â€“20000). NULL means use the genre-derived default.';
~~~

## tailwind.config.js

~~~js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#C9A84C",
        editorial: {
          bg: "#0F1117",
          card: "#1A1E2E",
          cream: "#F0EAD6",
          muted: "#8B8FA8",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      ringOffsetColor: {
        background: "hsl(var(--background))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
~~~

## tests/components/ProgressStepper.test.tsx

~~~tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressStepper } from "@/components/book/ProgressStepper";

describe("ProgressStepper", () => {
  it("highlights the writing step when status is writing", () => {
    const { container } = render(
      <ProgressStepper currentStatus="writing" />,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current?.textContent?.trim()).toBe("4");
  });

  it("highlights the final step with a check icon when complete", () => {
    const { container } = render(
      <ProgressStepper currentStatus="complete" />,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current?.querySelector("svg")).not.toBeNull();
  });

  it("links each step to workflow URLs when bookId is set", () => {
    const { getByRole } = render(
      <ProgressStepper
        currentStatus="writing"
        bookId="book-1"
        firstChapterId="chap-1"
      />,
    );
    expect(
      getByRole("link", { name: /idea â€” go to this step/i }).getAttribute("href"),
    ).toBe("/projects/book-1/idea");
    expect(
      getByRole("link", { name: /write â€” go to this step/i }).getAttribute("href"),
    ).toBe("/projects/book-1/chapters/chap-1");
    expect(
      getByRole("link", { name: /done â€” go to this step/i }).getAttribute("href"),
    ).toBe("/projects/book-1/export");
  });

  it("sends write/edit to outline when no chapter id yet", () => {
    const { getByRole } = render(
      <ProgressStepper
        currentStatus="outlining"
        bookId="book-2"
        firstChapterId={null}
      />,
    );
    expect(
      getByRole("link", { name: /write â€” go to this step/i }).getAttribute("href"),
    ).toBe("/projects/book-2/outline");
  });
});
~~~

## tests/components/ProjectCard.test.tsx

~~~tsx
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { ProjectCard } from "@/components/book/ProjectCard";
import type { DashboardBook } from "@/types/book.types";

vi.mock("next/link", () => {
  function MockLink(
    props: PropsWithChildren<
      { href: string; prefetch?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>
    >,
  ) {
    const { children, href, prefetch: _prefetch, ...rest } = props;
    return (
      <a
        href={href}
        {...rest}
        onClick={(event) => {
          event.preventDefault();
          rest.onClick?.(event);
        }}
      >
        {children}
      </a>
    );
  }
  return { default: MockLink };
});

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/app/(dashboard)/dashboard/actions", () => ({
  deleteBookAction: vi.fn().mockResolvedValue({ ok: true }),
  renameBookAction: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const book: DashboardBook = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "My Novel",
  genre: "Science Fiction",
  status: "writing",
  word_count: 1200,
  chapter_count: 3,
  updated_at: "2026-04-19T12:00:00.000Z",
};

describe("ProjectCard", () => {
  it("renders title, genre, and status", () => {
    render(<ProjectCard book={book} />);
    screen.getByRole("heading", { level: 2, name: "My Novel" });
    screen.getByText("Science Fiction");
    screen.getByText("Writing");
  });

  it("exposes the project link and handles click", () => {
    render(<ProjectCard book={book} />);
    const link = screen.getByRole("link", { name: /my novel/i });
    expect(link.getAttribute("href")).toBe(
      "/projects/550e8400-e29b-41d4-a716-446655440000",
    );
    fireEvent.click(link);
  });

  it("opens the actions menu when the menu button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProjectCard book={book} />);
    await user.click(screen.getByRole("button", { name: /book actions/i }));
    screen.getByRole("menu");
    screen.getByRole("menuitem", { name: /rename/i });
  });
});
~~~

## tests/setup.ts

~~~ts
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
~~~

## tests/unit/compiler.test.ts

~~~ts
import { describe, expect, it } from "vitest";

import {
  buildDocxBufferFromData,
  TRIM_SIZE_OPTIONS,
  TRIM_SIZES,
} from "@/lib/docx/compiler";

describe("buildDocxBufferFromData", () => {
  it("returns a ZIP/docx payload for a basic manuscript at default (US Letter) trim size", async () => {
    const buf = await buildDocxBufferFromData(
      { title: "Unit Test Book", genre: "Speculative fiction" },
      [
        {
          chapter_number: 1,
          title: "Arrival",
          content: "## Dawn\n\nHello **world** and *italics*.",
        },
        {
          chapter_number: 2,
          title: "Departure",
          content: "> A blockquote line",
        },
      ],
      true,
    );

    expect(buf instanceof Buffer).toBe(true);
    expect(buf.length).toBeGreaterThan(1500);
    expect(buf.subarray(0, 2).toString("binary")).toBe("PK");
  });

  it("omits free-tier footer when isFreeTier is false", async () => {
    const buf = await buildDocxBufferFromData(
      { title: "Pro Export", genre: "Essay" },
      [{ chapter_number: 1, title: "Only", content: "Body" }],
      false,
    );
    expect(buf instanceof Buffer).toBe(true);
    expect(buf.toString("utf8")).not.toContain("Created with ChapterAI");
  });

  it("renders boxes, pull quotes, scene breaks, and lists without throwing", async () => {
    const rich = [
      "The city hummed beneath them.",
      "",
      "* * *",
      "",
      ">> One sentence can change everything.",
      "",
      "> [!NOTE] From the archivist",
      "> A boxed aside with multiple paragraphs.",
      ">",
      "> - bullet one",
      "> - bullet two",
      "",
      "> [!TIP] A lighter sidebar",
      "> Short and useful.",
      "",
      "> [!KEY] Takeaway",
      "> Remember this.",
      "",
      "Back to ordinary prose.",
    ].join("\n");

    const buf = await buildDocxBufferFromData(
      { title: "Rich Layout", genre: "Non-fiction" },
      [{ chapter_number: 1, title: "Opening", content: rich }],
      false,
    );
    expect(buf instanceof Buffer).toBe(true);
    expect(buf.length).toBeGreaterThan(2000);
  });

  it("supports every declared trim size", async () => {
    for (const trim of TRIM_SIZES) {
      const buf = await buildDocxBufferFromData(
        { title: `Trim ${trim}`, genre: "Fiction" },
        [
          {
            chapter_number: 1,
            title: "Only Chapter",
            content:
              "The opening sentence sets the tone.\n\n> [!SIDE] Margin\n> A small sidenote.\n\n* * *\n\nLater, the mood shifts.",
          },
        ],
        false,
        { trimSize: trim, authorName: "Test Author" },
      );
      expect(buf instanceof Buffer).toBe(true);
      expect(buf.subarray(0, 2).toString("binary")).toBe("PK");
    }
  });

  it("exposes one TRIM_SIZE_OPTION per supported trim size with width/height metadata", () => {
    expect(TRIM_SIZE_OPTIONS.length).toBe(TRIM_SIZES.length);
    for (const opt of TRIM_SIZE_OPTIONS) {
      expect(opt.widthIn).toBeGreaterThan(0);
      expect(opt.heightIn).toBeGreaterThan(0);
      expect(opt.label).toMatch(/\d/);
      expect(opt.description.length).toBeGreaterThan(10);
    }
  });
});
~~~

## tests/unit/format.test.ts

~~~ts
import { describe, expect, it } from "vitest";

import { formatDate, formatWordCount, truncateText } from "@/lib/utils/format";

describe("formatWordCount", () => {
  it("formats plural and singular labels", () => {
    expect(formatWordCount(0)).toBe("0 words");
    expect(formatWordCount(1)).toBe("1 word");
    expect(formatWordCount(12400)).toBe("12,400 words");
  });

  it("respects custom labels", () => {
    expect(
      formatWordCount(2, { singular: "page", plural: "pages" }),
    ).toBe("2 pages");
    expect(
      formatWordCount(1, { singular: "page", plural: "pages" }),
    ).toBe("1 page");
  });

  it("floors non-integer and negative counts", () => {
    expect(formatWordCount(9.7)).toBe("9 words");
    expect(formatWordCount(-3)).toBe("0 words");
  });
});

describe("formatDate", () => {
  it("formats an ISO string with default pattern", () => {
    const s = formatDate("2026-04-19T15:30:00.000Z");
    expect(s.length).toBeGreaterThan(5);
    expect(s).toMatch(/2026/);
  });

  it("accepts Date values and timestamps with explicit patterns", () => {
    expect(formatDate(new Date(2026, 3, 19), "yyyy-MM-dd")).toBe("2026-04-19");
    const ms = Date.parse("2026-04-19T12:00:00.000Z");
    expect(formatDate(ms, "yyyy-MM-dd")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("truncateText", () => {
  it("returns original text when within limit", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("truncates with ellipsis", () => {
    expect(truncateText("abcdefghij", 6, "â€¦")).toBe("abcdeâ€¦");
  });

  it("handles maxLength zero", () => {
    expect(truncateText("hello", 0)).toBe("");
  });
});
~~~

## tests/unit/prompts.test.ts

~~~ts
import { describe, expect, it } from "vitest";

import {
  getCharacterBibleSystemPrompt,
  getChapterSystemPrompt,
  getChapterSystemPromptForBookType,
  getCoverPromptSystemPrompt,
  getIdeaRefinementPromptForBookType,
  getIdeaRefinementSystemPrompt,
  getKDPInstructionsPrompt,
  getNonFictionChapterSystemPrompt,
  getNonFictionIdeaRefinementSystemPrompt,
  getNonFictionOutlineSystemPrompt,
  getOutlineSystemPrompt,
  getOutlineSystemPromptForBookType,
} from "@/lib/openai/prompts";

describe("prompt templates", () => {
  it("getIdeaRefinementSystemPrompt returns a non-empty string", () => {
    const s = getIdeaRefinementSystemPrompt();
    expect(s.length).toBeGreaterThan(200);
    expect(s).toContain("REFINED_IDEA");
    expect(s).toContain("STORY FOUNDATION");
    expect(s).toContain("ONE focused question");
  });

  it("getOutlineSystemPrompt returns JSON shape and structural rules", () => {
    const s = getOutlineSystemPrompt();
    expect(s.length).toBeGreaterThan(200);
    expect(s).toContain('"chapters"');
    expect(s).toContain("STRUCTURAL RULES");
    expect(s).toContain("tension_level");
  });

  it("getChapterSystemPrompt interpolates chapter metadata and context", () => {
    const s = getChapterSystemPrompt(
      3,
      "The River",
      4200,
      "Genre: literary fiction. Tone: warm.",
      ["Previously the hero left town.", "A storm approached."],
    );
    expect(s).toContain('Chapter 3: "The River"');
    expect(s).toContain("TARGET: 4200");
    expect(s).toContain("Genre: literary fiction");
    expect(s).toContain("SHOW DON'T TELL");
    expect(s).toContain("Prior chapter 1");
    expect(s).toContain("Previously the hero left town.");
    expect(s).toContain("Prior chapter 2");
  });

  it("getChapterSystemPrompt handles string prior summaries", () => {
    const s = getChapterSystemPrompt(1, "Open", 1000, "", "Only one prior.");
    expect(s).toContain("Only one prior.");
  });

  it("getChapterSystemPrompt adds character bible block when provided", () => {
    const s = getChapterSystemPrompt(
      2,
      "Mirror",
      2000,
      "Book title: Test",
      ["Prior beat."],
      '{"characters":[{"name":"Ava"}]}',
    );
    expect(s).toContain("Character reference (do not contradict these details)");
    expect(s).toContain('{"characters":[{"name":"Ava"}]}');
    expect(s).toContain("Prior chapter 1");
  });

  it("getCharacterBibleSystemPrompt requests JSON bible output", () => {
    const s = getCharacterBibleSystemPrompt();
    expect(s.length).toBeGreaterThan(100);
    expect(s).toContain("characters");
    expect(s).toContain("physical_description");
  });

  it("getIdeaRefinementPromptForBookType switches non-fiction copy", () => {
    const nf = getIdeaRefinementPromptForBookType("non_fiction");
    expect(nf).toContain("acquisitions editor");
    expect(getNonFictionIdeaRefinementSystemPrompt()).toContain("CORE CONCEPT");
    const fic = getIdeaRefinementPromptForBookType("fiction");
    expect(fic).toContain("developmental editor");
    expect(fic).toEqual(getIdeaRefinementSystemPrompt());
  });

  it("getOutlineSystemPromptForBookType switches outline shape hints", () => {
    expect(getOutlineSystemPromptForBookType("fiction")).toContain("tension_level");
    expect(getOutlineSystemPromptForBookType("non_fiction")).toContain("reader_takeaway");
    expect(getNonFictionOutlineSystemPrompt()).toContain("content_type");
  });

  it("getChapterSystemPromptForBookType uses non-fiction craft block", () => {
    const s = getChapterSystemPromptForBookType(
      "non_fiction",
      1,
      "Hook",
      1800,
      "Book title: X",
      [],
      null,
    );
    expect(s).toContain("NON-FICTION CRAFT RULES");
    expect(getNonFictionChapterSystemPrompt(1, "Hook", 1800, "ctx", [], "terms")).toContain(
      "Character reference",
    );
  });

  it("getCoverPromptSystemPrompt includes book fields", () => {
    const s = getCoverPromptSystemPrompt(
      "North Line",
      "Thriller",
      "A missing train.",
      "Tense",
    );
    expect(s).toContain('Title "North Line"');
    expect(s).toContain("Genre: Thriller");
    expect(s).toContain("A missing train.");
    expect(s).toContain("Tone: Tense");
  });

  it("getKDPInstructionsPrompt interpolates title and genre", () => {
    const s = getKDPInstructionsPrompt("  Sea Glass  ", "  Cozy mystery ");
    expect(s).toContain('titled "Sea Glass"');
    expect(s).toContain("Cozy mystery");
    expect(s).toContain("Sea Glass");
  });

  it("getKDPInstructionsPrompt falls back when title or genre empty", () => {
    const s = getKDPInstructionsPrompt("  ", "");
    expect(s).toContain("Untitled work");
    expect(s).toContain("General fiction");
  });
});
~~~

## tests/unit/sanitize.test.ts

~~~ts
import { describe, expect, it } from "vitest";

import { sanitizeText } from "@/lib/utils/sanitize";

describe("sanitizeText", () => {
  it("returns empty-ish input unchanged", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("strips HTML tags", () => {
    expect(sanitizeText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
    expect(sanitizeText("Before<div>inner</div>After")).toBe("BeforeinnerAfter");
  });

  it("removes script and style blocks", () => {
    expect(
      sanitizeText('<script>alert(1)</script><p>Safe</p>'),
    ).toBe("Safe");
    expect(
      sanitizeText('<style>.x{color:red}</style><span>OK</span>'),
    ).toBe("OK");
  });

  it("strips null bytes and trims", () => {
    expect(sanitizeText("  a\u0000b  ")).toBe("ab");
  });
});
~~~

## tests/unit/schemas.test.ts

~~~ts
import { describe, expect, it } from "vitest";

import {
  ChapterAssistRequestSchema,
  ChapterRequestSchema,
  CompileRequestSchema,
  CoverRequestSchema,
  KdpPackRequestSchema,
  OutlineRequestSchema,
  RefinementRequestSchema,
} from "@/lib/utils/schemas";

const BOOK_ID = "550e8400-e29b-41d4-a716-446655440000";
const CHAPTER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("Zod API request schemas", () => {
  it("RefinementRequestSchema accepts valid payloads and rejects bad UUIDs", () => {
    const ok = RefinementRequestSchema.safeParse({
      bookId: BOOK_ID,
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      userMessage: "Continue",
    });
    expect(ok.success).toBe(true);

    const badId = RefinementRequestSchema.safeParse({
      bookId: "not-a-uuid",
      messages: [{ role: "user", content: "x" }],
      userMessage: "y",
    });
    expect(badId.success).toBe(false);
  });

  it("OutlineRequestSchema accepts minimal and full payloads", () => {
    expect(
      OutlineRequestSchema.safeParse({ bookId: BOOK_ID }).success,
    ).toBe(true);
    expect(
      OutlineRequestSchema.safeParse({
        bookId: BOOK_ID,
        rawIdea: "idea",
        refinedIdeaOverride: "override",
      }).success,
    ).toBe(true);
    expect(OutlineRequestSchema.safeParse({ bookId: "x" }).success).toBe(false);
  });

  it("ChapterRequestSchema validates ids", () => {
    expect(
      ChapterRequestSchema.safeParse({ bookId: BOOK_ID, chapterId: CHAPTER_ID })
        .success,
    ).toBe(true);
    expect(
      ChapterRequestSchema.safeParse({ bookId: BOOK_ID, chapterId: "nope" })
        .success,
    ).toBe(false);
  });

  it("CoverRequestSchema allows optional customPrompt", () => {
    expect(CoverRequestSchema.safeParse({ bookId: BOOK_ID }).success).toBe(true);
    expect(
      CoverRequestSchema.safeParse({
        bookId: BOOK_ID,
        customPrompt: "A moody skyline",
      }).success,
    ).toBe(true);
    expect(
      CoverRequestSchema.safeParse({ bookId: BOOK_ID, customPrompt: "" }).success,
    ).toBe(false);
  });

  it("CompileRequestSchema requires a UUID bookId", () => {
    expect(CompileRequestSchema.safeParse({ bookId: BOOK_ID }).success).toBe(
      true,
    );
    expect(CompileRequestSchema.safeParse({ bookId: "" }).success).toBe(false);
  });

  it("KdpPackRequestSchema requires a UUID bookId", () => {
    expect(KdpPackRequestSchema.safeParse({ bookId: BOOK_ID }).success).toBe(true);
    expect(KdpPackRequestSchema.safeParse({ bookId: "x" }).success).toBe(false);
  });

  it("ChapterAssistRequestSchema discriminates on action", () => {
    const expand = ChapterAssistRequestSchema.safeParse({
      action: "expand",
      bookId: BOOK_ID,
      chapterId: CHAPTER_ID,
      selectedText: "paragraph",
    });
    expect(expand.success).toBe(true);

    const tone = ChapterAssistRequestSchema.safeParse({
      action: "tone",
      bookId: BOOK_ID,
      chapterId: CHAPTER_ID,
      selectedText: "line",
      tone: "dramatic",
    });
    expect(tone.success).toBe(true);

    const badTone = ChapterAssistRequestSchema.safeParse({
      action: "tone",
      bookId: BOOK_ID,
      chapterId: CHAPTER_ID,
      selectedText: "line",
      tone: "silly",
    });
    expect(badTone.success).toBe(false);
  });
});
~~~

## tsconfig.json

~~~json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.d.ts",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
~~~

## types/book.types.ts

~~~ts
import type { BookStatusDb, Database } from "@/types/database.types";

export enum SubscriptionTier {
  Free = "free",
  Pro = "pro",
}

export enum BookStatus {
  Idea = "idea",
  Refining = "refining",
  Outlining = "outlining",
  Writing = "writing",
  Editing = "editing",
  Cover = "cover",
  Complete = "complete",
}

export enum ChapterStatus {
  Pending = "pending",
  Generating = "generating",
  Draft = "draft",
  Edited = "edited",
  Approved = "approved",
}

/** Structured brief produced after idea refinement (AI or manual). */
export interface RefinedIdea {
  title: string;
  genre: string;
  targetAudience: string;
  premise: string;
  toneAndStyle: string;
  keyThemes: string[];
  estimatedChapters: number;
  estimatedWordCount: number;
}

/** Outline segment stored in `outlines.sections` JSONB. */
export interface OutlineSection {
  title: string;
  description: string;
  chapter_count: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/** Serialized book row for dashboard / project cards. */
export type DashboardBook = {
  id: string;
  title: string;
  genre: string | null;
  status: BookStatusDb;
  word_count: number;
  chapter_count: number;
  updated_at: string;
};

type BooksRow = Database["public"]["Tables"]["books"]["Row"];
type ChaptersRow = Database["public"]["Tables"]["chapters"]["Row"];

/** Single book with all related chapters (ordered by `chapter_number` in queries). */
export type BookWithChapters = BooksRow & {
  chapters: ChaptersRow[];
};
~~~

## types/database.types.ts

~~~ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionTierDb = "free" | "pro";

export type BookStatusDb =
  | "idea"
  | "refining"
  | "outlining"
  | "writing"
  | "editing"
  | "cover"
  | "complete";

/** Drives AI prompts (idea â†’ outline â†’ chapter). */
export type BookTypeDb = "fiction" | "non_fiction";

export type ChapterStatusDb =
  | "pending"
  | "generating"
  | "draft"
  | "edited"
  | "approved";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          pen_name: string | null;
          website: string | null;
          location: string | null;
          twitter_handle: string | null;
          stripe_customer_id: string | null;
          subscription_tier: SubscriptionTierDb;
          books_generated: number;
          has_seen_onboarding: boolean;
          payment_failed_at: string | null;
          payment_failure_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          pen_name?: string | null;
          website?: string | null;
          location?: string | null;
          twitter_handle?: string | null;
          stripe_customer_id?: string | null;
          subscription_tier?: SubscriptionTierDb;
          books_generated?: number;
          has_seen_onboarding?: boolean;
          payment_failed_at?: string | null;
          payment_failure_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          pen_name?: string | null;
          website?: string | null;
          location?: string | null;
          twitter_handle?: string | null;
          stripe_customer_id?: string | null;
          subscription_tier?: SubscriptionTierDb;
          books_generated?: number;
          has_seen_onboarding?: boolean;
          payment_failed_at?: string | null;
          payment_failure_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subtitle: string | null;
          author_display_name: string | null;
          book_type: BookTypeDb;
          genre: string | null;
          target_audience: string | null;
          tone: string | null;
          raw_idea: string | null;
          refined_idea: string | null;
          character_bible: Json | null;
          idea_conversation: Json;
          status: BookStatusDb;
          cover_prompt: string | null;
          cover_url: string | null;
          back_cover_copy: string | null;
          about_author: string | null;
          kdp_instructions: string | null;
          word_count: number;
          chapter_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          subtitle?: string | null;
          author_display_name?: string | null;
          book_type?: BookTypeDb;
          genre?: string | null;
          target_audience?: string | null;
          tone?: string | null;
          raw_idea?: string | null;
          refined_idea?: string | null;
          character_bible?: Json | null;
          idea_conversation?: Json;
          status?: BookStatusDb;
          cover_prompt?: string | null;
          cover_url?: string | null;
          back_cover_copy?: string | null;
          about_author?: string | null;
          kdp_instructions?: string | null;
          word_count?: number;
          chapter_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          subtitle?: string | null;
          author_display_name?: string | null;
          book_type?: BookTypeDb;
          genre?: string | null;
          target_audience?: string | null;
          tone?: string | null;
          raw_idea?: string | null;
          refined_idea?: string | null;
          character_bible?: Json | null;
          idea_conversation?: Json;
          status?: BookStatusDb;
          cover_prompt?: string | null;
          cover_url?: string | null;
          back_cover_copy?: string | null;
          about_author?: string | null;
          kdp_instructions?: string | null;
          word_count?: number;
          chapter_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "books_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      outlines: {
        Row: {
          id: string;
          book_id: string;
          sections: Json;
          approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          sections?: Json;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          sections?: Json;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outlines_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: true;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      chapters: {
        Row: {
          id: string;
          book_id: string;
          chapter_number: number;
          title: string;
          outline_summary: string | null;
          author_notes: string | null;
          content: string | null;
          word_count: number;
          target_word_count: number | null;
          status: ChapterStatusDb;
          generation_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_number: number;
          title: string;
          outline_summary?: string | null;
          author_notes?: string | null;
          content?: string | null;
          word_count?: number;
          target_word_count?: number | null;
          status?: ChapterStatusDb;
          generation_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_number?: number;
          title?: string;
          outline_summary?: string | null;
          author_notes?: string | null;
          content?: string | null;
          word_count?: number;
          target_word_count?: number | null;
          status?: ChapterStatusDb;
          generation_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      api_usage: {
        Row: {
          id: string;
          user_id: string;
          route: string;
          tokens_used: number;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          route: string;
          tokens_used?: number;
          model?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          route?: string;
          tokens_used?: number;
          model?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      book_events: {
        Row: {
          id: string;
          user_id: string;
          book_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string | null;
          event_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "book_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "book_events_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
~~~

## types/lucide-esm-icons.d.ts

~~~ts
/// <reference types="react" />

declare module "lucide-react/dist/esm/icons/alert-triangle.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/at-sign.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/arrow-left.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/arrow-right.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/arrow-up.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/bold.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/book-marked.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/book-open.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/book-open-check.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/check.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/check-circle-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/chevron-down.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/chevron-left.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/chevron-right.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/chevron-up.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/copy.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/credit-card.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/dollar-sign.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/download.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/expand.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/eye.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/file-archive.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/file-down.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/file-up.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/globe.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/grid-3x3.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/grip-vertical.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/hash.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/image.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/italic.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/languages.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/layout-dashboard.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/lightbulb.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/list.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/list-ordered.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/list-tree.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/loader-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/log-out.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/map-pin.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/menu.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/message-square-text.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/messages-square.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/more-vertical.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/pencil.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/pencil-line.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/pen-line.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/plus.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/quote.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/rocket.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/route.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/ruler.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/save.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/send.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/settings.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/share-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/sparkles.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/tags.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/trash-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/trending-up.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/type.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/upload.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/user-plus.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/user-round.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/wand-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/x.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/code.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/code-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/heading-1.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/heading-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/heading-3.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/heading-4.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/keyboard.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/link-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/link-2-off.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/maximize-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/minimize-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/redo-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/replace.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/search.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/spell-check-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/strikethrough.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/target.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/underline.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
declare module "lucide-react/dist/esm/icons/undo-2.js" {
  const Comp: import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>;
  export default Comp;
}
~~~

## vitest.config.ts

~~~ts
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [path.join(projectRoot, "tests/setup.ts")],
  },
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
});
~~~


