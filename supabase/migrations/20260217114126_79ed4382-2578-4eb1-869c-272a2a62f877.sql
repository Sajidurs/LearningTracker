
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
