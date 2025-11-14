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
    const { jobId, userId, emailType = "application" } = await req.json();
    console.log(`Generating ${emailType} email for job ${jobId} and user ${userId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    // Fetch user preferences for context
    const { data: preferences } = await supabase
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

    const userPrompt = emailType === "application" 
      ? `Generate a cold email for this job application:

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

Applicant Info:
Name: ${profile.full_name || "Applicant"}
Skills: ${preferences?.keywords?.join(", ") || "N/A"}
LinkedIn: ${profile.linkedin_url || "N/A"}

Write the email body only (no subject line). Make it personalized and compelling.`
      : `Generate a follow-up email for this job application:

Job Title: ${job.title}
Company: ${job.company}
Applicant: ${profile.full_name || "Applicant"}

Write a brief follow-up email (under 100 words) checking on the application status.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
    const emailBody = aiData.choices[0].message.content;

    // Generate subject line
    const subjectLine = emailType === "application"
      ? `Application for ${job.title} - ${profile.full_name || "Applicant"}`
      : `Following up on ${job.title} application - ${profile.full_name || "Applicant"}`;

    console.log("Email generated successfully");

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
