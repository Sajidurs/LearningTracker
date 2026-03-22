-- Fix: Allow public access to active plans so they show up on Pricing/Signup pages
DROP POLICY IF EXISTS "Authenticated users can view active plans" ON public.plans;

CREATE POLICY "Anyone can view active plans"
ON public.plans
FOR SELECT
USING (is_active = true);
