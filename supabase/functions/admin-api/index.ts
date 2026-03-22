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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Access denied: not an admin");

    const { action, ...params } = await req.json();

    switch (action) {
      // ── USER MANAGEMENT ──
      case "list_users": {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
          page: params.page || 1,
          perPage: params.perPage || 50,
        });
        if (error) throw error;
        const userIds = users.map(u => u.id);
        const { data: profiles } = await supabaseAdmin.from("profiles").select("*").in("user_id", userIds);
        const { data: roles } = await supabaseAdmin.from("user_roles").select("*").in("user_id", userIds);
        const { data: journeys } = await supabaseAdmin.from("learning_journeys").select("user_id").in("user_id", userIds);
        const journeyCounts: Record<string, number> = {};
        journeys?.forEach(j => { journeyCounts[j.user_id] = (journeyCounts[j.user_id] || 0) + 1; });
        const enriched = users.map(u => ({
          id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
          profile: profiles?.find(p => p.user_id === u.id) || null,
          roles: roles?.filter(r => r.user_id === u.id).map(r => r.role) || [],
          journey_count: journeyCounts[u.id] || 0,
        }));
        return new Response(JSON.stringify({ users: enriched }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { userId } = params;
        if (!userId) throw new Error("userId required");
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_plan": {
        const { userId, plan } = params;
        if (!userId || !plan) throw new Error("userId and plan required");
        const { error } = await supabaseAdmin.from("profiles").update({ plan }).eq("user_id", userId);
        if (error) throw error;
        await supabaseAdmin.from("notifications").insert({
          user_id: userId, title: "Plan Updated",
          message: `Your plan has been updated to ${plan.charAt(0).toUpperCase() + plan.slice(1)}.`, type: "info",
        });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "toggle_admin": {
        const { userId, makeAdmin } = params;
        if (!userId) throw new Error("userId required");
        if (makeAdmin) {
          await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        } else {
          await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "create_user": {
        const { email, password, fullName, plan } = params;
        if (!email || !password) throw new Error("email and password required");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { full_name: fullName || "" },
        });
        if (error) throw error;
        if (plan && plan !== "free" && data.user) {
          await supabaseAdmin.from("profiles").update({ plan }).eq("user_id", data.user.id);
        }
        if (data.user) {
          await supabaseAdmin.from("notifications").insert({
            user_id: data.user.id, title: "Welcome!",
            message: "Your account has been created. Start your learning journey today!", type: "success",
          });
        }
        return new Response(JSON.stringify({ success: true, user: data.user }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── STATS ──
      case "get_stats": {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const { count: journeyCount } = await supabaseAdmin.from("learning_journeys").select("*", { count: "exact", head: true });
        const { count: topicCount } = await supabaseAdmin.from("topics").select("*", { count: "exact", head: true });
        const { data: profiles } = await supabaseAdmin.from("profiles").select("plan, full_name, created_at");
        const planCounts = { free: 0, paid: 0 };
        profiles?.forEach(p => { if (p.plan in planCounts) planCounts[p.plan as keyof typeof planCounts]++; });

        // Recent users (sorted by created_at desc, top 8)
        const recentUsers = (profiles || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8)
          .map(p => ({ full_name: p.full_name, plan: p.plan, created_at: p.created_at }));

        // Topic completion stats
        const { count: completedTopics } = await supabaseAdmin.from("topics").select("*", { count: "exact", head: true }).eq("is_completed", true);

        // Topics created over last 7 days
        const topicsOverTime: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split("T")[0];
          const nextDay = new Date(d);
          nextDay.setDate(nextDay.getDate() + 1);
          const { count } = await supabaseAdmin.from("topics").select("*", { count: "exact", head: true })
            .gte("created_at", dateStr).lt("created_at", nextDay.toISOString().split("T")[0]);
          topicsOverTime.push({ date: dateStr, count: count || 0 });
        }

        let stripeStats = { revenue: 0, activeSubscriptions: 0 };
        try {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey) {
            const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
            const subs = await stripe.subscriptions.list({ status: "active", limit: 100 });
            stripeStats.activeSubscriptions = subs.data.length;
            const invoices = await stripe.invoices.list({ status: "paid", limit: 100 });
            stripeStats.revenue = invoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) / 100;
          }
        } catch (_) { }
        return new Response(JSON.stringify({
          totalUsers: users?.length || 0, totalJourneys: journeyCount || 0, totalTopics: topicCount || 0,
          planCounts, stripeStats, recentUsers, completedTopics: completedTopics || 0, totalTopicsCount: topicCount || 0, topicsOverTime,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── PAYMENTS ──
      case "get_payments": {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
          // Return empty data instead of throwing when Stripe isn't configured
          return new Response(JSON.stringify({ customers: [], subscriptions: [], charges: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
        const [customers, subscriptions, charges] = await Promise.all([
          stripe.customers.list({ limit: 100 }),
          stripe.subscriptions.list({ limit: 100 }),
          stripe.charges.list({ limit: 50 }),
        ]);
        return new Response(JSON.stringify({
          customers: customers.data.map(c => ({ id: c.id, email: c.email, name: c.name, created: c.created })),
          subscriptions: subscriptions.data.map(s => {
            const item = s.items.data[0];
            const endTs = (s as any).current_period_end || (item as any)?.current_period_end;
            return {
              id: s.id, customer: s.customer, status: s.status,
              current_period_end: endTs || null,
              plan: item?.price?.unit_amount,
              currency: item?.price?.currency,
            };
          }),
          charges: charges.data.map(c => ({
            id: c.id, amount: c.amount, currency: c.currency,
            status: c.status, customer: c.customer, created: c.created, receipt_url: c.receipt_url,
          })),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── FEEDBACK ──
      case "list_feedback": {
        const { data: feedbackData } = await supabaseAdmin.from("feedback").select("*").order("created_at", { ascending: false }).limit(100);
        const enriched = [];
        if (feedbackData) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          const userMap: Record<string, string> = {};
          users?.forEach(u => { if (u.email) userMap[u.id] = u.email; });
          for (const fb of feedbackData) enriched.push({ ...fb, user_email: userMap[fb.user_id] || null });
        }
        return new Response(JSON.stringify({ feedback: enriched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "reply_feedback": {
        const { feedbackId, userId, reply } = params;
        if (!feedbackId || !reply) throw new Error("feedbackId and reply required");
        const { error } = await supabaseAdmin.from("feedback").update({ admin_reply: reply, admin_replied_at: new Date().toISOString() }).eq("id", feedbackId);
        if (error) throw error;
        await supabaseAdmin.from("notifications").insert({
          user_id: userId, title: "Feedback Reply",
          message: `Admin replied to your feedback: "${reply.substring(0, 100)}${reply.length > 100 ? "..." : ""}"`, type: "info",
        });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── PLAN MANAGEMENT ──
      case "list_plans": {
        const { data: plans, error } = await supabaseAdmin.from("plans").select("*").order("sort_order");
        if (error) throw error;
        return new Response(JSON.stringify({ plans: plans || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "create_plan": {
        const { name, slug, price, currency, interval, max_journeys, max_topics, features, is_active, sort_order, stripe_price_id, stripe_product_id } = params;
        if (!name || !slug) throw new Error("name and slug required");
        const { data, error } = await supabaseAdmin.from("plans").insert({
          name, slug, price: price || 0, currency: currency || "usd", interval: interval || "month",
          max_journeys: max_journeys ?? 2, max_topics: max_topics ?? 100,
          features: features || [], is_active: is_active !== false, sort_order: sort_order || 0,
          stripe_price_id: stripe_price_id || null, stripe_product_id: stripe_product_id || null,
        }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, plan: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_plan": {
        const { id, name, slug, price, currency, interval, max_journeys, max_topics, features, is_active, sort_order, stripe_price_id, stripe_product_id } = params;
        if (!id) throw new Error("plan id required");
        const { error } = await supabaseAdmin.from("plans").update({
          name, slug, price, currency, interval, max_journeys, max_topics,
          features, is_active, sort_order, stripe_price_id, stripe_product_id,
        }).eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete_plan": {
        const { planId } = params;
        if (!planId) throw new Error("planId required");
        const { error } = await supabaseAdmin.from("plans").delete().eq("id", planId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── SUPPORT CONTENT MANAGEMENT ──
      case "list_support": {
        const { data, error } = await supabaseAdmin.from("support_content").select("*").order("sort_order");
        if (error) throw error;
        return new Response(JSON.stringify({ items: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "create_support": {
        const { section, title, content, url, sort_order, is_active } = params;
        if (!title || !section) throw new Error("title and section required");
        const { error } = await supabaseAdmin.from("support_content").insert({
          section, title, content: content || null, url: url || null,
          sort_order: sort_order ?? 0, is_active: is_active !== false,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_support": {
        const { id, section, title, content, url, sort_order, is_active } = params;
        if (!id) throw new Error("id required");
        const { error } = await supabaseAdmin.from("support_content").update({
          section, title, content: content || null, url: url || null,
          sort_order, is_active,
        }).eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete_support": {
        const { id } = params;
        if (!id) throw new Error("id required");
        const { error } = await supabaseAdmin.from("support_content").delete().eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message.includes("Access denied") ? 403 : 400,
    });
  }
});
