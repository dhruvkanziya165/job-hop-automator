import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
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

    const { interviewId, type } = await req.json();
    
    if (!interviewId || typeof interviewId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid interviewId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const userEmail = profile?.email || user.email;
    const userName = profile?.full_name || "there";

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

    const notificationType = type || "reminder";

    // Generate email content using AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        messages: [
          {
            role: "system",
            content: "You are a helpful career assistant. Generate a brief, professional interview email. Output only the email body HTML (no subject). Use simple HTML tags like <p>, <strong>, <ul>, <li>."
          },
          {
            role: "user",
            content: `Generate a ${notificationType} email for an interview:
- Recipient name: ${userName}
- Position: ${jobInfo}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Duration: ${interview.duration_minutes} minutes
- Type: ${interview.interview_type}
- Location/Link: ${interview.meeting_link || interview.location || "To be confirmed"}
- Interviewer: ${interview.interviewer_name || "To be confirmed"}
${notificationType === "status_change" ? `- New Status: ${interview.status}` : ""}

Keep it brief, professional, and encouraging.`
          }
        ],
        max_tokens: 500,
      }),
    });

    let emailBody = `<p>Hi ${userName},</p><p>This is a reminder about your interview for <strong>${jobInfo}</strong> on ${formattedDate} at ${formattedTime}.</p>`;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;
      if (content) emailBody = content;
    }

    const subjectMap: Record<string, string> = {
      reminder: `⏰ Interview Reminder: ${jobInfo}`,
      status_change: `📋 Interview Update: ${jobInfo}`,
      scheduled: `✅ Interview Scheduled: ${jobInfo}`,
      cancelled: `❌ Interview Cancelled: ${jobInfo}`,
    };
    const subject = subjectMap[notificationType] || subjectMap.reminder;

    let emailSent = false;

    // Send email via Resend if configured
    if (resendApiKey && userEmail) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "JobHop <onboarding@resend.dev>",
          to: [userEmail],
          subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6366f1;">${subject}</h2>
              ${emailBody}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 12px;">Sent by JobHop Automator</p>
            </div>
          `,
        }),
      });

      emailSent = resendRes.ok;
      if (!resendRes.ok) {
        console.error("Resend error:", await resendRes.text());
      }
    }

    // Mark reminder as sent
    if (notificationType === "reminder") {
      await supabase
        .from("interviews")
        .update({ reminder_sent: true })
        .eq("id", interviewId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent,
        message: emailSent ? "Email notification sent" : "Notification prepared (email service not configured)",
        reminder: {
          subject,
          scheduledFor: interview.scheduled_at,
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
