
-- Create topic_links table for storing website links associated with topics
CREATE TABLE public.topic_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topic_links ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can CRUD own topic_links"
  ON public.topic_links
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
