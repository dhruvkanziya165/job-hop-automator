-- Create career_path_predictions table
CREATE TABLE public.career_path_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role_title TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  experience_years INTEGER NOT NULL DEFAULT 0,
  predicted_paths JSONB DEFAULT '[]',
  industry_insights JSONB DEFAULT '[]',
  salary_progression JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_path_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own career predictions"
ON public.career_path_predictions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own career predictions"
ON public.career_path_predictions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career predictions"
ON public.career_path_predictions
FOR DELETE
USING (auth.uid() = user_id);