-- Create networking contacts table
CREATE TABLE public.networking_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  linkedin_url TEXT,
  email TEXT,
  contact_type TEXT DEFAULT 'recruiter', -- recruiter, hiring_manager, employee, founder
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, connected, responded, no_response
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create outreach messages table
CREATE TABLE public.outreach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.networking_contacts(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL, -- linkedin_connection, email_initial, email_followup
  subject TEXT,
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft', -- draft, sent, opened, replied
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create follow-up schedules table
CREATE TABLE public.follow_up_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.networking_contacts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.outreach_messages(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  follow_up_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- pending, sent, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.networking_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for networking_contacts
CREATE POLICY "Users can view their own contacts" ON public.networking_contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contacts" ON public.networking_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON public.networking_contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON public.networking_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for outreach_messages
CREATE POLICY "Users can view their own messages" ON public.outreach_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages" ON public.outreach_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own messages" ON public.outreach_messages
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON public.outreach_messages
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for follow_up_schedules
CREATE POLICY "Users can view their own follow-ups" ON public.follow_up_schedules
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own follow-ups" ON public.follow_up_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own follow-ups" ON public.follow_up_schedules
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own follow-ups" ON public.follow_up_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_networking_contacts_updated_at
  BEFORE UPDATE ON public.networking_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();