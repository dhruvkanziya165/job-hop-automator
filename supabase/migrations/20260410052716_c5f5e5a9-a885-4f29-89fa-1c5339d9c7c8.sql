-- Fix job_scrape_logs: drop overly permissive policies
DROP POLICY IF EXISTS "Service role can manage scrape logs" ON public.job_scrape_logs;
DROP POLICY IF EXISTS "Anyone can view scrape logs" ON public.job_scrape_logs;

-- Recreate: only service_role can manage logs
CREATE POLICY "Service role can manage scrape logs"
  ON public.job_scrape_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view logs (read-only)
CREATE POLICY "Authenticated users can view scrape logs"
  ON public.job_scrape_logs FOR SELECT
  TO authenticated
  USING (true);

-- Fix resume_analyses: add missing UPDATE policy
CREATE POLICY "Users can update their own resume analyses"
  ON public.resume_analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix mutable search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;