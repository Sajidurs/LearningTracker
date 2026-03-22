-- Update Stripe price/product IDs in plans table to match YOUR Stripe account
UPDATE public.plans
SET 
  stripe_price_id = 'price_1T2pGUL9gRJOWrADVFfzHinP',
  stripe_product_id = 'prod_U0qy4m7nkN0fDZ'
WHERE slug = 'starter';

UPDATE public.plans
SET 
  stripe_price_id = 'price_1T2pHvL9gRJOWrADwLBFbSPE',
  stripe_product_id = 'prod_U0qyt2Qxe6J254'
WHERE slug = 'premium';

-- Verify
SELECT slug, stripe_price_id, stripe_product_id FROM public.plans;
