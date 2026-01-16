import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_FIELD_LENGTH = 500;
const MAX_CONTEXT_LENGTH = 2000;

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
      identifier: `generate-negotiation:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(corsHeaders, rateLimitResult.resetIn);
    }

    const { currentOffer, desiredSalary, role, company, context } = await req.json();
    
    // Input validation
    if (!currentOffer || typeof currentOffer !== 'string') {
      return new Response(
        JSON.stringify({ error: "Current offer is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!desiredSalary || typeof desiredSalary !== 'string') {
      return new Response(
        JSON.stringify({ error: "Desired salary is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!role || typeof role !== 'string') {
      return new Response(
        JSON.stringify({ error: "Role is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!company || typeof company !== 'string') {
      return new Response(
        JSON.stringify({ error: "Company is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate lengths
    if (currentOffer.length > MAX_FIELD_LENGTH || desiredSalary.length > MAX_FIELD_LENGTH ||
        role.length > MAX_FIELD_LENGTH || company.length > MAX_FIELD_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Input fields must be under ${MAX_FIELD_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (context && typeof context === 'string' && context.length > MAX_CONTEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Context must be under ${MAX_CONTEXT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} generating negotiation script for ${role} at ${company}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Sanitize inputs for AI prompt
    const sanitizedCompany = company.substring(0, MAX_FIELD_LENGTH).replace(/[<>{}]/g, '');
    const sanitizedRole = role.substring(0, MAX_FIELD_LENGTH).replace(/[<>{}]/g, '');
    const sanitizedCurrentOffer = currentOffer.substring(0, MAX_FIELD_LENGTH).replace(/[<>{}]/g, '');
    const sanitizedDesiredSalary = desiredSalary.substring(0, MAX_FIELD_LENGTH).replace(/[<>{}]/g, '');
    const sanitizedContext = context ? 
      String(context).substring(0, MAX_CONTEXT_LENGTH).replace(/[<>{}]/g, '') : 'None provided';

    const prompt = `You are a career coach and salary negotiation expert. Generate a comprehensive negotiation strategy and scripts.

Current Offer Details:
- Company: ${sanitizedCompany}
- Role: ${sanitizedRole}
- Current Offer: ${sanitizedCurrentOffer}
- Desired Salary: ${sanitizedDesiredSalary}
- Additional Context: ${sanitizedContext}

Provide a JSON response with:
1. "opening_script": A professional opening statement to initiate negotiation (2-3 sentences)
2. "key_points": Array of 5 key points to emphasize during negotiation
3. "counter_offer_script": Full script for presenting your counter offer (paragraph)
4. "responses_to_objections": Object with common objections as keys and response scripts as values
   - "budget_constraints": response script
   - "standard_offer": response script
   - "need_time": response script
   - "final_offer": response script
5. "closing_script": Professional closing that keeps the door open
6. "email_template": Professional follow-up email template
7. "dos_and_donts": Object with "dos" array and "donts" array
8. "timing_tips": Array of 3 tips about when to negotiate
9. "leverage_points": Array of things that could strengthen your position`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert career coach specializing in salary negotiation. Always respond with valid JSON only, no markdown formatting." },
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
    
    // Clean up the response
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const negotiationData = JSON.parse(content);
    console.log("Negotiation script generated successfully for user:", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: negotiationData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-negotiation function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
