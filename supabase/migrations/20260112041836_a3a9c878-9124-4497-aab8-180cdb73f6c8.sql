-- Create job_scrape_logs table to track scraping history
CREATE TABLE public.job_scrape_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scrape_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  jobs_found INTEGER DEFAULT 0,
  jobs_inserted INTEGER DEFAULT 0,
  keywords TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_scrape_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view logs
CREATE POLICY "Anyone can view scrape logs" 
ON public.job_scrape_logs 
FOR SELECT 
USING (true);

-- Allow service role to insert/update logs
CREATE POLICY "Service role can manage scrape logs" 
ON public.job_scrape_logs 
FOR ALL 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_scrape_logs_started_at ON public.job_scrape_logs(started_at DESC);