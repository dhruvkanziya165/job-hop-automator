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

const MAX_ROLE_LENGTH = 200;
const MAX_LOCATION_LENGTH = 200;
const MAX_SKILLS = 50;
const MAX_SKILL_LENGTH = 100;
const MAX_EXPERIENCE_YEARS = 70;

// Rate limit: 10 requests per minute per user
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60000;

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
      identifier: `estimate-salary:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(corsHeaders, rateLimitResult.resetIn);
    }

    const { role, experienceYears, location, skills, userId } = await req.json();
    
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
          JSON.stringify({ error: "Forbidden: Cannot estimate salary for another user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Input validation
    if (!role || typeof role !== 'string') {
      return new Response(
        JSON.stringify({ error: "Role is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role.length > MAX_ROLE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Role must be under ${MAX_ROLE_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!location || typeof location !== 'string') {
      return new Response(
        JSON.stringify({ error: "Location is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (location.length > MAX_LOCATION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Location must be under ${MAX_LOCATION_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate experience years
    const validatedExperience = typeof experienceYears === 'number' && 
      experienceYears >= 0 && experienceYears <= MAX_EXPERIENCE_YEARS 
        ? Math.floor(experienceYears) 
        : 0;

    // Validate skills array
    let validatedSkills: string[] = [];
    if (skills && Array.isArray(skills)) {
      validatedSkills = skills
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .slice(0, MAX_SKILLS)
        .map(s => s.substring(0, MAX_SKILL_LENGTH));
    }

    console.log(`User ${user.id} estimating salary for ${role} with ${validatedExperience} years in ${location}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Sanitize inputs for AI prompt
    const sanitizedRole = role.substring(0, MAX_ROLE_LENGTH).replace(/[<>{}]/g, '');
    const sanitizedLocation = location.substring(0, MAX_LOCATION_LENGTH).replace(/[<>{}]/g, '');
    const sanitizedSkills = validatedSkills.join(", ");

    const prompt = `You are a salary analysis expert. Provide salary estimates for the following position:

Role: ${sanitizedRole}
Experience: ${validatedExperience} years
Location: ${sanitizedLocation}
Skills: ${sanitizedSkills || "Not specified"}

Respond with a JSON object containing:
- estimated_min: minimum salary in the local currency (number only)
- estimated_max: maximum salary in the local currency (number only)
- estimated_median: median salary (number only)
- currency: the currency code (e.g., "INR", "USD")
- market_trend: one of "rising", "stable", or "declining"
- demand_level: one of "high", "medium", or "low"
- negotiation_tips: array of 5 specific negotiation tips for this role
- key_factors: array of factors affecting salary for this role
- comparable_roles: array of 3 similar roles with their salary ranges

Base your estimates on current 2024-2025 market data for the specified location.
For India, use LPA (Lakhs Per Annum) format.
Provide realistic, data-driven estimates.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a salary analysis expert. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error("Rate limits exceeded, please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Payment required, please add funds to your Lovable AI workspace.");
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
    
    // Clean up the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const salaryData = JSON.parse(content);
    console.log("Salary estimate generated for user:", user.id);

    // Save to database using the authenticated user's ID
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin.from("salary_estimates").insert({
      user_id: user.id, // Always use authenticated user's ID
      role: sanitizedRole,
      experience_years: validatedExperience,
      location: sanitizedLocation,
      skills: validatedSkills,
      estimated_min: salaryData.estimated_min,
      estimated_max: salaryData.estimated_max,
      estimated_median: salaryData.estimated_median,
      market_trend: salaryData.market_trend,
      negotiation_tips: salaryData.negotiation_tips,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: salaryData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in estimate-salary function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
