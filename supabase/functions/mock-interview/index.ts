import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_ACTIONS = ['generate_questions', 'evaluate_answer'];
const VALID_QUESTION_TYPES = ['behavioral', 'technical', 'situational'];
const MAX_TEXT_LENGTH = 2000;

const COMPANY_INFO: Record<string, { culture: string; values: string[]; interviewStyle: string; famousQuestions: string[] }> = {
  google: { culture: "Innovation-driven, data-oriented", values: ["Focus on the user", "Think 10x"], interviewStyle: "Heavy coding/algorithms focus", famousQuestions: ["Design YouTube's recommendation system"] },
  amazon: { culture: "Customer obsession, ownership mentality", values: ["Customer Obsession", "Ownership", "Bias for Action"], interviewStyle: "STAR method behavioral interviews", famousQuestions: ["Tell me about a time you disagreed with your manager"] },
  microsoft: { culture: "Growth mindset, learn-it-all", values: ["Growth Mindset", "Customer Obsessed"], interviewStyle: "Mix of technical and behavioral", famousQuestions: ["How would you improve Microsoft Teams?"] },
  meta: { culture: "Move fast, be bold", values: ["Move Fast", "Focus on Impact"], interviewStyle: "Strong coding focus", famousQuestions: ["Design Facebook's News Feed ranking"] },
  apple: { culture: "Obsession with detail, design excellence", values: ["Simplicity", "Innovation"], interviewStyle: "Focus on craft and passion", famousQuestions: ["Why do you want to work at Apple?"] },
  netflix: { culture: "Freedom and responsibility", values: ["Judgment", "Courage", "Impact"], interviewStyle: "Culture fit is paramount", famousQuestions: ["Tell me about your most controversial opinion"] }
};

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

    const { action, role, question, answer, questionType, company } = await req.json();
    
    // Validate action
    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    // Sanitize inputs
    const sanitize = (s: any) => s ? String(s).substring(0, MAX_TEXT_LENGTH).replace(/[<>{}]/g, '') : '';
    const sRole = sanitize(role) || 'Software Engineer';
    const sCompany = sanitize(company);
    const sQuestion = sanitize(question);
    const sAnswer = sanitize(answer);
    const sQuestionType = VALID_QUESTION_TYPES.includes(questionType) ? questionType : 'behavioral';

    console.log(`User ${user.id} mock interview: ${action}`);

    let systemPrompt = '', userPrompt = '';

    if (action === 'generate_questions') {
      const companyInfo = sCompany ? COMPANY_INFO[sCompany.toLowerCase()] : null;
      systemPrompt = companyInfo ? `You are an interview coach for ${sCompany}.` : `You are an expert interview coach.`;
      userPrompt = `Generate 5 ${sQuestionType} interview questions for ${sRole}${companyInfo ? ` at ${sCompany}` : ''}. Return JSON array: [{"id": 1, "question": "...", "type": "${sQuestionType}", "difficulty": "medium", "tips": "..."}]`;
    } else {
      systemPrompt = `You are an expert interview coach providing constructive feedback.`;
      userPrompt = `Evaluate: Question: ${sQuestion}, Answer: ${sAnswer}. Return JSON: {"score": 1-10, "strengths": [], "improvements": [], "sampleAnswer": "...", "overallFeedback": "..."}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
    });

    if (!response.ok) throw new Error('AI gateway error');

    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI response');
    
    return new Response(JSON.stringify({ result: JSON.parse(jsonMatch[0]) }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
