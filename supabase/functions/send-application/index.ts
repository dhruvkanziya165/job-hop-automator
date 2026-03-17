import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { jobId, userId, subject, body, toEmail, resumeId } = await req.json();
    
    // Validate inputs
    if (!jobId || !validateUUID(jobId)) {
      return new Response(
        JSON.stringify({ error: "Invalid job ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!userId || !validateUUID(userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid user ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the authenticated user matches the userId in request
    if (user.id !== userId) {
      console.error("User ID mismatch: authenticated user", user.id, "vs requested", userId);
      return new Response(
        JSON.stringify({ error: "Forbidden: Cannot apply on behalf of another user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!toEmail || !validateEmail(toEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject is required and must be under 200 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body || body.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Body is required and must be under 10000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending application for job ${jobId} to ${toEmail} by user ${user.id}`);

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Fetch user profile for sender info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from("job_postings")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Fetch resume if provided
    let resumeAttachment = null;
    if (resumeId && validateUUID(resumeId)) {
      const { data: resume } = await supabaseAdmin
        .from("resumes")
        .select("*")
        .eq("id", resumeId)
        .eq("user_id", userId) // Ensure resume belongs to the user
        .single();

      if (resume) {
        // Get resume file from storage
        const { data: fileData } = await supabaseAdmin.storage
          .from("resumes")
          .download(resume.file_path);

        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Content = btoa(binary);
          resumeAttachment = {
            filename: resume.file_name,
            content: base64Content,
          };
        }
      }
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

    // Build email options
    const emailOptions: any = {
      from: "JobAgent Pro <onboarding@resend.dev>",
      to: [toEmail],
      subject: subject,
      html: emailHtml,
    };

    // Add resume attachment if available
    if (resumeAttachment) {
      emailOptions.attachments = [resumeAttachment];
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send(emailOptions);

    console.log("Email sent successfully:", emailResponse);

    // Create or update application record
    const { data: existingApp } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .single();

    if (existingApp) {
      // Update existing application
      const { error: updateError } = await supabaseAdmin
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
      const { error: insertError } = await supabaseAdmin
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

    // Send confirmation email to user
    try {
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Application Sent Successfully!</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
            <p>Hi ${profile.full_name || "there"},</p>
            <p>Great news! Your job application has been successfully sent.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #667eea;">${job.title}</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${job.company}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${job.location || "Not specified"}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Applied:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <p><strong>What's next?</strong></p>
            <ul style="color: #666;">
              <li>Keep an eye on your inbox for responses from the employer</li>
              <li>Track your application status in your dashboard</li>
              <li>Continue applying to more jobs to maximize your chances</li>
            </ul>
            
            <p style="margin-top: 20px;">Good luck with your job search! 🍀</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent by JobAgent Pro. Track all your applications in your dashboard.
            </p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: "JobAgent Pro <onboarding@resend.dev>",
        to: [profile.email],
        subject: `✅ Application Sent: ${job.title} at ${job.company}`,
        html: confirmationHtml,
      });

      console.log("Confirmation email sent to user:", profile.email);
    } catch (confirmError) {
      console.error("Error sending confirmation email:", confirmError);
      // Don't fail the whole request if confirmation email fails
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
