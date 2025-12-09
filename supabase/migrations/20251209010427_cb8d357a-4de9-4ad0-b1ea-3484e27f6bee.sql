-- Create skill_gap_analyses table
CREATE TABLE public.skill_gap_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_role TEXT NOT NULL,
  current_skills TEXT[] NOT NULL DEFAULT '{}',
  missing_skills JSONB DEFAULT '[]',
  learning_roadmap JSONB DEFAULT '[]',
  course_recommendations JSONB DEFAULT '[]',
  estimated_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_gap_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own skill gap analyses"
ON public.skill_gap_analyses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skill gap analyses"
ON public.skill_gap_analyses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill gap analyses"
ON public.skill_gap_analyses
FOR DELETE
USING (auth.uid() = user_id);