CREATE TABLE public.interview_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  difficulty_rating INTEGER NOT NULL CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  outcome TEXT DEFAULT 'pending',
  went_well TEXT,
  could_improve TEXT,
  questions_asked TEXT,
  notes TEXT,
  would_recommend BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback" ON public.interview_feedback
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX interview_feedback_unique ON public.interview_feedback (interview_id);