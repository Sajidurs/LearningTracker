import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const userId = userData.user.id;

    // Delete all user data in order (child tables first)
    await supabaseAdmin.from("topic_documents").delete().eq("user_id", userId);
    await supabaseAdmin.from("topic_links").delete().eq("user_id", userId);
    await supabaseAdmin.from("sub_topics").delete().eq("user_id", userId);
    await supabaseAdmin.from("time_entries").delete().eq("user_id", userId);
    await supabaseAdmin.from("points_log").delete().eq("user_id", userId);
    await supabaseAdmin.from("topics").delete().eq("user_id", userId);
    await supabaseAdmin.from("learning_journeys").delete().eq("user_id", userId);
    await supabaseAdmin.from("rewards").delete().eq("user_id", userId);
    await supabaseAdmin.from("feedback").delete().eq("user_id", userId);
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    // Delete avatar files from storage
    try {
      const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
      if (files && files.length > 0) {
        const paths = files.map(f => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from("avatars").remove(paths);
      }
    } catch (_) { /* ignore storage errors */ }

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
