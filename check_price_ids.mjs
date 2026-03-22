import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cacbrlkrzmakwrpilqam.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY2JybGtyem1ha3dycGlscWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjgzMDksImV4cCI6MjA4NzE0NDMwOX0.eyTTynubJZGXYO9hfbsq6R3iRUVIdXNLerlBgUdi0yM";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlans() {
  const { data, error } = await supabase.from("plans").select("name, slug, stripe_price_id").eq("is_active", true);
  console.log("Active Plans Price IDs:", JSON.stringify(data, null, 2));
}

checkPlans();
