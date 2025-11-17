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
        
        // Build URL based on board with better filtering
        if (boardName === "internshala") {
          let internshalaUrl = boardUrl;
          if (keywords && keywords.length > 0) {
            // Use first keyword as main search term for better results
            internshalaUrl += `${keywords[0].toLowerCase().replace(/\s+/g, "-")}-`;
          }
          if (location && location !== "any") {
            internshalaUrl += `location-${location.toLowerCase().replace(/\s+/g, "-")}/`;
          } else {
            internshalaUrl += "internship/";
          }
          searchUrl = internshalaUrl;
        } else if (boardName === "linkedin") {
          const linkedinParams = [`f_TPR=r86400`]; // Jobs from last 24 hours
          if (keywords && keywords.length > 0) {
            // Use space-separated keywords for better search
            linkedinParams.push(`keywords=${encodeURIComponent(keywords.join(" "))}`);
          }
          if (location && location !== "any") {
            linkedinParams.push(`location=${encodeURIComponent(location)}`);
          }
          // Add job type filter
          if (jobType === "internship") {
            linkedinParams.push(`f_JT=I`);
          } else if (jobType === "job") {
            linkedinParams.push(`f_JT=F`);
          }
          // Add experience level for better matches
          linkedinParams.push(`f_E=2`); // Entry level and associate
          searchUrl = `${boardUrl}?${linkedinParams.join("&")}`;
        } else {
          // RemoteOK and Wellfound - add keyword filters
          if (keywords && keywords.length > 0 && params.length > 0) {
            searchUrl = `${boardUrl}?${params.join("&")}`;
          } else if (keywords && keywords.length > 0) {
            // For RemoteOK, add skill-based filtering
            searchUrl = `${boardUrl}/${keywords[0].toLowerCase()}`;
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
    // Skip sections that are navigation or footer content
    if (section.toLowerCase().includes('click here') || 
        section.toLowerCase().includes('create your account') ||
        section.toLowerCase().includes('register') ||
        section.length < 50) {
      continue;
    }
    
    // Enhanced patterns for better extraction
    const titleMatch = section.match(/^#+\s*(.+?)(?:\n|$)/m) || 
                      section.match(/^[*_]*(.+?(?:Engineer|Developer|Intern|Manager|Analyst|Designer|Architect|Specialist|Lead).+?)[*_]*$/m);
    
    // Better company extraction
    const companyMatch = section.match(/(?:Company|at|@|by)\s*[:\-]?\s*([A-Z][A-Za-z\s&\.\-,']{2,50})(?:\n|\||$)/i) ||
                        section.match(/([A-Z][A-Za-z\s&\.]{2,30})\s*(?:is hiring|seeks|looking for)/i);
    
    // Better location extraction
    const locationMatch = section.match(/(?:Location|Based in|Office|Work from)\s*[:\-]?\s*([A-Za-z\s,\-]+?)(?:\n|\||$)/i) ||
                         section.match(/\b(Remote|Hybrid|On-?site|WFH|Work from Home)\b/i) ||
                         section.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,})\b/);
    
    // Better salary extraction  
    const salaryMatch = section.match(/(?:Salary|Compensation|Pay|CTC|Stipend)\s*[:\-]?\s*([\d,k₹\$€£\-\s\/]+(?:per year|per month|\/yr|\/mo|LPA|PA)?)/i) ||
                       section.match(/([\$₹€£][\d,k\-\s]+(?:per year|per month|\/yr|\/mo|LPA|PA)?)/i);
    
    // Extract URL from section
    const urlMatch = section.match(/(https?:\/\/[^\s\)\]]+)/);
    
    // Better description extraction
    let description = section
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/^#+\s*/gm, '') // Remove markdown headers
      .slice(0, 300)
      .trim();
    
    // Only create job posting if we have meaningful data
    if (titleMatch && titleMatch[1].length > 10 && !titleMatch[1].toLowerCase().includes('looking to')) {
      const title = titleMatch[1].trim();
      const isInternship = title.toLowerCase().includes("intern") || 
                          source === "internshala" ||
                          description.toLowerCase().includes("internship");
      
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
          continue;
        }
      }
      
      // Extract better company name or use source as fallback
      let companyName = "Various Companies";
      if (companyMatch && companyMatch[1].trim().length > 2) {
        companyName = companyMatch[1].trim();
      } else if (source === "internshala") {
        companyName = "Internshala Partner";
      } else if (source === "linkedin") {
        companyName = "LinkedIn Company";
      }
      
      // Better location handling
      let location = "Remote";
      if (locationMatch) {
        location = locationMatch[1].trim();
      }
      
      jobs.push({
        title: title,
        company: companyName,
        location: location,
        description: description,
        url: urlMatch ? urlMatch[1] : baseUrl,
        salary_range: salaryMatch ? salaryMatch[1].trim() : undefined,
        posted_date: new Date().toISOString(),
        job_type: detectedJobType,
      });
    }
  }
  
  return jobs;
}
