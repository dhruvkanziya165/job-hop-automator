import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, jobDescription, analysisType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing resume with type:", analysisType);

    let systemPrompt = "";
    let userPrompt = "";

    if (analysisType === "ats") {
      systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze resumes for ATS compatibility and provide detailed scoring.`;
      userPrompt = `Analyze this resume for ATS compatibility and provide:
1. An ATS score from 0-100
2. Key issues that would cause ATS rejection
3. Formatting recommendations
4. Keyword optimization suggestions

Resume:
${resumeText}

${jobDescription ? `Target Job Description:\n${jobDescription}` : ''}

Respond in JSON format:
{
  "atsScore": number,
  "issues": ["string array of issues"],
  "formattingTips": ["string array of formatting tips"],
  "keywordSuggestions": ["string array of keywords to add"],
  "overallFeedback": "string summary"
}`;
    } else if (analysisType === "keywords") {
      systemPrompt = `You are an expert resume keyword optimizer. Analyze resumes against job descriptions to identify keyword gaps.`;
      userPrompt = `Compare this resume against the job description and identify:
1. Matching keywords found in the resume
2. Missing important keywords from the job description
3. Suggestions for incorporating missing keywords naturally

Resume:
${resumeText}

Job Description:
${jobDescription}

Respond in JSON format:
{
  "matchingKeywords": ["array of matched keywords"],
  "missingKeywords": ["array of missing keywords"],
  "keywordDensity": number (percentage of job keywords found),
  "suggestions": ["array of suggestions for adding keywords"],
  "priorityKeywords": ["top 5 most important keywords to add"]
}`;
    } else if (analysisType === "tailor") {
      systemPrompt = `You are an expert resume writer who tailors resumes for specific job applications while maintaining authenticity.`;
      userPrompt = `Tailor this resume for the specific job description. Rewrite sections to:
1. Highlight relevant experience
2. Incorporate important keywords naturally
3. Align achievements with job requirements
4. Optimize for both ATS and human readers

Original Resume:
${resumeText}

Target Job Description:
${jobDescription}

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
${resumeText}

${jobDescription ? `Target Job Description:\n${jobDescription}` : ''}

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

    console.log("Resume analysis completed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      analysisType,
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
