import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const VALID_EMAIL_TYPES = ['application', 'followup'];

// Rate limit: 15 requests per minute per user
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60000;

const buildFallbackEmail = ({
  emailType,
  jobTitle,
  company,
  applicantName,
  skills,
}: {
  emailType: string;
  jobTitle: string;
  company: string;
  applicantName: string;
  skills: string;
}): string => {
  const topSkills = skills !== 'N/A'
    ? skills.split(',').map((skill) => skill.trim()).filter(Boolean).slice(0, 3).join(', ')
    : '';

  if (emailType === 'followup') {
    return `Hi ${company} hiring team,

I wanted to follow up on my application for the ${jobTitle} role. I'm still very interested in the opportunity and would love to learn about any updates on the hiring process.

Please let me know if I can share any additional information.

Best regards,
${applicantName}`;
  }

  return `Hi ${company} hiring team,

I'm reaching out to express my interest in the ${jobTitle} role. My background includes experience with ${topSkills || 'modern web technologies'}, and I enjoy building reliable, user-focused solutions that create real impact.

I'd welcome the chance to discuss how my skills could support your team. Thank you for your time and consideration.

Best regards,
${applicantName}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply rate limiting
    const rateLimitResult = checkRateLimit({
      maxRequests: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
      identifier: `generate-email:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(corsHeaders, rateLimitResult.resetIn);
    }

    const { jobId, userId, emailType = "application" } = await req.json();
    
    // Input validation
    if (!jobId || !validateUUID(jobId)) {
      return new Response(
        JSON.stringify({ error: "Invalid job ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId || !validateUUID(userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid user ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the authenticated user matches the userId in request
    if (user.id !== userId) {
      console.error("User ID mismatch: authenticated user", user.id, "vs requested", userId);
      return new Response(
        JSON.stringify({ error: "Forbidden: Cannot generate email for another user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email type
    const validatedEmailType = VALID_EMAIL_TYPES.includes(emailType) ? emailType : 'application';

    console.log(`User ${user.id} generating ${validatedEmailType} email for job ${jobId}`);

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from("job_postings")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    // Fetch user preferences for context
    const { data: preferences } = await supabaseAdmin
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Generate email using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert at writing professional, personalized cold emails for job applications. 
Generate a compelling email that:
- Is concise (under 150 words)
- Demonstrates genuine interest in the company
- Highlights relevant skills and experience
- Shows knowledge of the company's mission/product
- Ends with a clear call to action
- Uses a professional but friendly tone`;

    // Sanitize inputs for AI prompt
    const sanitizedJobTitle = String(job.title).substring(0, 200).replace(/[<>{}]/g, '');
    const sanitizedCompany = String(job.company).substring(0, 200).replace(/[<>{}]/g, '');
    const sanitizedLocation = job.location ? String(job.location).substring(0, 200).replace(/[<>{}]/g, '') : '';
    const sanitizedDescription = job.description ? String(job.description).substring(0, 2000).replace(/[<>{}]/g, '') : '';
    const sanitizedName = profile.full_name ? String(profile.full_name).substring(0, 100).replace(/[<>{}]/g, '') : 'Applicant';
    const sanitizedSkills = preferences?.keywords ? 
      (Array.isArray(preferences.keywords) ? preferences.keywords.slice(0, 10).join(", ") : "N/A") : "N/A";

    const userPrompt = validatedEmailType === "application" 
      ? `Generate a cold email for this job application:

Job Title: ${sanitizedJobTitle}
Company: ${sanitizedCompany}
Location: ${sanitizedLocation}
Description: ${sanitizedDescription}

Applicant Info:
Name: ${sanitizedName}
Skills: ${sanitizedSkills}

Write the email body only (no subject line). Make it personalized and compelling.`
      : `Generate a follow-up email for this job application:

Job Title: ${sanitizedJobTitle}
Company: ${sanitizedCompany}
Applicant: ${sanitizedName}

Write a brief follow-up email (under 100 words) checking on the application status.`;

    let emailBody = "";

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errorText);

        if (aiResponse.status !== 429 && aiResponse.status !== 402) {
          throw new Error("AI gateway error");
        }
      } else {
        const aiData = await aiResponse.json();
        emailBody = aiData?.choices?.[0]?.message?.content?.trim() ?? "";
      }
    } catch (aiError) {
      console.error("AI generation failed, using fallback email:", aiError);
    }

    if (!emailBody) {
      emailBody = buildFallbackEmail({
        emailType: validatedEmailType,
        jobTitle: sanitizedJobTitle,
        company: sanitizedCompany,
        applicantName: sanitizedName,
        skills: sanitizedSkills,
      });
    }

    // Generate subject line
    const subjectLine = validatedEmailType === "application"
      ? `Application for ${sanitizedJobTitle} - ${sanitizedName}`
      : `Following up on ${sanitizedJobTitle} application - ${sanitizedName}`;

    console.log("Email generated successfully for user:", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        subject: subjectLine,
        body: emailBody,
        job: {
          title: job.title,
          company: job.company,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
