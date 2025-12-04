-- Create job_offers table to store user's job offers for comparison
CREATE TABLE public.job_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  base_salary NUMERIC NOT NULL,
  bonus NUMERIC DEFAULT 0,
  equity TEXT,
  benefits TEXT[],
  location TEXT,
  remote_policy TEXT,
  start_date DATE,
  offer_deadline DATE,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own offers"
ON public.job_offers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_job_offers_updated_at
BEFORE UPDATE ON public.job_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create salary_estimates table to cache AI estimates
CREATE TABLE public.salary_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  experience_years INTEGER NOT NULL,
  location TEXT NOT NULL,
  skills TEXT[],
  estimated_min NUMERIC,
  estimated_max NUMERIC,
  estimated_median NUMERIC,
  market_trend TEXT,
  negotiation_tips TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_estimates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own estimates"
ON public.salary_estimates
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);