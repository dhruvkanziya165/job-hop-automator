import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  User, 
  Mail, 
  Phone,
  Linkedin,
  Globe,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary_range?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
}

interface Resume {
  id: string;
  file_name: string;
  is_default: boolean;
  role_type: string | null;
}

interface OneClickApplyProps {
  job: Job;
  onApplied?: () => void;
}

export const OneClickApply = ({ job, onApplied }: OneClickApplyProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [applyStep, setApplyStep] = useState<'preview' | 'generating' | 'sending' | 'done'>('preview');

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to apply");
        setIsOpen(false);
        return;
      }

      // Fetch profile and resumes in parallel
      const [profileRes, resumesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("resumes").select("id, file_name, is_default, role_type").eq("user_id", user.id)
      ]);

      if (profileRes.error) {
        toast.error("Please complete your profile first");
        setIsOpen(false);
        return;
      }

      setProfile(profileRes.data);
      setResumes(resumesRes.data || []);
      
      // Auto-select default resume
      const defaultResume = resumesRes.data?.find(r => r.is_default);
      if (defaultResume) {
        setSelectedResumeId(defaultResume.id);
      } else if (resumesRes.data && resumesRes.data.length > 0) {
        setSelectedResumeId(resumesRes.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load your profile");
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setApplyStep('preview');
      fetchUserData();
    }
  };

  const handleOneClickApply = async () => {
    if (!profile) return;

    setIsApplying(true);
    setApplyStep('generating');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to apply");
        return;
      }

      // Step 1: Generate personalized email
      toast.info("✨ Generating personalized application...");
      
      const { data: emailData, error: emailError } = await supabase.functions.invoke("generate-email", {
        body: {
          jobId: job.id,
          userId: profile.id,
          emailType: "application",
        },
      });

      if (emailError) {
        throw new Error("Failed to generate application email");
      }

      setApplyStep('sending');
      toast.info("📧 Sending your application...");

      // Generate HR email from company name
      const hrEmail = `hr@${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

      // Step 2: Send application with resume
      const { data: sendData, error: sendError } = await supabase.functions.invoke("send-application", {
        body: {
          jobId: job.id,
          userId: profile.id,
          subject: emailData.subject || `Application for ${job.title}`,
          body: emailData.body || `I am interested in the ${job.title} position at ${job.company}.`,
          toEmail: hrEmail,
          resumeId: selectedResumeId,
        },
      });

      if (sendError) {
        throw new Error("Failed to send application");
      }

      setApplyStep('done');
      toast.success(`🎉 Successfully applied to ${job.title} at ${job.company}!`);
      
      // Wait a moment to show success state
      setTimeout(() => {
        setIsOpen(false);
        onApplied?.();
      }, 2000);

    } catch (error) {
      console.error("One-click apply error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to apply. Please try again.");
      setApplyStep('preview');
    } finally {
      setIsApplying(false);
    }
  };

  const profileComplete = profile?.full_name && profile?.email;
  const hasResume = resumes.length > 0;
  const canApply = profileComplete && hasResume;

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
        size="lg"
      >
        <Zap className="mr-2 h-5 w-5" />
        One-Click Apply
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              One-Click Apply
            </DialogTitle>
            <DialogDescription>
              Apply to {job.title} at {job.company} instantly
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading your profile...</p>
            </div>
          ) : applyStep === 'done' ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <CheckCircle2 className="h-16 w-16 text-green-500 relative" />
              </div>
              <h3 className="text-xl font-semibold text-green-600">Application Sent!</h3>
              <p className="text-muted-foreground text-center">
                Your application has been sent to {job.company}.<br />
                Check your email for confirmation.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Job Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-lg">{job.title}</h4>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{job.company}</Badge>
                  {job.location && <Badge variant="outline">{job.location}</Badge>}
                  {job.salary_range && <Badge variant="outline">{job.salary_range}</Badge>}
                </div>
              </div>

              {/* Profile Preview */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Profile
                </h4>
                <div className="bg-background border rounded-lg p-4 space-y-2">
                  {profile?.full_name ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{profile.full_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>Name not set - please update your profile</span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {profile?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {profile.email}
                      </span>
                    )}
                    {profile?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {profile.phone}
                      </span>
                    )}
                    {profile?.linkedin_url && (
                      <span className="flex items-center gap-1">
                        <Linkedin className="h-3 w-3" /> LinkedIn
                      </span>
                    )}
                    {profile?.portfolio_url && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Portfolio
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Resume Selection */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume
                </h4>
                {hasResume ? (
                  <div className="grid gap-2">
                    {resumes.map((resume) => (
                      <button
                        key={resume.id}
                        onClick={() => setSelectedResumeId(resume.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          selectedResumeId === resume.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-primary/50"
                        }`}
                      >
                        <FileText className={`h-5 w-5 ${selectedResumeId === resume.id ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{resume.file_name}</p>
                          {resume.role_type && (
                            <p className="text-xs text-muted-foreground">{resume.role_type}</p>
                          )}
                        </div>
                        {resume.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        {selectedResumeId === resume.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">No resume uploaded. Please upload a resume first.</span>
                  </div>
                )}
              </div>

              {/* Apply Button */}
              <Button
                onClick={handleOneClickApply}
                disabled={!canApply || isApplying}
                className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {isApplying ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {applyStep === 'generating' && "Generating application..."}
                    {applyStep === 'sending' && "Sending application..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Apply Now
                  </div>
                )}
              </Button>

              {!canApply && (
                <p className="text-xs text-center text-muted-foreground">
                  Complete your profile and upload a resume to enable one-click apply
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
