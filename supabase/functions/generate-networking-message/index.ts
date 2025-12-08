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
    const { 
      messageType, 
      contactName, 
      contactTitle, 
      contactCompany, 
      jobTitle, 
      jobDescription,
      userProfile,
      followUpNumber 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (messageType === "linkedin_connection") {
      systemPrompt = `You are an expert at crafting personalized LinkedIn connection requests that get accepted. 
You write messages that are:
- Concise (under 300 characters for connection note)
- Personal and authentic
- Show genuine interest in the person's work
- Reference specific details about their background
- Not salesy or desperate
- Professional yet warm`;

      userPrompt = `Generate a LinkedIn connection request message for:

Contact: ${contactName}
Title: ${contactTitle || 'Professional'}
Company: ${contactCompany || 'their company'}

${jobTitle ? `Related Job: ${jobTitle}` : ''}

My Background: ${userProfile?.skills?.join(', ') || 'Software professional'}

Create a short, personalized connection request (under 300 characters) that:
1. References something specific about their role or company
2. Shows genuine interest
3. Is professional but friendly
4. Doesn't ask for a job directly

Return JSON with:
{
  "message": "the connection request text",
  "tips": ["tip1", "tip2", "tip3"]
}`;
    } else if (messageType === "email_initial") {
      systemPrompt = `You are an expert cold email writer for job seekers. 
You write emails that:
- Have compelling subject lines
- Are concise and scannable
- Show research about the company
- Highlight relevant value the candidate brings
- Have clear but soft calls to action
- Feel personal, not templated`;

      userPrompt = `Generate a cold outreach email to a recruiter/hiring manager:

Contact: ${contactName}
Title: ${contactTitle || 'Recruiter'}
Company: ${contactCompany}

${jobTitle ? `Job I'm interested in: ${jobTitle}` : ''}
${jobDescription ? `Job Description: ${jobDescription.substring(0, 500)}...` : ''}

My Background:
- Skills: ${userProfile?.skills?.join(', ') || 'Various technical skills'}
- Experience: ${userProfile?.experience || 'Professional experience'}

Create a professional cold email that:
1. Has an attention-grabbing subject line
2. Shows I've researched the company
3. Highlights my relevant skills
4. Asks for a brief conversation
5. Is under 150 words

Return JSON with:
{
  "subject": "email subject line",
  "body": "email body text",
  "tips": ["sending tip 1", "sending tip 2"]
}`;
    } else if (messageType === "email_followup") {
      systemPrompt = `You are an expert at writing follow-up emails that get responses.
You write follow-ups that:
- Are even shorter than initial emails
- Add new value or information
- Don't sound desperate or pushy
- Reference the previous outreach
- Have a clear reason for following up`;

      userPrompt = `Generate a follow-up email (follow-up #${followUpNumber || 1}):

Contact: ${contactName}
Title: ${contactTitle || 'Recruiter'}
Company: ${contactCompany}

${jobTitle ? `Job: ${jobTitle}` : ''}

This is follow-up #${followUpNumber || 1}. Create a brief, professional follow-up that:
1. References previous outreach without being pushy
2. Adds a new angle or piece of information
3. Is under 75 words
4. Has a soft call to action

Return JSON with:
{
  "subject": "follow-up subject line",
  "body": "email body text",
  "tips": ["timing tip", "strategy tip"]
}`;
    }

    console.log("Generating networking message:", messageType);

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      result = {
        message: content,
        subject: "Following up on your open position",
        body: content,
        tips: ["Personalize further before sending"]
      };
    }

    console.log("Generated message successfully");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in generate-networking-message:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
