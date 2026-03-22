
-- Create plans table for admin-managed subscription plans
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  interval text NOT NULL DEFAULT 'month',
  max_journeys integer NOT NULL DEFAULT 2,
  max_topics integer NOT NULL DEFAULT 100,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  stripe_product_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active plans (needed for pricing page, upgrade modal, etc.)
CREATE POLICY "Anyone can view active plans"
ON public.plans
FOR SELECT
USING (is_active = true);

-- Admins can manage plans via edge function (service role key bypasses RLS)
-- No additional admin policy needed since admin-api uses service role

-- Insert default plans
INSERT INTO public.plans (name, slug, price, currency, interval, max_journeys, max_topics, features, is_active, sort_order, stripe_price_id, stripe_product_id)
VALUES
  ('Free', 'free', 0, 'usd', 'month', 2, 100, '["2 Learning Journeys", "100 Topics", "Basic Analytics"]'::jsonb, true, 0, null, null),
  ('Starter', 'starter', 1000, 'usd', 'month', 10, 700, '["10 Learning Journeys", "700 Topics", "Advanced Analytics", "Points & Rewards", "File Uploads", "Priority Support"]'::jsonb, true, 1, 'price_1T1itlLWb8zGV3qkBwowrFSW', 'prod_TziK4Fyk052nMA'),
  ('Premium', 'premium', 1900, 'usd', 'month', -1, -1, '["Unlimited Journeys", "Unlimited Topics", "Full Analytics Suite", "All Rewards", "Cloud Storage", "Dedicated Support"]'::jsonb, true, 2, 'price_1T1iuaLWb8zGV3qkOwMmZhAk', 'prod_TziLBAYgnIPCJ3');

-- Trigger for updated_at
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
