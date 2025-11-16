import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobPosting {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary_range?: string;
  posted_date: string;
}

// Job board URLs to scrape using Firecrawl
const JOB_BOARDS: Record<string, string> = {
  internshala: "https://internshala.com/internships/",
  remoteok: "https://remoteok.com/",
  wellfound: "https://wellfound.com/jobs",
  linkedin: "https://www.linkedin.com/jobs/search/",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source, keywords } = await req.json();
    console.log(`Scraping jobs from ${source} with keywords:`, keywords);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      console.error("FIRECRAWL_API_KEY not configured, using mock data");
      // Fallback to mock data if Firecrawl is not configured
      const mockJobs = [{
        title: "Software Engineer",
        company: "Tech Company",
        location: "Remote",
        description: "Build amazing products",
        url: "https://example.com/jobs/1",
        source: "Mock",
        salary_range: "$80k-$120k",
        external_id: `mock-${Date.now()}`,
        posted_date: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
      }];

      await supabase.from("job_postings").upsert(mockJobs, { onConflict: "external_id" });
      
      return new Response(JSON.stringify({
        success: true,
        jobsFound: 1,
        jobsInserted: 1,
        jobs: mockJobs,
        note: "Using mock data - configure FIRECRAWL_API_KEY for real scraping"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let allJobs: JobPosting[] = [];

    // Determine which sites to scrape
    const sitesToScrape = source === "all" 
      ? Object.entries(JOB_BOARDS)
      : [[source, JOB_BOARDS[source]]].filter(([_, url]) => url);

    // Scrape each job board
    for (const [boardName, boardUrl] of sitesToScrape) {
      try {
        console.log(`Scraping ${boardName} from ${boardUrl}`);
        
        // Build search URL with keywords
        let searchUrl = boardUrl;
        if (keywords && keywords.length > 0) {
          const keywordQuery = keywords.join("+");
          if (boardName === "internshala") {
            searchUrl = `${boardUrl}keywords-${keywordQuery}/`;
          } else if (boardName === "linkedin") {
            searchUrl = `${boardUrl}?keywords=${keywordQuery}&f_TPR=r86400`;
          } else {
            searchUrl = `${boardUrl}?q=${keywordQuery}`;
          }
        }

        // Use Firecrawl API to scrape
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: searchUrl,
            formats: ["markdown"],
          }),
        });

        if (!scrapeResponse.ok) {
          console.error(`Firecrawl API error for ${boardName}:`, scrapeResponse.status);
          const errorText = await scrapeResponse.text();
          console.error("Error details:", errorText);
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        
        if (!scrapeData.success || !scrapeData.data) {
          console.error(`Failed to scrape ${boardName}`);
          continue;
        }

        // Parse jobs from the scraped content
        const jobs = parseJobsFromContent(
          scrapeData.data.markdown || "", 
          boardName, 
          boardUrl
        );
        allJobs = allJobs.concat(jobs);
        
        console.log(`Found ${jobs.length} jobs from ${boardName}`);
      } catch (error) {
        console.error(`Error scraping ${boardName}:`, error);
      }
    }

    console.log(`Total jobs found: ${allJobs.length}`);

    // Insert jobs into database
    let insertedCount = 0;
    for (const job of allJobs) {
      const { error } = await supabase
        .from("job_postings")
        .upsert(
          {
            title: job.title,
            company: job.company,
            location: job.location || "Not specified",
            description: job.description,
            url: job.url,
            source: job.url.includes("internshala") ? "Internshala" : 
                   job.url.includes("remoteok") ? "RemoteOK" : 
                   job.url.includes("wellfound") ? "Wellfound" :
                   job.url.includes("linkedin") ? "LinkedIn" : "Other",
            salary_range: job.salary_range,
            external_id: `${job.company}-${job.title}-${Date.now()}`.replace(/\s+/g, "-").toLowerCase(),
            posted_date: job.posted_date,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "external_id" }
        );

      if (error) {
        console.error("Error inserting job:", error);
      } else {
        insertedCount++;
      }
    }

    console.log(`Inserted ${insertedCount} new jobs`);

    return new Response(
      JSON.stringify({
        success: true,
        jobsFound: allJobs.length,
        jobsInserted: insertedCount,
        jobs: allJobs.slice(0, 10), // Return first 10 for preview
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

// Helper function to parse jobs from scraped content
function parseJobsFromContent(content: string, source: string, baseUrl: string): JobPosting[] {
  const jobs: JobPosting[] = [];
  
  // Split content into sections
  const sections = content.split(/\n\n+/);
  
  for (const section of sections) {
    // Look for job title patterns
    const titleMatch = section.match(/^#+\s*(.+?)(?:\n|$)/m) || 
                      section.match(/^(.+?(?:Engineer|Developer|Intern|Manager|Analyst|Designer).+?)$/m);
    
    const companyMatch = section.match(/(?:Company|at|@)\s*[:\-]?\s*([A-Z][A-Za-z\s&\.,']+?)(?:\n|$)/i);
    const locationMatch = section.match(/(?:Location|Remote|Hybrid|Office)\s*[:\-]?\s*([A-Za-z\s,]+?)(?:\n|$)/i);
    const salaryMatch = section.match(/(?:\$|₹|€)[\d,k\-\s]+(?:\/year|per year|\/month)?/i);
    const urlMatch = section.match(/(https?:\/\/[^\s\)]+)/);
    
    // Only create job posting if we have at least a title and company or URL
    if (titleMatch && (companyMatch || urlMatch)) {
      jobs.push({
        title: titleMatch[1].trim(),
        company: companyMatch ? companyMatch[1].trim() : "Unknown Company",
        location: locationMatch ? locationMatch[1].trim() : "Remote",
        description: section.slice(0, 500).trim(),
        url: urlMatch ? urlMatch[1] : baseUrl,
        salary_range: salaryMatch ? salaryMatch[0].trim() : undefined,
        posted_date: new Date().toISOString(),
      });
    }
  }
  
  return jobs;
}
