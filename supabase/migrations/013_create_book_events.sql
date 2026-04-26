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
