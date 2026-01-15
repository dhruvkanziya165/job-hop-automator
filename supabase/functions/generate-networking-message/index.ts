import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TEXT_LENGTH = 500;
const VALID_MESSAGE_TYPES = ['linkedin_connection', 'email_initial', 'email_followup'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
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

    // Validate message type
    if (!messageType || !VALID_MESSAGE_TYPES.includes(messageType)) {
      return new Response(JSON.stringify({ error: "Invalid message type" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Sanitize inputs
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, tips: [] };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
