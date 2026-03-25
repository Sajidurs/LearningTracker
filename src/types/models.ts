export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  plan: "free" | "paid";
  show_on_leaderboard?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  stripe_price_id: string | null;
  max_journeys: number;
  max_topics: number;
}

export interface LearningJourney {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface Topic {
  id: string;
  journey_id: string;
  user_id: string;
  title: string;
  week_number: number | null;
  sort_order: number;
  points_value: number;
  completed: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  read: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  invoice_url: string | null;
  description: string;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}
