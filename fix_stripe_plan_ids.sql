-- =============================================================
-- 1. CLEAN UP: Delete old plans (Starter, Premium)
-- =============================================================
DELETE FROM public.plans WHERE slug IN ('starter', 'premium');

-- =============================================================
-- 2. INSERT: The new unified Paid plan ($9.00/mo)
-- =============================================================
INSERT INTO public.plans (
  name, 
  slug, 
  price, 
  currency, 
  interval, 
  max_journeys, 
  max_topics, 
  features, 
  is_active, 
  sort_order, 
  stripe_price_id, 
  stripe_product_id
)
VALUES (
  'Paid', 
  'paid', 
  900, -- $9.00
  'usd', 
  'month', 
  -1, -- Unlimited Learnings
  -1, -- Unlimited Topics
  '["Unlimited Learning Journeys", "Unlimited Topics", "Advanced Analytics", "AI Outline Generation", "Priority Support"]'::jsonb, 
  true, 
  1, 
  'price_1TDlc8LWb8zGV3qkquBEK2vY', 
  'prod_YOUR_STRIPE_PROD_ID' -- You can find this in Stripe Dashboard, or leave it for just Price ID sync
)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  stripe_price_id = EXCLUDED.stripe_price_id,
  features = EXCLUDED.features,
  max_journeys = EXCLUDED.max_journeys,
  max_topics = EXCLUDED.max_topics;

-- =============================================================
-- 3. MIGRATE: Update existing users on starter/premium to 'paid'
-- =============================================================
UPDATE public.profiles SET plan = 'paid' WHERE plan IN ('starter', 'premium');

-- =============================================================
-- 4. VERIFY: Show the current plans
-- =============================================================
SELECT slug, name, price, stripe_price_id 
FROM public.plans 
ORDER BY sort_order;
