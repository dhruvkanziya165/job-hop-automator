import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calculateHeuristicMatch(job: any, preferences: any): { score: number; reasons: string[] } {
  let score = 50; // base score
  const reasons: string[] = [];

  if (preferences) {
    // Check role match
    const targetRoles = (preferences.target_roles || []).map((r: string) => r.toLowerCase());
    const jobTitle = (job.title || '').toLowerCase();
    if (targetRoles.some((r: string) => jobTitle.includes(r) || r.includes(jobTitle.split(' ')[0]))) {
      score += 20;
      reasons.push('Job title matches your target roles');
    }

    // Check location match
    const prefLocations = (preferences.locations || []).map((l: string) => l.toLowerCase());
    const jobLocation = (job.location || '').toLowerCase();
    if (jobLocation.includes('remote') || prefLocations.some((l: string) => jobLocation.includes(l) || l.includes(jobLocation))) {
      score += 15;
      reasons.push('Location matches your preferences');
    }

    // Check keyword match
    const keywords = (preferences.keywords || []).map((k: string) => k.toLowerCase());
    const jobText = `${job.title} ${job.description || ''} ${job.company}`.toLowerCase();
    const matchedKeywords = keywords.filter((k: string) => jobText.includes(k));
    if (matchedKeywords.length > 0) {
      score += Math.min(15, matchedKeywords.length * 5);
      reasons.push(`Matches ${matchedKeywords.length} of your keywords`);
    }

    // Check job type
    if (preferences.job_type === 'both' || preferences.job_type === job.job_type) {
      score += 5;
    }
  }

  if (reasons.length === 0) {
    reasons.push('Basic profile match based on available data');
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Try AI first, fall back to heuristic
    try {
      const prompt = `You are a job matching AI. Calculate a match score (0-100) between this job and user profile.

Job Details:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || 'Not specified'}
- Job Type: ${job.job_type || 'Not specified'}
- Salary: ${job.salary_range || 'Not specified'}
- Description: ${(job.description || '').substring(0, 500)}

User Profile:
- Target Roles: ${preferences?.target_roles?.join(', ') || 'Not specified'}
- Preferred Locations: ${preferences?.locations?.join(', ') || 'Not specified'}
- Keywords: ${preferences?.keywords?.join(', ') || 'Not specified'}
- Job Type Preference: ${preferences?.job_type || 'both'}
- Salary Range: ${preferences?.salary_min || 0} - ${preferences?.salary_max || 'unlimited'}

Return ONLY a JSON object: {"score": <0-100>, "reasons": ["reason1", "reason2", "reason3"]}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: 'You are a job matching expert. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices[0].message.content;
        const matchData = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        return new Response(JSON.stringify(matchData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const errText = await aiResponse.text();
      console.warn('AI unavailable, using heuristic fallback:', aiResponse.status, errText);
    } catch (aiErr) {
      console.warn('AI error, using heuristic fallback:', aiErr);
    }

    // Heuristic fallback
    const fallback = calculateHeuristicMatch(job, preferences);
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-job-match:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
