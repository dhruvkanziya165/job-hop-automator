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
    const { action, role, question, answer, questionType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'generate_questions') {
      systemPrompt = `You are an expert interview coach. Generate realistic interview questions for job candidates.`;
      userPrompt = `Generate 5 ${questionType || 'behavioral'} interview questions for a ${role} position. 
      
Return ONLY a JSON array of objects with this structure:
[
  {"id": 1, "question": "...", "type": "${questionType || 'behavioral'}", "difficulty": "medium", "tips": "Brief tip for answering"}
]

Question types to include: behavioral, technical, situational. Mix difficulties: easy, medium, hard.`;
    } else if (action === 'evaluate_answer') {
      systemPrompt = `You are an expert interview coach providing constructive feedback on interview responses. Be encouraging but honest.`;
      userPrompt = `Evaluate this interview answer:

Question: ${question}
Candidate's Answer: ${answer}

Provide feedback in this JSON format ONLY:
{
  "score": <1-10>,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area 1", "area 2"],
  "sampleAnswer": "A strong example answer...",
  "overallFeedback": "2-3 sentences of constructive feedback"
}`;
    } else {
      throw new Error('Invalid action');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'API credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Mock interview error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
