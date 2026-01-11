import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMPANY_INFO: Record<string, { culture: string; values: string[]; interviewStyle: string; famousQuestions: string[] }> = {
  google: {
    culture: "Innovation-driven, data-oriented, collaborative. Known for 'Googleyness' - intellectual humility, bias for action, and comfort with ambiguity.",
    values: ["Focus on the user", "Think 10x", "Ship and iterate", "Be transparent"],
    interviewStyle: "Heavy focus on coding/algorithms, system design, and behavioral questions using structured interviewing. Emphasizes problem-solving process over just answers.",
    famousQuestions: [
      "How would you design YouTube's recommendation system?",
      "Tell me about a time you had to influence without authority",
      "How would you improve Google Maps?",
      "Describe a technically challenging project you led"
    ]
  },
  amazon: {
    culture: "Customer obsession, ownership mentality, high-bar for talent. Leadership Principles are central to everything.",
    values: ["Customer Obsession", "Ownership", "Invent and Simplify", "Bias for Action", "Earn Trust", "Dive Deep", "Have Backbone; Disagree and Commit", "Deliver Results"],
    interviewStyle: "STAR method behavioral interviews heavily based on Leadership Principles. Expect 'Tell me about a time...' questions. Bar Raiser ensures hiring bar.",
    famousQuestions: [
      "Tell me about a time you disagreed with your manager",
      "Describe when you had to make a decision without enough data",
      "Tell me about your biggest failure and what you learned",
      "How do you prioritize when everything is urgent?"
    ]
  },
  microsoft: {
    culture: "Growth mindset, learn-it-all rather than know-it-all. Emphasis on empathy, collaboration, and impact.",
    values: ["Growth Mindset", "Customer Obsessed", "Diverse & Inclusive", "One Microsoft", "Making a Difference"],
    interviewStyle: "Mix of technical and behavioral. Focus on growth mindset, learning from failures, collaboration. Design questions for PM roles.",
    famousQuestions: [
      "How would you design a product for elderly users?",
      "Tell me about a time you changed your opinion based on new information",
      "How would you improve Microsoft Teams?",
      "Describe a time you helped a colleague grow"
    ]
  },
  meta: {
    culture: "Move fast, be bold, focus on impact. Open culture with flat hierarchy. Building for the future of connection.",
    values: ["Move Fast", "Be Bold", "Focus on Impact", "Be Open", "Build Social Value"],
    interviewStyle: "Strong coding focus (especially on-site), system design for senior roles. Behavioral questions about moving fast and handling ambiguity.",
    famousQuestions: [
      "Design Facebook's News Feed ranking algorithm",
      "Tell me about a time you shipped something quickly",
      "How would you measure the success of Instagram Stories?",
      "Describe a time you had to make a tough tradeoff"
    ]
  },
  apple: {
    culture: "Obsession with detail, secrecy, design excellence. Small team mentality, high autonomy with high expectations.",
    values: ["Simplicity", "Design Excellence", "Privacy", "Innovation", "Attention to Detail"],
    interviewStyle: "Focus on craft, attention to detail, passion for products. Portfolio/past work deep-dives. Less formulaic than other FAANG.",
    famousQuestions: [
      "Why do you want to work at Apple specifically?",
      "Walk me through your design process",
      "What Apple product would you improve and how?",
      "Tell me about something you've built that you're proud of"
    ]
  },
  netflix: {
    culture: "Freedom and responsibility, candid feedback, no rules culture. High performance expectations with high autonomy.",
    values: ["Judgment", "Communication", "Curiosity", "Courage", "Passion", "Selflessness", "Innovation", "Inclusion", "Integrity", "Impact"],
    interviewStyle: "Culture fit is paramount. Deep behavioral interviews about judgment, candor, and past performance. Less structured than others.",
    famousQuestions: [
      "Tell me about your most controversial opinion",
      "Describe a time you gave difficult feedback",
      "What would your previous manager say about you?",
      "How do you stay current in your field?"
    ]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, role, question, answer, questionType, company } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'generate_questions') {
      const companyInfo = company ? COMPANY_INFO[company.toLowerCase()] : null;
      
      if (companyInfo) {
        systemPrompt = `You are an expert interview coach specializing in ${company} interviews. You have deep knowledge of their culture, values, and interview process.`;
        userPrompt = `Generate 5 ${questionType || 'behavioral'} interview questions for a ${role} position at ${company}.

COMPANY CONTEXT:
- Culture: ${companyInfo.culture}
- Core Values: ${companyInfo.values.join(', ')}
- Interview Style: ${companyInfo.interviewStyle}
- Example Questions They Ask: ${companyInfo.famousQuestions.join('; ')}

Generate questions that:
1. Align with ${company}'s specific values and culture
2. Match their interview style and format
3. Are realistic questions this company would actually ask
4. Include a mix of their famous question styles

Return ONLY a JSON array of objects with this structure:
[
  {"id": 1, "question": "...", "type": "${questionType || 'behavioral'}", "difficulty": "medium", "tips": "Brief tip specific to ${company}'s expectations", "companyFocus": "Which value/principle this question tests"}
]

Mix difficulties: easy, medium, hard.`;
      } else {
        systemPrompt = `You are an expert interview coach. Generate realistic interview questions for job candidates.`;
        userPrompt = `Generate 5 ${questionType || 'behavioral'} interview questions for a ${role} position. 
      
Return ONLY a JSON array of objects with this structure:
[
  {"id": 1, "question": "...", "type": "${questionType || 'behavioral'}", "difficulty": "medium", "tips": "Brief tip for answering"}
]

Question types to include: behavioral, technical, situational. Mix difficulties: easy, medium, hard.`;
      }
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
