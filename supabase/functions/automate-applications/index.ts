import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { userId } = await req.json();
    
    if (!userId || !validateUUID(userId) || user.id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`User ${user.id} starting automated application process`);

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: preferences, error: prefError } = await serviceSupabase
      .from("user_preferences").select("*").eq("user_id", user.id).single();

    if (prefError || !preferences) {
      throw new Error("User preferences not found. Please complete onboarding first.");
    }

    // Allow manual trigger even if auto mode is off
    console.log(`Apply mode: ${preferences.apply_mode}`);

    const dailyLimit = preferences.daily_apply_cap || 5;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayApps } = await serviceSupabase
      .from("applications").select("id").eq("user_id", user.id).gte("created_at", today.toISOString());

    const todayCount = todayApps?.length || 0;
    
    if (todayCount >= dailyLimit) {
      return new Response(JSON.stringify({
        success: false, message: `Daily limit reached (${dailyLimit}).`, appliedToday: todayCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const scrapeResponse = await supabase.functions.invoke("scrape-jobs", {
      body: { source: "all", keywords: preferences.keywords?.slice(0, 10) },
    });

    const { data: appliedJobs } = await serviceSupabase
      .from("applications").select("job_id").eq("user_id", user.id);

    const appliedJobIds = appliedJobs?.map(app => app.job_id) || [];

    let query = serviceSupabase.from("job_postings").select("*");
    if (appliedJobIds.length > 0) {
      query = query.not("id", "in", `(${appliedJobIds.join(",")})`);
    }

    const { data: availableJobs } = await query.limit(dailyLimit - todayCount);

    if (!availableJobs?.length) {
      return new Response(JSON.stringify({ success: true, message: "No new jobs", appliedCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = [];
    for (const job of availableJobs) {
      try {
        const emailResponse = await supabase.functions.invoke("generate-email", {
          body: { jobId: job.id, userId: user.id, emailType: "application" },
        });
        if (emailResponse.error) throw new Error(emailResponse.error.message);

        const hrEmail = `hr@${job.company.toLowerCase().replace(/\s+/g, '')}.com`;
        await supabase.functions.invoke("send-application", {
          body: { jobId: job.id, userId: user.id, subject: emailResponse.data.subject, body: emailResponse.data.body, toEmail: hrEmail },
        });

        results.push({ job: `${job.title} at ${job.company}`, status: "success" });
      } catch (error) {
        results.push({ job: `${job.title} at ${job.company}`, status: "failed", error: String(error) });
      }
    }

    return new Response(JSON.stringify({
      success: true, message: `Applied to ${results.filter(r => r.status === "success").length} jobs.`,
      appliedCount: results.filter(r => r.status === "success").length, results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
