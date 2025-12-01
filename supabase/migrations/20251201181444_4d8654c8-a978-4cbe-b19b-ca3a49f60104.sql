-- Add status check constraint for applications
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications ADD CONSTRAINT applications_status_check 
CHECK (status IN ('pending', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'));

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);

-- Update existing 'pending' records to have applied_at timestamp if they don't have one
UPDATE applications 
SET applied_at = created_at 
WHERE status != 'pending' AND applied_at IS NULL;