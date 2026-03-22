-- Replace 'YOUR_EMAIL_HERE' with your actual email address used to log in to the app
-- Example: 'sajidur@example.com'

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'shajidur171@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verification: Check if the role was assigned
SELECT * FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'shajidur171@gmail.com');
