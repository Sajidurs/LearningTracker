
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Learning Journeys
CREATE TABLE public.learning_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own journeys" ON public.learning_journeys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Topics (outline items within a journey)
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.learning_journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points_value INTEGER NOT NULL DEFAULT 10,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  week_number INTEGER,
  day_of_week INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  youtube_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own topics" ON public.topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sub-topics
CREATE TABLE public.sub_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own sub_topics" ON public.sub_topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Time entries for tracking learning time
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own time_entries" ON public.time_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Points log
CREATE TABLE public.points_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own points_log" ON public.points_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Topic documents (file references)
CREATE TABLE public.topic_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topic_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own documents" ON public.topic_documents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_journeys_updated_at BEFORE UPDATE ON public.learning_journeys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for topic documents
INSERT INTO storage.buckets (id, name, public) VALUES ('topic-documents', 'topic-documents', false);

CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'topic-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (bucket_id = 'topic-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE USING (bucket_id = 'topic-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

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

-- Create a public avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: admins can read all roles
CREATE POLICY "Admins can read all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enjoying_platform BOOLEAN,
  likes_interface BOOLEAN,
  has_issues BOOLEAN,
  message TEXT,
  admin_reply TEXT,
  admin_replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON public.feedback FOR UPDATE USING (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Trigger for feedback updated_at
CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.learning_journeys ADD COLUMN is_favorited boolean NOT NULL DEFAULT false;

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

-- Create support_content table for admin-managed help & support page
CREATE TABLE public.support_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL, -- 'guide', 'faq', 'video', 'contact'
  title TEXT NOT NULL,
  content TEXT, -- body text, answer, description etc.
  url TEXT, -- video URL, social link, etc.
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read active support content
CREATE POLICY "Anyone can view active support content"
ON public.support_content
FOR SELECT
USING (is_active = true);

-- Seed some default content
INSERT INTO public.support_content (section, title, content, sort_order) VALUES
('guide', 'Create a Learning Journey', 'Go to Learning Journeys and click "Create Journey". Give it a title, description, and start date.', 1),
('guide', 'Add Topics', 'Inside a journey, add topics you want to learn. Each topic can have sub-topics, documents, links, and YouTube videos.', 2),
('guide', 'Track Your Progress', 'Use the timer on each topic to track study time. Mark topics complete to earn points.', 3),
('guide', 'Earn Rewards', 'Accumulated points can be redeemed for rewards in the Rewards section.', 4),
('faq', 'How do I upgrade my plan?', 'Go to Profile > Billing > Manage to view available plans and upgrade.', 1),
('faq', 'Can I cancel my subscription?', 'Yes, you can cancel anytime through the Manage Subscription button on your billing page.', 2),
('faq', 'How do points work?', 'You earn points by completing topics. The points value is configurable per topic. Points can be redeemed for rewards.', 3),
('contact', 'Email', 'support@learntrack.app', 1),
('contact', 'Phone', '+1 (555) 123-4567', 2),
('contact', 'Address', '123 Learning Street, Education City, ED 12345', 3);
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create app_settings table for storing configuration like API keys
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Admins can manage settings"
ON public.app_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
