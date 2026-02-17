import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

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
    
    if (!interviewId || typeof interviewId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid interviewId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const startDate = new Date(interview.scheduled_at);
    const endDate = new Date(startDate.getTime() + (interview.duration_minutes || 60) * 60000);

    const jobTitle = interview.applications?.job_postings?.title || "Interview";
    const company = interview.applications?.job_postings?.company || "";
    const summary = company ? `Interview: ${jobTitle} at ${company}` : `Interview: ${jobTitle}`;
    const location = interview.meeting_link || interview.location || "";
    const description = [
      `Type: ${interview.interview_type}`,
      interview.interviewer_name ? `Interviewer: ${interview.interviewer_name}` : "",
      interview.interviewer_email ? `Email: ${interview.interviewer_email}` : "",
      interview.meeting_link ? `Meeting Link: ${interview.meeting_link}` : "",
      interview.notes ? `Notes: ${interview.notes}` : "",
    ].filter(Boolean).join("\\n");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//JobHop//Interview//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `DTSTART:${toICSDate(startDate)}`,
      `DTEND:${toICSDate(endDate)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `UID:${interview.id}@jobhop`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Interview in 30 minutes",
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Interview tomorrow",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    // Also generate a Google Calendar URL
    const gcalParams = new URLSearchParams({
      action: "TEMPLATE",
      text: summary,
      dates: `${toICSDate(startDate)}/${toICSDate(endDate)}`,
      details: description.replace(/\\n/g, "\n"),
      location: location,
    });
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;

    return new Response(
      JSON.stringify({
        icsContent,
        googleCalendarUrl,
        summary,
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
