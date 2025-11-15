import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log(`Starting automated application process for user ${userId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch user preferences
    const { data: preferences, error: prefError } = await serviceSupabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (prefError || !preferences) {
      throw new Error("User preferences not found. Please complete onboarding first.");
    }

    if (preferences.apply_mode !== "auto") {
      throw new Error("Automation is not enabled. Enable auto-apply in preferences.");
    }

    const dailyLimit = preferences.daily_apply_cap || 5;

    // Get today's application count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayApps, error: countError } = await serviceSupabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", today.toISOString());

    if (countError) {
      console.error("Error counting applications:", countError);
    }

    const todayCount = todayApps?.length || 0;
    
    if (todayCount >= dailyLimit) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Daily application limit reached (${dailyLimit}). Try again tomorrow.`,
          appliedToday: todayCount,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Scrape new jobs
    console.log("Step 1: Scraping jobs...");
    const scrapeResponse = await supabase.functions.invoke("scrape-jobs", {
      body: {
        source: "all",
        keywords: preferences.keywords,
      },
    });

    if (scrapeResponse.error) {
      throw new Error(`Job scraping failed: ${scrapeResponse.error.message}`);
    }

    console.log(`Scraped ${scrapeResponse.data.jobsFound} jobs`);

    // Step 2: Find matching jobs that haven't been applied to
    const { data: appliedJobs } = await serviceSupabase
      .from("applications")
      .select("job_id")
      .eq("user_id", userId);

    const appliedJobIds = appliedJobs?.map(app => app.job_id) || [];

    // Build query for available jobs
    let query = serviceSupabase
      .from("job_postings")
      .select("*");

    // Only add the exclusion filter if there are applied jobs
    if (appliedJobIds.length > 0) {
      query = query.not("id", "in", `(${appliedJobIds.join(",")})`);
    }

    const { data: availableJobs, error: jobsError } = await query.limit(dailyLimit - todayCount);

    if (jobsError) {
      throw new Error(`Failed to fetch available jobs: ${jobsError.message}`);
    }

    if (!availableJobs || availableJobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No new jobs to apply to",
          appliedCount: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${availableJobs.length} jobs to apply to`);

    // Step 3: Apply to each job
    const results = [];
    for (const job of availableJobs) {
      try {
        // Generate email
        console.log(`Generating email for ${job.title} at ${job.company}...`);
        const emailResponse = await supabase.functions.invoke("generate-email", {
          body: {
            jobId: job.id,
            userId: userId,
            emailType: "application",
          },
        });

        if (emailResponse.error) {
          throw new Error(`Email generation failed: ${emailResponse.error.message}`);
        }

        // Extract company email (in production, you'd have logic to find the right contact)
        // For now, we'll use a placeholder
        const hrEmail = `hr@${job.company.toLowerCase().replace(/\s+/g, '')}.com`;

        // Send application
        console.log(`Sending application to ${hrEmail}...`);
        const sendResponse = await supabase.functions.invoke("send-application", {
          body: {
            jobId: job.id,
            userId: userId,
            subject: emailResponse.data.subject,
            body: emailResponse.data.body,
            toEmail: hrEmail,
          },
        });

        if (sendResponse.error) {
          throw new Error(`Email sending failed: ${sendResponse.error.message}`);
        }

        results.push({
          job: `${job.title} at ${job.company}`,
          status: "success",
        });

        console.log(`✓ Applied to ${job.title} at ${job.company}`);

      } catch (error) {
        console.error(`✗ Failed to apply to ${job.title} at ${job.company}:`, error);
        results.push({
          job: `${job.title} at ${job.company}`,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter(r => r.status === "success").length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Automation complete! Applied to ${successCount} out of ${availableJobs.length} jobs.`,
        appliedCount: successCount,
        results: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in automate-applications function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
