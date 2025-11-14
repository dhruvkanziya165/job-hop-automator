import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, userId, subject, body, toEmail } = await req.json();
    console.log(`Sending application for job ${jobId} to ${toEmail}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Fetch user profile for sender info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Format email with signature
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>${body.replace(/\n/g, '<br>')}</p>
        <br>
        <p>Best regards,<br>
        <strong>${profile.full_name || "Applicant"}</strong></p>
        ${profile.phone ? `<p>Phone: ${profile.phone}</p>` : ''}
        ${profile.linkedin_url ? `<p>LinkedIn: <a href="${profile.linkedin_url}">${profile.linkedin_url}</a></p>` : ''}
        ${profile.portfolio_url ? `<p>Portfolio: <a href="${profile.portfolio_url}">${profile.portfolio_url}</a></p>` : ''}
      </div>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "JobAgent Pro <onboarding@resend.dev>", // Replace with your verified domain
      to: [toEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Create or update application record
    const { data: existingApp } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .single();

    if (existingApp) {
      // Update existing application
      const { error: updateError } = await supabase
        .from("applications")
        .update({
          status: "applied",
          applied_at: new Date().toISOString(),
          notes: `Email sent to ${toEmail}`,
        })
        .eq("id", existingApp.id);

      if (updateError) {
        console.error("Error updating application:", updateError);
      }
    } else {
      // Create new application
      const { error: insertError } = await supabase
        .from("applications")
        .insert({
          user_id: userId,
          job_id: jobId,
          status: "applied",
          applied_at: new Date().toISOString(),
          notes: `Email sent to ${toEmail}`,
        });

      if (insertError) {
        console.error("Error creating application:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id || "unknown",
        message: "Application sent successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-application function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
