import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Always allow CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    // 1. Check if Secret exists
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SECRET_MISSING: OpenAI API key is NOT set in your Supabase Secrets dashboard. Please add OPENAI_API_KEY." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional learning curriculum designer. You generate structured learning outlines that progressively build knowledge. You must respond with a JSON object."
          },
          {
            role: "user",
            content: `Generate a structured learning outline for: "${topic}". 
            Respond with a JSON object containing a property "topics" which is an array of 6-12 subtopic strings. 
            Example: { "topics": ["Introduction to HTML", "CSS for Beginners", "Mastering JavaScript Basics"] }`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    // 2. Check for OpenAI errors (like invalid key/credits)
    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI Error:", err);
      let errorMsg = `OpenAI API Error (${response.status})`;
      try {
        const errJson = JSON.parse(err);
        errorMsg = errJson.error?.message || errorMsg;
      } catch (_) {
        errorMsg = err;
      }
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const contentStr = data.choices[0].message.content;
    const parsed = JSON.parse(contentStr);
    
    let outline = parsed.topics || parsed.outline || parsed.curriculum || [];
    if (!Array.isArray(outline)) {
      outline = Object.values(parsed).find(v => Array.isArray(v)) || [];
    }

    if (!outline || outline.length === 0) {
      return new Response(JSON.stringify({ error: "AI failed to build a list of topics. Try a different title." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Success - Return data
    return new Response(JSON.stringify({ outline }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e: any) {
    console.error("Critical Function Error:", e);
    return new Response(JSON.stringify({ error: `Function Crash: ${e.message || "Unknown error"}` }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
