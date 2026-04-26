-- First-run product tour: dismissed from dashboard OnboardingModal
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.has_seen_onboarding IS 'User has completed or skipped the ChapterAI onboarding tour.';
