import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2024-11-20.acacia" });

    // Get all profiles with active paid plans
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id, plan, full_name")
      .neq("plan", "free");

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No paid subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const ONE_HOUR_MS = 60 * 60 * 1000;
    let notificationsSent = 0;

    for (const profile of profiles) {
      try {
        // Get user email from auth
        const { data: userData } = await supabaseClient.auth.admin.getUserById(profile.user_id);
        if (!userData?.user?.email) continue;

        const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
        if (customers.data.length === 0) continue;

        const subscriptions = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: "active",
          limit: 1,
        });
        if (subscriptions.data.length === 0) continue;

        const sub = subscriptions.data[0];
        const item = sub.items.data[0];
        const endTs = (sub as any).current_period_end || (item as any)?.current_period_end;
        if (!endTs) continue;
        const renewalTime = endTs * 1000;
        const timeUntilRenewal = renewalTime - now;
        const renewalDate = new Date(renewalTime).toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        });

        // Check if we should send 2-day reminder (between 47-48 hours before)
        if (timeUntilRenewal > 0 && timeUntilRenewal <= TWO_DAYS_MS && timeUntilRenewal > (TWO_DAYS_MS - ONE_HOUR_MS)) {
          // Check if notification already sent
          const { data: existing } = await supabaseClient
            .from("notifications")
            .select("id")
            .eq("user_id", profile.user_id)
            .eq("title", "Subscription Renewing Soon 📅")
            .gte("created_at", new Date(now - TWO_DAYS_MS).toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabaseClient.from("notifications").insert({
              user_id: profile.user_id,
              title: "Subscription Renewing Soon 📅",
              message: `Your ${profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)} plan will renew on ${renewalDate}. Manage your subscription from your profile.`,
              type: "info",
              link: "/app/profile?tab=billing",
            });
            notificationsSent++;
          }
        }

        // Check if we should send 1-hour reminder (between 30-60 minutes before)
        if (timeUntilRenewal > 0 && timeUntilRenewal <= ONE_HOUR_MS && timeUntilRenewal > (ONE_HOUR_MS / 2)) {
          const { data: existing } = await supabaseClient
            .from("notifications")
            .select("id")
            .eq("user_id", profile.user_id)
            .eq("title", "Subscription Renewing in 1 Hour ⏰")
            .gte("created_at", new Date(now - ONE_HOUR_MS).toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabaseClient.from("notifications").insert({
              user_id: profile.user_id,
              title: "Subscription Renewing in 1 Hour ⏰",
              message: `Your ${profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)} plan will renew shortly. You can manage it from your billing settings.`,
              type: "warning",
              link: "/app/profile?tab=billing",
            });
            notificationsSent++;
          }
        }
      } catch (e) {
        console.error(`Error processing user ${profile.user_id}:`, e);
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${profiles.length} subscribers, sent ${notificationsSent} notifications`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
