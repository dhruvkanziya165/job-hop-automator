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
    const { userId, currentRole, skills, experienceYears } = await req.json();
    console.log(`Predicting career path for: ${currentRole} with ${experienceYears} years experience`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const prompt = `You are a career advisor. Analyze the career trajectory for someone with the following profile:

Current Role: ${currentRole}
Years of Experience: ${experienceYears}
Current Skills: ${skills.join(", ")}

Provide a comprehensive career path prediction with:

1. Predicted Career Paths: 3-4 potential career trajectories with roles, timelines, and required skills
2. Industry Insights: Market trends, demand outlook, and growth opportunities
3. Salary Progression: Expected salary ranges at each career stage (in USD)

Return your response as a JSON object with this exact structure:
{
  "predicted_paths": [
    {
      "path_name": "path title",
      "description": "brief description",
      "roles": [
        {
          "title": "role title",
          "years_from_now": 0,
          "required_skills": ["skill1", "skill2"],
          "description": "what this role involves"
        }
      ],
      "success_probability": "high|medium|low",
      "effort_required": "high|medium|low"
    }
  ],
  "industry_insights": [
    {
      "trend": "trend name",
      "impact": "positive|neutral|negative",
      "description": "how it affects career",
      "timeframe": "short-term|medium-term|long-term"
    }
  ],
  "salary_progression": [
    {
      "years_experience": 0,
      "role": "current role",
      "min_salary": 50000,
      "max_salary": 80000,
      "median_salary": 65000
    }
  ]
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
          { role: "system", content: "You are a career advisor that provides career path predictions. Always respond with valid JSON only." },
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
    
    let prediction;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediction = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      prediction = {
        predicted_paths: [
          {
            path_name: "Career Growth Path",
            description: "Natural progression in your field",
            roles: [
              { title: currentRole, years_from_now: 0, required_skills: skills.slice(0, 3), description: "Current position" },
              { title: "Senior " + currentRole, years_from_now: 2, required_skills: ["Leadership", "Strategy"], description: "Advanced role" }
            ],
            success_probability: "high",
            effort_required: "medium"
          }
        ],
        industry_insights: [
          { trend: "Growing Demand", impact: "positive", description: "Industry shows consistent growth", timeframe: "medium-term" }
        ],
        salary_progression: [
          { years_experience: experienceYears, role: currentRole, min_salary: 50000, max_salary: 80000, median_salary: 65000 }
        ]
      };
    }

    // Save to database
    const { error: insertError } = await supabase
      .from("career_path_predictions")
      .insert({
        user_id: userId,
        role_title: currentRole,
        skills: skills,
        experience_years: experienceYears,
        predicted_paths: prediction.predicted_paths,
        industry_insights: prediction.industry_insights,
        salary_progression: prediction.salary_progression,
      });

    if (insertError) {
      console.error("Error saving prediction:", insertError);
    }

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in predict-career function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
