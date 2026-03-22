import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUB] ${step}${d}`);
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) throw new Error(`Auth error: ${userError?.message || "Invalid token"}`);

    const user = userData.user;
    if (!user.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2024-11-20.acacia" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, setting free plan");
      await supabaseClient.from("profiles").update({ plan: "free" }).eq("user_id", user.id);
      return new Response(JSON.stringify({ subscribed: false, plan: "free", invoices: [], payment_methods: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check ALL subscriptions (active, past_due, trialing)
    const [activeSubs, trialingSubs, pastDueSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "past_due", limit: 1 }),
    ]);

    const subscription = activeSubs.data[0] || trialingSubs.data[0] || pastDueSubs.data[0] || null;
    const hasActiveSub = !!subscription;

    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let currentPriceId: string | null = null;
    let plan = "free";

    if (hasActiveSub && subscription) {
      const item = subscription.items.data[0];
      const endTs = (subscription as any).current_period_end;
      if (endTs && typeof endTs === "number") {
        subscriptionEnd = new Date(endTs * 1000).toISOString();
      }
      productId = (item?.price?.product as string) ?? null;
      currentPriceId = item?.price?.id ?? null;

      logStep("Active subscription found", { subscriptionId: subscription.id, priceId: currentPriceId, productId, endDate: subscriptionEnd });

      // DATABASE-DRIVEN LOOKUP: Find the plan slug by matching the stripe_price_id OR stripe_product_id
      // This avoids hardcoded product IDs and auto-works when the plans table is updated
      const { data: matchedPlan, error: planError } = await supabaseClient
        .from("plans")
        .select("slug")
        .or(`stripe_price_id.eq.${currentPriceId},stripe_product_id.eq.${productId}`)
        .single();

      if (planError) {
        logStep("Plan lookup error (falling back to free)", { error: planError.message, priceId: currentPriceId, productId });
      }

      if (matchedPlan?.slug && matchedPlan.slug !== "free") {
        plan = matchedPlan.slug;
        logStep("Plan resolved from database", { plan, priceId: currentPriceId, productId });
      } else {
        // Fallback: if price/product not found in plans table, log all plans for debugging
        const { data: allPlans } = await supabaseClient.from("plans").select("slug, stripe_price_id, stripe_product_id");
        logStep("NO PLAN MATCH FOUND - plans table contents", { allPlans, searchedPriceId: currentPriceId, searchedProductId: productId });
        plan = "free";
      }
    } else {
      logStep("No active subscription found, setting free plan");
      plan = "free";
    }

    // Get current profile plan to detect changes
    const { data: currentProfile } = await supabaseClient.from("profiles").select("plan").eq("user_id", user.id).single();
    const oldPlan = currentProfile?.plan || "free";

    // Always update profile to match Stripe reality
    await supabaseClient.from("profiles").update({ plan }).eq("user_id", user.id);
    logStep("Profile plan updated", { oldPlan, newPlan: plan });

    // Notify on plan changes
    if (oldPlan !== plan) {
      if (plan !== "free") {
        await supabaseClient.from("notifications").insert({
          user_id: user.id,
          title: "Plan Upgraded! 🎉",
          message: `Your plan has been upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)}. Enjoy your new features!`,
          type: "success",
        });

        // Trigger Purchase Confirmation Email
        try {
          await supabaseClient.functions.invoke("send-email", {
            body: { 
              to: user.email, 
              type: "purchase" 
            }
          });
          logStep("Purchase email triggered");
        } catch (e) {
          logStep("Failed to send purchase email", { error: (e as Error).message });
        }
      } else if (oldPlan !== "free") {
        await supabaseClient.from("notifications").insert({
          user_id: user.id,
          title: "Plan Changed",
          message: `Your plan has been changed to Free. You can upgrade anytime to regain premium features.`,
          type: "info",
        });
      }
    }

    // Get invoices
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 10 });
    const invoiceData = invoices.data.map((inv: any) => ({
      id: inv.id,
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      invoice_url: inv.hosted_invoice_url,
      description: inv.lines?.data?.[0]?.description || "Subscription",
    }));

    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 5 });
    const cards = paymentMethods.data.map((pm: any) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: currentPriceId,
      subscription_end: subscriptionEnd,
      plan,
      invoices: invoiceData,
      payment_methods: cards,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
