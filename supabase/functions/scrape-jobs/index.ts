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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { source, keywords } = await req.json();
    console.log(`Scraping jobs from ${source} with keywords:`, keywords);

    // Mock job scraping - in production, you'd integrate with real APIs or web scraping
    const mockJobs = [
      {
        title: "Software Engineer Intern",
        company: "YC Startup Alpha",
        location: "San Francisco, CA",
        description: "Join our growing team to build innovative products...",
        url: "https://example.com/jobs/1",
        source: "YC",
        salary_range: "$80k-$100k",
        external_id: "yc-alpha-1",
        posted_date: new Date().toISOString(),
      },
      {
        title: "Full Stack Developer",
        company: "TechCorp Beta",
        location: "Remote",
        description: "Work on cutting-edge web applications...",
        url: "https://example.com/jobs/2",
        source: "LinkedIn",
        salary_range: "$90k-$120k",
        external_id: "linkedin-beta-2",
        posted_date: new Date().toISOString(),
      },
      {
        title: "Backend Engineer",
        company: "StartupGamma",
        location: "New York, NY",
        description: "Build scalable backend systems...",
        url: "https://example.com/jobs/3",
        source: "Indeed",
        salary_range: "$100k-$130k",
        external_id: "indeed-gamma-3",
        posted_date: new Date().toISOString(),
      },
    ];

    // Filter jobs based on keywords if provided
    const filteredJobs = keywords && keywords.length > 0
      ? mockJobs.filter(job => 
          keywords.some((keyword: string) => 
            job.title.toLowerCase().includes(keyword.toLowerCase()) ||
            job.description.toLowerCase().includes(keyword.toLowerCase())
          )
        )
      : mockJobs;

    console.log(`Found ${filteredJobs.length} jobs`);

    // Insert jobs into database (avoiding duplicates by external_id)
    let insertedCount = 0;
    for (const job of filteredJobs) {
      const { error } = await supabase
        .from("job_postings")
        .upsert({
          ...job,
          fetched_at: new Date().toISOString(),
        }, {
          onConflict: "external_id",
          ignoreDuplicates: true,
        });

      if (!error) {
        insertedCount++;
      } else {
        console.error("Error inserting job:", error);
      }
    }

    console.log(`Inserted ${insertedCount} new jobs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobsFound: filteredJobs.length,
        jobsInserted: insertedCount,
        jobs: filteredJobs 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in scrape-jobs function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
