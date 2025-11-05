-- Policies to allow client-side upload of derived PDF images to Storage

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'auth_upload_customer_media_derived'
  ) THEN
    CREATE POLICY "auth_upload_customer_media_derived"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'customer_media'
      AND name LIKE 'derived/%'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'auth_update_customer_media_derived'
  ) THEN
    CREATE POLICY "auth_update_customer_media_derived"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'customer_media' AND name LIKE 'derived/%'
    )
    WITH CHECK (
      bucket_id = 'customer_media' AND name LIKE 'derived/%'
    );
  END IF;
END $$;