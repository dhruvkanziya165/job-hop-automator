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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Parse request body for manual trigger options
  let scrapeType = "scheduled";
  let requestedKeywords: string[] = [];
  let requestedLocations: string[] = [];

  try {
    const body = await req.json().catch(() => ({}));
    scrapeType = body.scrapeType || "scheduled";
    requestedKeywords = body.keywords || [];
    requestedLocations = body.locations || [];
  } catch {
    // Use defaults for cron-triggered calls
  }

  // Create a log entry
  const { data: logEntry, error: logError } = await supabase
    .from("job_scrape_logs")
    .insert({
      scrape_type: scrapeType,
      status: "running",
      keywords: requestedKeywords,
      locations: requestedLocations,
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (logError) {
    console.error("Error creating log entry:", logError);
  }

  const logId = logEntry?.id;
  let totalJobsFound = 0;
  let totalJobsInserted = 0;

  try {
    console.log(`Starting ${scrapeType} job scraping...`);
    
    // Get all active users with preferences
    const { data: activeUsers, error: usersError } = await supabase
      .from("user_preferences")
      .select("user_id, keywords, locations, job_type")
      .eq("is_active", true);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    console.log(`Found ${activeUsers?.length || 0} active users`);

    // Aggregate all unique keywords and locations
    const allKeywords = new Set<string>(requestedKeywords);
    const allLocations = new Set<string>(requestedLocations);
    let hasInternships = false;
    let hasJobs = false;

    for (const user of activeUsers || []) {
      user.keywords?.forEach((k: string) => allKeywords.add(k));
      user.locations?.forEach((l: string) => allLocations.add(l));
      if (user.job_type === "internship" || user.job_type === "both") hasInternships = true;
      if (user.job_type === "job" || user.job_type === "both") hasJobs = true;
    }

    // Default keywords if none found
    if (allKeywords.size === 0) {
      ["software", "developer", "engineer", "data", "product"].forEach(k => allKeywords.add(k));
    }
    if (allLocations.size === 0) {
      ["Bangalore", "Mumbai", "Delhi NCR", "Hyderabad"].forEach(l => allLocations.add(l));
    }

    const keywordsArray = Array.from(allKeywords);
    const locationsArray = Array.from(allLocations);

    console.log(`Scraping with keywords: ${keywordsArray.join(", ")}`);
    console.log(`Scraping locations: ${locationsArray.join(", ")}`);

    // Update log with keywords and locations
    if (logId) {
      await supabase
        .from("job_scrape_logs")
        .update({ keywords: keywordsArray, locations: locationsArray })
        .eq("id", logId);
    }

    // Scrape jobs for internships
    if (hasInternships || scrapeType === "manual") {
      console.log("Scraping internships...");
      const { data: internshipData, error: internshipError } = await supabase.functions.invoke("scrape-jobs", {
        body: {
          source: "all",
          keywords: keywordsArray,
          location: locationsArray[0] || "India",
          jobType: "internship",
        },
      });

      if (internshipError) {
        console.error("Error scraping internships:", internshipError);
      } else {
        totalJobsFound += internshipData?.jobsFound || 0;
        totalJobsInserted += internshipData?.jobsInserted || 0;
        console.log(`Internship scraping completed: ${internshipData?.jobsInserted || 0} new internships`);
      }
    }

    // Scrape jobs
    if (hasJobs || scrapeType === "manual") {
      console.log("Scraping jobs...");
      const { data: jobData, error: jobError } = await supabase.functions.invoke("scrape-jobs", {
        body: {
          source: "all",
          keywords: keywordsArray,
          location: locationsArray[0] || "India",
          jobType: "job",
        },
      });

      if (jobError) {
        console.error("Error scraping jobs:", jobError);
      } else {
        totalJobsFound += jobData?.jobsFound || 0;
        totalJobsInserted += jobData?.jobsInserted || 0;
        console.log(`Job scraping completed: ${jobData?.jobsInserted || 0} new jobs`);
      }
    }

    // Also seed some new jobs to ensure fresh content
    console.log("Seeding additional jobs...");
    const { data: seedData, error: seedError } = await supabase.functions.invoke("seed-india-jobs", {
      body: {
        count: 200,
        location: "all",
        category: "all"
      }
    });

    if (!seedError && seedData) {
      totalJobsInserted += seedData.jobsInserted || 0;
      console.log(`Seeded ${seedData.jobsInserted || 0} additional jobs`);
    }

    // Update log entry with success
    if (logId) {
      await supabase
        .from("job_scrape_logs")
        .update({
          status: "completed",
          jobs_found: totalJobsFound,
          jobs_inserted: totalJobsInserted,
          completed_at: new Date().toISOString()
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${scrapeType === "manual" ? "Manual" : "Daily"} job scraping completed successfully`,
        jobsFound: totalJobsFound,
        jobsInserted: totalJobsInserted,
        logId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in daily-job-scrape function:", error);
    
    // Update log entry with error
    if (logId) {
      await supabase
        .from("job_scrape_logs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          completed_at: new Date().toISOString()
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
