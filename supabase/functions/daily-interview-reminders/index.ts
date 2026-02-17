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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all interviews scheduled for tomorrow that haven't had reminders sent
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { data: interviews, error: fetchError } = await supabase
      .from("interviews")
      .select(`
        *,
        applications (
          job_postings ( title, company )
        )
      `)
      .eq("status", "scheduled")
      .eq("reminder_sent", false)
      .gte("scheduled_at", tomorrowStart.toISOString())
      .lte("scheduled_at", tomorrowEnd.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch interviews: ${fetchError.message}`);
    }

    if (!interviews || interviews.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No interviews tomorrow needing reminders", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${interviews.length} interviews tomorrow needing reminders`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const interview of interviews) {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", interview.user_id)
          .single();

        const userEmail = profile?.email;
        const userName = profile?.full_name || "there";

        if (!userEmail) {
          errors.push(`No email for user ${interview.user_id}`);
          continue;
        }

        const jobInfo = interview.applications?.job_postings
          ? `${interview.applications.job_postings.title} at ${interview.applications.job_postings.company}`
          : "your scheduled interview";

        const interviewDate = new Date(interview.scheduled_at);
        const formattedTime = interviewDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        // Generate personalized reminder with AI
        let emailBody = `<p>Hi ${userName},</p><p>This is a reminder about your interview for <strong>${jobInfo}</strong> tomorrow at <strong>${formattedTime}</strong>.</p><p>Good luck! 🍀</p>`;

        if (lovableApiKey) {
          try {
            const aiRes = await fetch("https://api.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${lovableApiKey}`,
              },
              body: JSON.stringify({
                model: "openai/gpt-5-nano",
                messages: [
                  {
                    role: "system",
                    content: "Generate a brief, encouraging interview reminder email body in HTML. Use <p>, <strong>, <ul>, <li> tags only. No subject line."
                  },
                  {
                    role: "user",
                    content: `Reminder for ${userName}: Interview for ${jobInfo} tomorrow at ${formattedTime}. Type: ${interview.interview_type}. Location: ${interview.meeting_link || interview.location || "TBD"}.`
                  }
                ],
                max_tokens: 300,
              }),
            });

            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const content = aiData.choices?.[0]?.message?.content;
              if (content) emailBody = content;
            }
          } catch (e) {
            console.error("AI generation failed, using fallback:", e);
          }
        }

        // Send email via Resend
        if (resendApiKey) {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "JobHop <onboarding@resend.dev>",
              to: [userEmail],
              subject: `⏰ Tomorrow: Interview for ${jobInfo}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #6366f1;">Interview Reminder</h2>
                  ${emailBody}
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #6b7280; font-size: 12px;">Sent by JobHop Automator</p>
                </div>
              `,
            }),
          });

          if (resendRes.ok) {
            sentCount++;
            // Mark reminder as sent
            await supabase
              .from("interviews")
              .update({ reminder_sent: true })
              .eq("id", interview.id);
          } else {
            const errText = await resendRes.text();
            errors.push(`Resend failed for ${interview.id}: ${errText}`);
          }
        } else {
          console.log(`Would send reminder to ${userEmail} for ${jobInfo}`);
          // Mark as sent even without Resend to avoid repeated attempts
          await supabase
            .from("interviews")
            .update({ reminder_sent: true })
            .eq("id", interview.id);
          sentCount++;
        }
      } catch (e) {
        errors.push(`Error processing interview ${interview.id}: ${e}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sentCount} reminder(s) for tomorrow's interviews`,
        total: interviews.length,
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
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
