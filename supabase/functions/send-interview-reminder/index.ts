import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { interviewId } = await req.json();

    // Fetch interview details
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select(`
        *,
        applications (
          job_postings (
            title,
            company
          )
        )
      `)
      .eq("id", interviewId)
      .eq("user_id", user.id)
      .single();

    if (interviewError || !interview) {
      return new Response(JSON.stringify({ error: "Interview not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    const interviewDate = new Date(interview.scheduled_at);
    const formattedDate = interviewDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = interviewDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const jobInfo = interview.applications?.job_postings 
      ? `${interview.applications.job_postings.title} at ${interview.applications.job_postings.company}`
      : "your scheduled interview";

    // Generate reminder content using AI
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful career assistant. Generate a brief, professional interview reminder email. Be encouraging but concise."
          },
          {
            role: "user",
            content: `Generate a reminder email for an interview:
- Position: ${jobInfo}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Duration: ${interview.duration_minutes} minutes
- Type: ${interview.interview_type}
- Location/Link: ${interview.meeting_link || interview.location || "To be confirmed"}
- Interviewer: ${interview.interviewer_name || "To be confirmed"}

Keep it brief, professional, and encouraging. Include preparation tips.`
          }
        ],
        max_tokens: 500,
      }),
    });

    let reminderContent = "";
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      reminderContent = aiData.choices?.[0]?.message?.content || "";
    }

    // For now, log the reminder (in production, integrate with email service)
    console.log("Interview Reminder Generated:", {
      to: profile?.email || user.email,
      subject: `Reminder: Interview for ${jobInfo}`,
      content: reminderContent,
      interview: {
        date: formattedDate,
        time: formattedTime,
        type: interview.interview_type,
        location: interview.location,
        meetingLink: interview.meeting_link,
      }
    });

    // Mark reminder as sent
    await supabase
      .from("interviews")
      .update({ reminder_sent: true })
      .eq("id", interviewId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Reminder prepared successfully",
        reminder: {
          subject: `Interview Reminder: ${jobInfo}`,
          content: reminderContent,
          scheduledFor: interview.scheduled_at
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
