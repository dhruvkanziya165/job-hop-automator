-- Add unique constraint on external_id for job deduplication
ALTER TABLE public.job_postings 
ADD CONSTRAINT job_postings_external_id_key UNIQUE (external_id);