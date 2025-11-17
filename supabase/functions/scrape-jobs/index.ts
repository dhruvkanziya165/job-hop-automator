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
  job_type?: string;
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
    const { source, keywords, location, jobType } = await req.json();
    console.log(`Scraping jobs from ${source} with keywords:`, keywords, `location:`, location, `type:`, jobType);

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
        
        // Build search URL with keywords, location, and job type
        let searchUrl = boardUrl;
        const params: string[] = [];
        
        if (keywords && keywords.length > 0) {
          const keywordQuery = keywords.join("+");
          params.push(`keywords=${keywordQuery}`);
        }
        
        if (location && location !== "any") {
          params.push(`location=${encodeURIComponent(location)}`);
        }
        
        // Build URL based on board
        if (boardName === "internshala") {
          let internshalaUrl = boardUrl;
          if (keywords && keywords.length > 0) {
            internshalaUrl += `keywords-${keywords.join("-")}/`;
          }
          if (location && location !== "any") {
            internshalaUrl += `location-${location.toLowerCase().replace(/\s+/g, "-")}/`;
          }
          searchUrl = internshalaUrl;
        } else if (boardName === "linkedin") {
          const linkedinParams = [`f_TPR=r86400`];
          if (keywords && keywords.length > 0) {
            linkedinParams.push(`keywords=${keywords.join("+")}`);
          }
          if (location && location !== "any") {
            linkedinParams.push(`location=${encodeURIComponent(location)}`);
          }
          if (jobType === "internship") {
            linkedinParams.push(`f_JT=I`);
          } else if (jobType === "job") {
            linkedinParams.push(`f_JT=F`);
          }
          searchUrl = `${boardUrl}?${linkedinParams.join("&")}`;
        } else {
          // RemoteOK and Wellfound
          if (params.length > 0) {
            searchUrl = `${boardUrl}?${params.join("&")}`;
          }
        }

        // Use Firecrawl API to crawl (with pagination for more results)
        const crawlResponse = await fetch("https://api.firecrawl.dev/v1/crawl", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: searchUrl,
            limit: 100, // Crawl up to 100 pages per board
            scrapeOptions: {
              formats: ["markdown"],
            },
          }),
        });

        if (!crawlResponse.ok) {
          console.error(`Firecrawl API error for ${boardName}:`, crawlResponse.status);
          const errorText = await crawlResponse.text();
          console.error("Error details:", errorText);
          continue;
        }

        const crawlData = await crawlResponse.json();
        
        if (!crawlData.success) {
          console.error(`Failed to start crawl for ${boardName}`);
          continue;
        }

        // Poll for crawl completion
        const crawlId = crawlData.id;
        let crawlComplete = false;
        let attempts = 0;
        let crawlResults;

        while (!crawlComplete && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          
          const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
            headers: {
              "Authorization": `Bearer ${firecrawlApiKey}`,
            },
          });

          if (statusResponse.ok) {
            crawlResults = await statusResponse.json();
            if (crawlResults.status === "completed") {
              crawlComplete = true;
            } else if (crawlResults.status === "failed") {
              console.error(`Crawl failed for ${boardName}`);
              break;
            }
          }
          attempts++;
        }

        if (!crawlComplete || !crawlResults?.data) {
          console.error(`Crawl timeout or failed for ${boardName}`);
          continue;
        }

        // Parse jobs from all crawled pages
        console.log(`Processing ${crawlResults.data.length} pages from ${boardName}`);
        for (const page of crawlResults.data) {
          const jobs = parseJobsFromContent(
            page.markdown || "", 
            boardName, 
            page.url || boardUrl,
            jobType
          );
          allJobs = allJobs.concat(jobs);
        }
        
        console.log(`Found ${allJobs.length} total jobs so far from ${boardName}`);
      } catch (error) {
        console.error(`Error scraping ${boardName}:`, error);
      }
    }

    console.log(`Total jobs found before deduplication: ${allJobs.length}`);

    // Deduplicate jobs by title + company
    const uniqueJobs = new Map();
    for (const job of allJobs) {
      const key = `${job.company.toLowerCase()}-${job.title.toLowerCase()}`;
      if (!uniqueJobs.has(key)) {
        uniqueJobs.set(key, job);
      }
    }
    
    const deduplicatedJobs = Array.from(uniqueJobs.values());
    console.log(`Total unique jobs after deduplication: ${deduplicatedJobs.length}`);

    // Insert jobs into database in batches
    let insertedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < deduplicatedJobs.length; i += batchSize) {
      const batch = deduplicatedJobs.slice(i, i + batchSize);
      const jobsToInsert = batch.map(job => ({
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
        job_type: job.job_type || "job",
        external_id: `${job.company}-${job.title}`.replace(/\s+/g, "-").toLowerCase(),
        posted_date: job.posted_date,
        fetched_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("job_postings")
        .upsert(jobsToInsert, { onConflict: "external_id", ignoreDuplicates: true });

      if (error) {
        console.error("Error inserting batch:", error);
      } else {
        insertedCount += jobsToInsert.length;
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
function parseJobsFromContent(content: string, source: string, baseUrl: string, requestedJobType?: string): JobPosting[] {
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
      const title = titleMatch[1].trim().toLowerCase();
      const isInternship = title.includes("intern") || source === "internshala";
      
      // Determine job type
      let detectedJobType: string;
      if (isInternship) {
        detectedJobType = "internship";
      } else {
        detectedJobType = "job";
      }
      
      // Filter by requested job type
      if (requestedJobType && requestedJobType !== "both") {
        if (requestedJobType !== detectedJobType) {
          continue; // Skip this job if it doesn't match the requested type
        }
      }
      
      jobs.push({
        title: titleMatch[1].trim(),
        company: companyMatch ? companyMatch[1].trim() : "Unknown Company",
        location: locationMatch ? locationMatch[1].trim() : "Remote",
        description: section.slice(0, 500).trim(),
        url: urlMatch ? urlMatch[1] : baseUrl,
        salary_range: salaryMatch ? salaryMatch[0].trim() : undefined,
        posted_date: new Date().toISOString(),
        job_type: detectedJobType,
      });
    }
  }
  
  return jobs;
}
