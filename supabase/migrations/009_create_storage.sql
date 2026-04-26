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
