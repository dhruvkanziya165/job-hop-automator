-- Add job_type column to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'both' CHECK (job_type IN ('internship', 'job', 'both'));

-- Add job_type column to job_postings
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'job' CHECK (job_type IN ('internship', 'job'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_job_postings_location ON job_postings(location);
CREATE INDEX IF NOT EXISTS idx_job_postings_type ON job_postings(job_type);