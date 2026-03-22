import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: "welcome" | "purchase" | "password_update" | "journey_created";
  data?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { to, type, data }: EmailRequest = await req.json();

    let subject = "";
    let html = "";

    switch (type) {
      case "welcome":
        subject = "Welcome to Track & Grow! 🚀";
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #52b788;">Welcome to Track & Grow!</h1>
            <p>Hi there,</p>
            <p>We're excited to help you on your learning journey. With Track & Grow, you can organize your topics, track progress, and earn rewards.</p>
            <p>Get started by creating your first Learning Journey today!</p>
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
              <a href="https://track-grow.com/app" style="background: #52b788; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            </div>
          </div>
        `;
        break;

      case "purchase":
        subject = "Subscription Confirmed! 🎉";
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #52b788;">Thank you for upgrading!</h1>
            <p>Your subscription to the <strong>Paid Plan</strong> is now active.</p>
            <p>You now have unlimited access to:</p>
            <ul>
              <li>Unlimited Learning Journeys</li>
              <li>Unlimited Topics</li>
              <li>AI-powered Path Generation</li>
              <li>Advanced Analytics</li>
            </ul>
            <p>Happy learning!</p>
          </div>
        `;
        break;

      case "password_update":
        subject = "Security Alert: Password Updated";
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2b2d42;">Your password was changed</h2>
            <p>This is a confirmation that the password for your account has been successfully updated.</p>
            <p>If you did not make this change, please contact support immediately.</p>
          </div>
        `;
        break;

      case "journey_created":
        subject = `New Journey Started: ${data?.title || "Goal"} 📚`;
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #52b788;">You've started a new journey!</h2>
            <p>Your new learning journey <strong>"${data?.title}"</strong> has been created successfully.</p>
            <p><strong>Outline Preview:</strong></p>
            <ul>
              ${(data?.topics || []).slice(0, 5).map((t: string) => `<li>${t}</li>`).join("")}
              ${(data?.topics || []).length > 5 ? `<li>...and more</li>` : ""}
            </ul>
            <p>Keep going, you've got this!</p>
          </div>
        `;
        break;

      default:
        throw new Error("Invalid email type");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Track & Grow <notifications@track-grow.com>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
