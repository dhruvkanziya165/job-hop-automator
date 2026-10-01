ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS parsed_text text;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS parsed_at timestamptz;