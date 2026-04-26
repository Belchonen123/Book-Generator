-- Supabase Realtime: books and chapters (dashboard + editor live updates)

ALTER TABLE public.books REPLICA IDENTITY FULL;
ALTER TABLE public.chapters REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chapters;
