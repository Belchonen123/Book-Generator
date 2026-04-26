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
