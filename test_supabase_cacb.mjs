import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cacbrlkrzmakwrpilqam.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmNocWV5bW1yaWtwcGZvYmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTIwMzIsImV4cCI6MjA4NjgyODAzMn0.02sZXgke45lWz0nnI1ILpc-VI0RGL1bqWyDk-oAFV3U";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlans() {
  const { data, error } = await supabase.from("plans").select("*");
  console.log("Plans result for cacb:", data, error);
}

checkPlans();
