
CREATE TABLE public.chat_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  memory_type text NOT NULL DEFAULT 'conversation',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memories" ON public.chat_memories
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_chat_memories_user_type ON public.chat_memories(user_id, memory_type, created_at DESC);
