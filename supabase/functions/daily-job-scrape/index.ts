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
    console.log("Starting daily job scraping...");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
    const allKeywords = new Set<string>();
    const allLocations = new Set<string>();
    let hasInternships = false;
    let hasJobs = false;

    for (const user of activeUsers || []) {
      user.keywords?.forEach((k: string) => allKeywords.add(k));
      user.locations?.forEach((l: string) => allLocations.add(l));
      if (user.job_type === "internship" || user.job_type === "both") hasInternships = true;
      if (user.job_type === "job" || user.job_type === "both") hasJobs = true;
    }

    console.log(`Scraping with keywords: ${Array.from(allKeywords).join(", ")}`);
    console.log(`Scraping locations: ${Array.from(allLocations).join(", ")}`);

    // Scrape jobs for internships
    if (hasInternships) {
      console.log("Scraping internships...");
      const { data: internshipData, error: internshipError } = await supabase.functions.invoke("scrape-jobs", {
        body: {
          source: "all",
          keywords: Array.from(allKeywords),
          location: Array.from(allLocations)[0] || "any",
          jobType: "internship",
        },
      });

      if (internshipError) {
        console.error("Error scraping internships:", internshipError);
      } else {
        console.log(`Internship scraping completed: ${internshipData?.jobsInserted || 0} new internships`);
      }
    }

    // Scrape jobs
    if (hasJobs) {
      console.log("Scraping jobs...");
      const { data: jobData, error: jobError } = await supabase.functions.invoke("scrape-jobs", {
        body: {
          source: "all",
          keywords: Array.from(allKeywords),
          location: Array.from(allLocations)[0] || "any",
          jobType: "job",
        },
      });

      if (jobError) {
        console.error("Error scraping jobs:", jobError);
      } else {
        console.log(`Job scraping completed: ${jobData?.jobsInserted || 0} new jobs`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily job scraping completed successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in daily-job-scrape function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
