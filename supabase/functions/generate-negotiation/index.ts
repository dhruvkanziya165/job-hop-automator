import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentOffer, desiredSalary, role, company, context } = await req.json();
    console.log(`Generating negotiation script for ${role} at ${company}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a career coach and salary negotiation expert. Generate a comprehensive negotiation strategy and scripts.

Current Offer Details:
- Company: ${company}
- Role: ${role}
- Current Offer: ${currentOffer}
- Desired Salary: ${desiredSalary}
- Additional Context: ${context || "None provided"}

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
    console.log("Negotiation script generated successfully");

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
