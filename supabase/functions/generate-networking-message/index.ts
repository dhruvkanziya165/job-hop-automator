import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_TEXT_LENGTH = 500;
const VALID_MESSAGE_TYPES = ['linkedin_connection', 'email_initial', 'email_followup'];

function generateFallbackMessage(messageType: string, contactName: string, contactTitle: string, contactCompany: string, jobTitle: string, skills: string) {
  if (messageType === "linkedin_connection") {
    return {
      message: `Hi ${contactName}, I came across your profile${contactCompany ? ` at ${contactCompany}` : ''} and was impressed by your work${contactTitle ? ` as ${contactTitle}` : ''}. ${jobTitle ? `I'm particularly interested in the ${jobTitle} opportunity. ` : ''}I'd love to connect and learn more about your experience. Looking forward to connecting!`,
      tips: [
        "Personalize further by mentioning a specific post or achievement",
        "Keep it under 300 characters for best acceptance rates",
        "Follow up with a thank-you message after they accept"
      ]
    };
  } else if (messageType === "email_initial") {
    return {
      subject: `${jobTitle ? `Re: ${jobTitle} Opportunity` : `Connecting with you`} — ${skills.split(',')[0]?.trim() || 'Experienced'} Professional`,
      body: `Hi ${contactName},\n\nI hope this email finds you well. I'm reaching out because ${contactCompany ? `I'm very interested in opportunities at ${contactCompany}` : 'I admire your work in the industry'}${contactTitle ? ` and your role as ${contactTitle}` : ''}.\n\n${jobTitle ? `I noticed the ${jobTitle} position and believe my background in ${skills} makes me a strong fit. ` : `With my experience in ${skills}, I believe I could bring valuable contributions to your team. `}\n\nI'd welcome the chance to discuss how my skills could align with your team's needs. Would you be open to a brief conversation?\n\nBest regards`,
      tips: [
        "Add a specific achievement or metric to stand out",
        "Research the company's recent news for a personalized opener",
        "Follow up within 3-5 business days if no response"
      ]
    };
  } else {
    return {
      subject: `Following up — Still very interested`,
      body: `Hi ${contactName},\n\nI wanted to follow up on my previous message. I remain very interested in connecting${contactCompany ? ` regarding opportunities at ${contactCompany}` : ''}.\n\nI understand you're busy, and I appreciate your time. If now isn't the right moment, I'd be happy to reconnect at a more convenient time.\n\nLooking forward to hearing from you.\n\nBest regards`,
      tips: [
        "Keep follow-ups shorter than the original message",
        "Add new value (article, insight) rather than just 'checking in'",
        "Space follow-ups 3-7 days apart"
      ]
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messageType, contactName, contactTitle, contactCompany, jobTitle, jobDescription, userProfile, followUpNumber } = await req.json();

    if (!messageType || !VALID_MESSAGE_TYPES.includes(messageType)) {
      return new Response(JSON.stringify({ error: "Invalid message type" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sanitize = (s: any) => s ? String(s).substring(0, MAX_TEXT_LENGTH).replace(/[<>{}]/g, '') : '';
    const sContactName = sanitize(contactName);
    const sContactTitle = sanitize(contactTitle) || 'Professional';
    const sContactCompany = sanitize(contactCompany) || 'their company';
    const sJobTitle = sanitize(jobTitle);
    const sJobDesc = jobDescription ? String(jobDescription).substring(0, 1000).replace(/[<>{}]/g, '') : '';
    const sSkills = userProfile?.skills?.slice(0, 10).join(', ') || 'Software professional';

    let systemPrompt = "", userPrompt = "";

    if (messageType === "linkedin_connection") {
      systemPrompt = `You are an expert at crafting personalized LinkedIn connection requests.`;
      userPrompt = `Generate a LinkedIn connection request for: ${sContactName}, ${sContactTitle} at ${sContactCompany}. ${sJobTitle ? `Related Job: ${sJobTitle}` : ''} My skills: ${sSkills}. Return JSON: {"message": "...", "tips": ["..."]}`;
    } else if (messageType === "email_initial") {
      systemPrompt = `You are an expert cold email writer.`;
      userPrompt = `Generate cold outreach email to ${sContactName}, ${sContactTitle} at ${sContactCompany}. ${sJobTitle ? `Job: ${sJobTitle}` : ''} ${sJobDesc ? `Description: ${sJobDesc}` : ''} Return JSON: {"subject": "...", "body": "...", "tips": ["..."]}`;
    } else {
      systemPrompt = `You are an expert at writing follow-up emails.`;
      userPrompt = `Generate follow-up #${followUpNumber || 1} to ${sContactName} at ${sContactCompany}. Return JSON: {"subject": "...", "body": "...", "tips": ["..."]}`;
    }

    console.log(`User ${user.id} generating ${messageType} message`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY not configured, using fallback");
      const fallback = generateFallbackMessage(messageType, sContactName, sContactTitle, sContactCompany, sJobTitle, sSkills);
      return new Response(JSON.stringify(fallback), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Retry with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
        });

        if (response.status === 429) {
          console.warn(`Rate limited on attempt ${attempt + 1}`);
          lastError = new Error("Rate limited");
          continue;
        }

        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (!response.ok) {
          lastError = new Error(`AI API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, tips: [] };

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }

    // All retries failed — use fallback
    console.warn("AI unavailable after retries, using fallback:", lastError?.message);
    const fallback = generateFallbackMessage(messageType, sContactName, sContactTitle, sContactCompany, sJobTitle, sSkills);
    return new Response(JSON.stringify(fallback), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
