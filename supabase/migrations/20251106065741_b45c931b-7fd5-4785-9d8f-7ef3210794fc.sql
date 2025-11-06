-- Make onebill_submissions.onebill_endpoint and submitted_by nullable to avoid insert failures during auto-processing
BEGIN;

-- Drop NOT NULL on onebill_endpoint if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onebill_submissions'
      AND column_name = 'onebill_endpoint'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.onebill_submissions
      ALTER COLUMN onebill_endpoint DROP NOT NULL;
  END IF;
END $$;

-- Drop NOT NULL on submitted_by if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onebill_submissions'
      AND column_name = 'submitted_by'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.onebill_submissions
      ALTER COLUMN submitted_by DROP NOT NULL;
  END IF;
END $$;

COMMIT;