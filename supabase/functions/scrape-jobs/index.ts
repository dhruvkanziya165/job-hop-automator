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

// Job board URLs to scrape using Firecrawl - Enhanced with more sources
const JOB_BOARDS: Record<string, string> = {
  internshala: "https://internshala.com/internships/",
  remoteok: "https://remoteok.com/",
  wellfound: "https://wellfound.com/jobs",
  linkedin: "https://www.linkedin.com/jobs/search/",
  naukri: "https://www.naukri.com/",
  fresherworld: "https://www.freshersworld.com/",
  indeed: "https://www.indeed.com/jobs",
  glassdoor: "https://www.glassdoor.com/Job/",
  monster: "https://www.monster.com/jobs/search",
  simplyhired: "https://www.simplyhired.com/search",
  ziprecruiter: "https://www.ziprecruiter.com/jobs",
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
          // Internshala India-focused job board - use multiple category pages
          const categories = keywords && keywords.length > 0 
            ? keywords.map((k: string) => k.toLowerCase().replace(/\s+/g, "-"))
            : ["computer-science", "engineering", "software-development", "web-development", "data-science"];
          
          // Build URL with first category
          let internshalaUrl = "https://internshala.com/";
          
          if (jobType === "internship" || jobType === "both") {
            internshalaUrl += "internships/";
          } else {
            internshalaUrl += "jobs/";
          }
          
          // Add category and location
          internshalaUrl += `${categories[0]}-`;
          
          if (location && location !== "any") {
            const locationSlug = location.toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/,/g, "");
            internshalaUrl += `in-${locationSlug}`;
          } else {
            internshalaUrl += "india";
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
        } else if (boardName === "naukri" || boardName === "fresherworld") {
          // Indian job boards
          const keywordQuery = keywords && keywords.length > 0 ? keywords.join("-") : "software-developer";
          const locationQuery = location && location !== "any" ? location.toLowerCase().replace(/\s+/g, "-") : "india";
          
          if (boardName === "naukri") {
            searchUrl = `https://www.naukri.com/${keywordQuery}-jobs-in-${locationQuery}`;
          } else {
            searchUrl = `https://www.freshersworld.com/jobs/jobsearch/${keywordQuery}-jobs-in-${locationQuery}`;
          }
        } else if (boardName === "indeed") {
          // Indeed job board
          const indeedParams: string[] = [];
          if (keywords && keywords.length > 0) {
            indeedParams.push(`q=${encodeURIComponent(keywords.join(" "))}`);
          }
          if (location && location !== "any") {
            indeedParams.push(`l=${encodeURIComponent(location)}`);
          }
          indeedParams.push(`fromage=7`); // Last 7 days
          searchUrl = `${boardUrl}?${indeedParams.join("&")}`;
        } else if (boardName === "glassdoor") {
          // Glassdoor job board
          const keywordQuery = keywords && keywords.length > 0 ? keywords.join("-") : "software-engineer";
          const locationQuery = location && location !== "any" ? location.toLowerCase().replace(/\s+/g, "-") : "";
          searchUrl = `https://www.glassdoor.com/Job/${locationQuery}-${keywordQuery}-jobs-SRCH_KO0,${keywordQuery.length}.htm`;
        } else if (boardName === "monster") {
          // Monster job board
          const monsterParams: string[] = [];
          if (keywords && keywords.length > 0) {
            monsterParams.push(`q=${encodeURIComponent(keywords.join(" "))}`);
          }
          if (location && location !== "any") {
            monsterParams.push(`where=${encodeURIComponent(location)}`);
          }
          searchUrl = `${boardUrl}?${monsterParams.join("&")}`;
        } else if (boardName === "simplyhired") {
          // SimplyHired job board
          const shParams: string[] = [];
          if (keywords && keywords.length > 0) {
            shParams.push(`q=${encodeURIComponent(keywords.join(" "))}`);
          }
          if (location && location !== "any") {
            shParams.push(`l=${encodeURIComponent(location)}`);
          }
          searchUrl = `${boardUrl}?${shParams.join("&")}`;
        } else if (boardName === "ziprecruiter") {
          // ZipRecruiter job board
          const zrParams: string[] = [];
          if (keywords && keywords.length > 0) {
            zrParams.push(`search=${encodeURIComponent(keywords.join(" "))}`);
          }
          if (location && location !== "any") {
            zrParams.push(`location=${encodeURIComponent(location)}`);
          }
          searchUrl = `${boardUrl}?${zrParams.join("&")}`;
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
            limit: 300, // Increased to 300 pages for comprehensive coverage
            scrapeOptions: {
              formats: ["markdown"],
              includePaths: boardName === "internshala" 
                ? ["internships/*", "jobs/*"]
                : boardName === "naukri"
                ? ["*-jobs-*"]
                : boardName === "fresherworld"
                ? ["jobs/*"]
                : undefined,
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
               job.url.includes("linkedin") ? "LinkedIn" :
               job.url.includes("naukri") ? "Naukri" :
               job.url.includes("freshersworld") ? "FreshersWorld" :
               job.url.includes("indeed") ? "Indeed" :
               job.url.includes("glassdoor") ? "Glassdoor" :
               job.url.includes("monster") ? "Monster" :
               job.url.includes("simplyhired") ? "SimplyHired" :
               job.url.includes("ziprecruiter") ? "ZipRecruiter" : "Other",
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
    
    // Helper to clean markdown and formatting
    const cleanText = (text: string): string => {
      if (!text) return "";
      return text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
        .replace(/[#*_`]/g, '') // Remove markdown symbols
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    // Enhanced patterns for better extraction - more lenient matching with more roles
    const titleMatch = section.match(/^#+\s*(.+?)(?:\n|$)/m) || 
                      section.match(/^[*_]*(.+?(?:Engineer|Developer|Intern|Manager|Analyst|Designer|Architect|Specialist|Lead|Executive|Associate|Trainee|Consultant|Coordinator|Officer|Assistant|Graduate|Fresher|Entry|Junior|Senior|Full Stack|Frontend|Backend|Data|Software|Web|Mobile|Cloud|DevOps|QA|Testing|Marketing|Sales|HR|Finance|Operations).+?)[*_]*$/mi) ||
                      section.match(/\*\*(.+?(?:Engineer|Developer|Intern|Manager|Analyst|Designer|role|position|opportunity|opening|vacancy).+?)\*\*/i) ||
                      section.match(/^(?:Job Title|Position|Role)\s*[:\-]\s*(.+?)(?:\n|$)/mi);
    
    // Better company extraction - more patterns and lenient matching
    const companyMatch = section.match(/(?:Company|Organization|Employer|at|@|by|with|for)\s*[:\-]?\s*([A-Z][A-Za-z\s&\.\-,']{2,50})(?:\n|\||$)/i) ||
                        section.match(/([A-Z][A-Za-z\s&\.]{2,30})\s*(?:is hiring|seeks|looking for|invites|announces|offers)/i) ||
                        section.match(/\*\*(?:Company|Organization|Employer)\*\*\s*[:\-]?\s*(.+?)(?:\n|$)/i) ||
                        section.match(/^([A-Z][A-Za-z\s&\.]{3,40})\s*[\-–]\s*(?:Hiring|Job|Internship|Opening|Vacancy)/i);
    
    // Better location extraction - include Indian cities and more patterns
    const locationMatch = section.match(/(?:Location|Based in|Office|Work from|City|Place)\s*[:\-]?\s*([A-Za-z\s,\-]+?)(?:\n|\||$)/i) ||
                         section.match(/\b(Remote|Hybrid|On-?site|WFH|Work from Home|Work From Anywhere|Pan India|India|Mumbai|Delhi|Bangalore|Bengaluru|Hyderabad|Chennai|Pune|Kolkata|Ahmedabad|Surat|Jaipur|Lucknow|Kanpur|Nagpur|Indore|Noida|Gurugram|Gurgaon|Kochi|Coimbatore|Vadodara|Chandigarh|Visakhapatnam|Bhopal|Patna|Ludhiana|Agra|Nashik|Faridabad|Meerut|Rajkot|Varanasi|Srinagar|Aurangabad|Dhanbad|Amritsar|Ranchi)\b/i) ||
                         section.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:India|Gujarat|Maharashtra|Karnataka|Tamil Nadu|Delhi|Telangana|West Bengal|Rajasthan|Uttar Pradesh|Madhya Pradesh|Kerala|Punjab|Haryana))\b/i) ||
                         section.match(/\*\*(?:Location|City)\*\*\s*[:\-]?\s*(.+?)(?:\n|$)/i);
    
    // Better salary extraction with INR support - more formats
    const salaryMatch = section.match(/(?:Salary|Compensation|Pay|CTC|Stipend|Package)\s*[:\-]?\s*([\d,k₹\$€£\-\s\/]+(?:per year|per month|\/yr|\/mo|LPA|lpa|PA|per annum|pm|\/month)?)/i) ||
                       section.match(/([\$₹€£][\d,k\-\s]+(?:per year|per month|\/yr|\/mo|LPA|lpa|PA|per annum)?)/i) ||
                       section.match(/(\d+[\s\-]+\d+\s*(?:LPA|lpa|Lacs?|lakhs?|k|K))/i) ||
                       section.match(/\*\*(?:Salary|Stipend|CTC)\*\*\s*[:\-]?\s*(.+?)(?:\n|$)/i);
    
    // Extract URL from section
    const urlMatch = section.match(/(https?:\/\/[^\s\)\]]+)/);
    
    // Better description extraction - get more context
    let description = section
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/^#+\s*/gm, '') // Remove markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/[*_`]/g, '') // Remove markdown formatting
      .replace(/\s+/g, ' ') // Normalize whitespace
      .slice(0, 500) // Increase description length
      .trim();
    
    // Only create job posting if we have meaningful data - more lenient
    if (titleMatch && titleMatch[1].length > 5 && !titleMatch[1].toLowerCase().includes('looking to')) {
      const title = cleanText(titleMatch[1]);
      const isInternship = title.toLowerCase().includes("intern") || 
                          source === "internshala" ||
                          section.toLowerCase().includes("internship") ||
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
        companyName = cleanText(companyMatch[1]);
      } else if (source === "internshala") {
        companyName = "Internshala Partner";
      } else if (source === "linkedin") {
        companyName = "LinkedIn Company";
      } else if (source === "naukri") {
        companyName = "Naukri Partner";
      } else if (source === "fresherworld") {
        companyName = "FreshersWorld Partner";
      }
      
      // Better location handling with normalization
      let location = "Remote";
      if (locationMatch) {
        location = locationMatch[1].trim();
        // Normalize common variations
        location = location
          .replace(/Bengaluru/gi, "Bangalore")
          .replace(/Gurgaon/gi, "Gurugram")
          .replace(/\bNCR\b/gi, "Delhi NCR")
          .replace(/WFH/gi, "Remote")
          .replace(/Work from Home/gi, "Remote")
          .replace(/Work From Anywhere/gi, "Remote");
        
        // Add "India" suffix for Indian cities if not present
        const indianCities = [
          'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
          'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
          'Noida', 'Gurugram', 'Kochi', 'Coimbatore', 'Vadodara', 'Chandigarh'
        ];
        const hasIndianCity = indianCities.some(city => 
          location.toLowerCase().includes(city.toLowerCase())
        );
        if (hasIndianCity && !location.toLowerCase().includes('india') && !location.includes(',')) {
          location = `${location}, India`;
        }
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
