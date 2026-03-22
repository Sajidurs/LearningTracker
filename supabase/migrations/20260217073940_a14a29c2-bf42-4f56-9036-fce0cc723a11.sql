
-- Create rewards table
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  points_cost INTEGER NOT NULL DEFAULT 0,
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can CRUD own rewards"
ON public.rewards
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
