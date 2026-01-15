import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const MAX_TARGET_ROLE_LENGTH = 200;
const MAX_SKILLS = 50;
const MAX_SKILL_LENGTH = 100;

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

    const { userId, targetRole, currentSkills } = await req.json();
    
    // Validate userId if provided - must match authenticated user
    if (userId) {
      if (!validateUUID(userId)) {
        return new Response(
          JSON.stringify({ error: "Invalid user ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (user.id !== userId) {
        console.error("User ID mismatch: authenticated user", user.id, "vs requested", userId);
        return new Response(
          JSON.stringify({ error: "Forbidden: Cannot analyze skills for another user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Input validation
    if (!targetRole || typeof targetRole !== 'string') {
      return new Response(
        JSON.stringify({ error: "Target role is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetRole.length > MAX_TARGET_ROLE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Target role must be under ${MAX_TARGET_ROLE_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate currentSkills array
    if (!currentSkills || !Array.isArray(currentSkills)) {
      return new Response(
        JSON.stringify({ error: "Current skills array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validatedSkills = currentSkills
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .slice(0, MAX_SKILLS)
      .map(s => s.substring(0, MAX_SKILL_LENGTH));

    console.log(`User ${user.id} analyzing skill gap for role: ${targetRole}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Sanitize inputs for AI prompt
    const sanitizedTargetRole = targetRole.substring(0, MAX_TARGET_ROLE_LENGTH).replace(/[<>{}]/g, '');
    const sanitizedSkills = validatedSkills.join(", ");

    const prompt = `You are a career advisor and skills analyst. Analyze the skill gap for someone targeting a "${sanitizedTargetRole}" role.

Current skills: ${sanitizedSkills}

Provide a comprehensive skill gap analysis with:

1. Missing Skills: List 5-8 key skills they need to develop, categorized by priority (high, medium, low)
2. Learning Roadmap: Create a step-by-step learning path with milestones (3-6 months timeline)
3. Course Recommendations: Suggest specific courses from platforms like Coursera, Udemy, LinkedIn Learning, etc.
4. Estimated Time: Total time needed to become job-ready

Return your response as a JSON object with this exact structure:
{
  "missing_skills": [
    {"skill": "skill name", "priority": "high|medium|low", "description": "why it's important"}
  ],
  "learning_roadmap": [
    {"month": 1, "title": "milestone title", "goals": ["goal 1", "goal 2"], "skills_to_learn": ["skill1", "skill2"]}
  ],
  "course_recommendations": [
    {"name": "course name", "platform": "platform name", "url": "course url", "duration": "X hours", "skill_covered": "main skill", "price": "free|paid"}
  ],
  "estimated_time": "X months"
}

Only return valid JSON, no markdown or extra text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a career advisor that provides skill gap analysis. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Return a default structure if parsing fails
      analysis = {
        missing_skills: [
          { skill: "Industry Knowledge", priority: "high", description: "Understanding of domain-specific concepts" },
          { skill: "Technical Proficiency", priority: "high", description: "Core technical skills for the role" }
        ],
        learning_roadmap: [
          { month: 1, title: "Foundation", goals: ["Learn basics", "Build portfolio"], skills_to_learn: ["Core skills"] }
        ],
        course_recommendations: [
          { name: "Professional Development Course", platform: "Coursera", url: "https://coursera.org", duration: "20 hours", skill_covered: "General", price: "free" }
        ],
        estimated_time: "3-6 months"
      };
    }

    // Save to database using authenticated user's ID
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await supabaseAdmin
      .from("skill_gap_analyses")
      .insert({
        user_id: user.id, // Always use authenticated user's ID
        target_role: sanitizedTargetRole,
        current_skills: validatedSkills,
        missing_skills: analysis.missing_skills,
        learning_roadmap: analysis.learning_roadmap,
        course_recommendations: analysis.course_recommendations,
        estimated_time: analysis.estimated_time,
      });

    if (insertError) {
      console.error("Error saving analysis:", insertError);
    }

    console.log("Skill gap analysis completed for user:", user.id);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-skills function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
