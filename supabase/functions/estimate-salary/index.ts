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
    const { role, experienceYears, location, skills, userId } = await req.json();
    console.log(`Estimating salary for ${role} with ${experienceYears} years in ${location}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a salary analysis expert. Provide salary estimates for the following position:

Role: ${role}
Experience: ${experienceYears} years
Location: ${location}
Skills: ${skills?.join(", ") || "Not specified"}

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
    console.log("Salary estimate generated:", salaryData);

    // Save to database if userId provided
    if (userId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabase.from("salary_estimates").insert({
        user_id: userId,
        role,
        experience_years: experienceYears,
        location,
        skills,
        estimated_min: salaryData.estimated_min,
        estimated_max: salaryData.estimated_max,
        estimated_median: salaryData.estimated_median,
        market_trend: salaryData.market_trend,
        negotiation_tips: salaryData.negotiation_tips,
      });
    }

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
