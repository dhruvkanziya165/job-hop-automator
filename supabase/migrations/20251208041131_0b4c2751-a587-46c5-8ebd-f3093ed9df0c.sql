-- Create table for resume analysis results
CREATE TABLE public.resume_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
  keyword_matches JSONB DEFAULT '[]',
  missing_keywords JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  tailored_content TEXT,
  original_content TEXT,
  analysis_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own resume analyses"
ON public.resume_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own resume analyses"
ON public.resume_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume analyses"
ON public.resume_analyses FOR DELETE
USING (auth.uid() = user_id);