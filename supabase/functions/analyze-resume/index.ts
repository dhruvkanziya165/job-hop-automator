import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_RESUME_LENGTH = 50000;
const MAX_JOB_DESCRIPTION_LENGTH = 20000;
const VALID_ANALYSIS_TYPES = ['ats', 'keywords', 'tailor', 'comprehensive'];

// Rate limit: 10 requests per minute per user
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
      identifier: `analyze-resume:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(corsHeaders, rateLimitResult.resetIn);
    }

    const { resumeText, jobDescription, analysisType } = await req.json();
    
    // Input validation
    if (!resumeText || typeof resumeText !== 'string') {
      return new Response(
        JSON.stringify({ error: "Resume text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (resumeText.length > MAX_RESUME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Resume text must be under ${MAX_RESUME_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (jobDescription && typeof jobDescription === 'string' && jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Job description must be under ${MAX_JOB_DESCRIPTION_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate analysis type
    const validatedAnalysisType = VALID_ANALYSIS_TYPES.includes(analysisType) ? analysisType : 'comprehensive';

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`User ${user.id} analyzing resume with type: ${validatedAnalysisType}`);

    // Sanitize inputs for AI prompt (escape special characters that could be used for prompt injection)
    const sanitizedResume = resumeText.substring(0, MAX_RESUME_LENGTH).replace(/[<>{}]/g, '');
    const sanitizedJobDescription = jobDescription ? 
      String(jobDescription).substring(0, MAX_JOB_DESCRIPTION_LENGTH).replace(/[<>{}]/g, '') : '';

    let systemPrompt = "";
    let userPrompt = "";

    if (validatedAnalysisType === "ats") {
      systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze resumes for ATS compatibility and provide detailed scoring.`;
      userPrompt = `Analyze this resume for ATS compatibility and provide:
1. An ATS score from 0-100
2. Key issues that would cause ATS rejection
3. Formatting recommendations
4. Keyword optimization suggestions

Resume:
${sanitizedResume}

${sanitizedJobDescription ? `Target Job Description:\n${sanitizedJobDescription}` : ''}

Respond in JSON format:
{
  "atsScore": number,
  "issues": ["string array of issues"],
  "formattingTips": ["string array of formatting tips"],
  "keywordSuggestions": ["string array of keywords to add"],
  "overallFeedback": "string summary"
}`;
    } else if (validatedAnalysisType === "keywords") {
      systemPrompt = `You are an expert resume keyword optimizer. Analyze resumes against job descriptions to identify keyword gaps.`;
      userPrompt = `Compare this resume against the job description and identify:
1. Matching keywords found in the resume
2. Missing important keywords from the job description
3. Suggestions for incorporating missing keywords naturally

Resume:
${sanitizedResume}

Job Description:
${sanitizedJobDescription}

Respond in JSON format:
{
  "matchingKeywords": ["array of matched keywords"],
  "missingKeywords": ["array of missing keywords"],
  "keywordDensity": number (percentage of job keywords found),
  "suggestions": ["array of suggestions for adding keywords"],
  "priorityKeywords": ["top 5 most important keywords to add"]
}`;
    } else if (validatedAnalysisType === "tailor") {
      systemPrompt = `You are an expert resume writer who tailors resumes for specific job applications while maintaining authenticity.`;
      userPrompt = `Tailor this resume for the specific job description. Rewrite sections to:
1. Highlight relevant experience
2. Incorporate important keywords naturally
3. Align achievements with job requirements
4. Optimize for both ATS and human readers

Original Resume:
${sanitizedResume}

Target Job Description:
${sanitizedJobDescription}

Respond in JSON format:
{
  "tailoredResume": "full tailored resume text",
  "changesExplanation": ["array explaining each major change"],
  "highlightedSkills": ["skills emphasized for this role"],
  "estimatedMatchScore": number (0-100)
}`;
    } else {
      systemPrompt = `You are an expert resume analyst providing comprehensive resume feedback.`;
      userPrompt = `Provide a comprehensive analysis of this resume including:
1. Overall quality score
2. Strengths
3. Areas for improvement
4. ATS compatibility assessment
5. Professional recommendations

Resume:
${sanitizedResume}

${sanitizedJobDescription ? `Target Job Description:\n${sanitizedJobDescription}` : ''}

Respond in JSON format:
{
  "overallScore": number (0-100),
  "strengths": ["array of strengths"],
  "improvements": ["array of improvement areas"],
  "atsCompatibility": number (0-100),
  "recommendations": ["array of specific recommendations"],
  "summary": "brief overall assessment"
}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Parse the JSON response
    let parsedContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      parsedContent = { error: "Failed to parse response", raw: content };
    }

    console.log("Resume analysis completed successfully for user:", user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      analysisType: validatedAnalysisType,
      result: parsedContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-resume function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
