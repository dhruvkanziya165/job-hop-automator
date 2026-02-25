import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    
    const resend = new Resend(resendKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all active users with preferences
    const { data: users } = await supabase
      .from("profiles")
      .select("id, email, full_name");

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const user of users) {
      // Gather stats for the week
      const [appsRes, interviewsRes, offersRes] = await Promise.all([
        supabase
          .from("applications")
          .select("id, status, created_at")
          .eq("user_id", user.id)
          .gte("created_at", oneWeekAgo),
        supabase
          .from("interviews")
          .select("id, status, scheduled_at, interview_type")
          .eq("user_id", user.id)
          .gte("created_at", oneWeekAgo),
        supabase
          .from("applications")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "offer")
          .gte("updated_at", oneWeekAgo),
      ]);

      const apps = appsRes.data || [];
      const interviews = interviewsRes.data || [];
      const offers = offersRes.data || [];

      // Skip users with no activity
      if (apps.length === 0 && interviews.length === 0) continue;

      const appliedCount = apps.filter(a => a.status !== "pending").length;
      const interviewCount = interviews.length;
      const responseCount = apps.filter(a => ["interview", "offer", "rejected"].includes(a.status)).length;
      const responseRate = apps.length > 0 ? Math.round((responseCount / apps.length) * 100) : 0;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">📊 Weekly Job Search Report</h1>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Hi ${user.full_name || "there"}, here's your week in review.</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
            <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #0369a1;">${apps.length}</div>
              <div style="font-size: 12px; color: #666;">Applications</div>
            </div>
            <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #15803d;">${interviewCount}</div>
              <div style="font-size: 12px; color: #666;">Interviews</div>
            </div>
            <div style="background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #a16207;">${responseRate}%</div>
              <div style="font-size: 12px; color: #666;">Response Rate</div>
            </div>
            <div style="background: #fdf2f8; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #be185d;">${offers.length}</div>
              <div style="font-size: 12px; color: #666;">Offers</div>
            </div>
          </div>

          <p style="color: #888; font-size: 12px; text-align: center;">Keep up the great work! 🚀</p>
        </div>
      `;

      try {
        await resend.emails.send({
          from: "JobHop <onboarding@resend.dev>",
          to: [user.email],
          subject: `📊 Your Weekly Job Search Report - ${apps.length} applications, ${interviewCount} interviews`,
          html,
        });
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send to ${user.email}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
