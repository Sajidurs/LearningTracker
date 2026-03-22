
-- 1. Fix plans table: restrict SELECT to authenticated users only (hides Stripe IDs from public)
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;

CREATE POLICY "Authenticated users can view active plans"
ON public.plans
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Allow admins to manage plans (needed for admin dashboard)
CREATE POLICY "Admins can manage plans"
ON public.plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add INSERT policy for notifications (only admins/system can create)
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
