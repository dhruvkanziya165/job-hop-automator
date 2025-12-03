import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  FileText, 
  Briefcase,
  Clock,
  AlertTriangle
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
}

interface Resume {
  id: string;
  file_name: string;
  role_type: string | null;
  is_default: boolean | null;
}

interface ApplicationResult {
  jobId: string;
  jobTitle: string;
  company: string;
  status: "pending" | "sending" | "success" | "failed";
  error?: string;
}

interface BulkApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJobs: Job[];
  onComplete: () => void;
}

export const BulkApplyModal = ({ 
  open, 
  onOpenChange, 
  selectedJobs, 
  onComplete 
}: BulkApplyModalProps) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);
  const [currentStep, setCurrentStep] = useState<"select" | "progress" | "complete">("select");
  const [results, setResults] = useState<ApplicationResult[]>([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);

  useEffect(() => {
    if (open) {
      fetchResumes();
      setCurrentStep("select");
      setResults([]);
      setCurrentJobIndex(0);
    }
  }, [open]);

  const fetchResumes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });

    if (!error && data) {
      setResumes(data);
      const defaultResume = data.find(r => r.is_default);
      if (defaultResume) {
        setSelectedResumeId(defaultResume.id);
      } else if (data.length > 0) {
        setSelectedResumeId(data[0].id);
      }
    }
  };

  const startBulkApply = async () => {
    if (!selectedResumeId && resumes.length > 0) {
      toast.error("Please select a resume");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    setIsApplying(true);
    setCurrentStep("progress");
    
    // Initialize results with pending status
    const initialResults: ApplicationResult[] = selectedJobs.map(job => ({
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      status: "pending"
    }));
    setResults(initialResults);

    // Process each job
    for (let i = 0; i < selectedJobs.length; i++) {
      const job = selectedJobs[i];
      setCurrentJobIndex(i);
      
      // Update current job to "sending"
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: "sending" } : r
      ));

      try {
        // Generate email for this job
        const { data: emailData, error: emailError } = await supabase.functions.invoke("generate-email", {
          body: {
            jobId: job.id,
            userId: user.id,
            emailType: "application",
          },
        });

        if (emailError) throw new Error(emailError.message);

        // Generate HR email (in production, you'd have actual contact data)
        const hrEmail = `hr@${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

        // Send application
        const { data: sendData, error: sendError } = await supabase.functions.invoke("send-application", {
          body: {
            jobId: job.id,
            userId: user.id,
            subject: emailData.subject,
            body: emailData.body,
            toEmail: hrEmail,
            resumeId: selectedResumeId || null,
          },
        });

        if (sendError) throw new Error(sendError.message);

        // Mark as success
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: "success" } : r
        ));

      } catch (error) {
        // Mark as failed
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: "failed", 
            error: error instanceof Error ? error.message : "Unknown error" 
          } : r
        ));
      }

      // Small delay between applications to avoid rate limits
      if (i < selectedJobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsApplying(false);
    setCurrentStep("complete");
  };

  const successCount = results.filter(r => r.status === "success").length;
  const failedCount = results.filter(r => r.status === "failed").length;
  const progress = results.length > 0 
    ? Math.round(((successCount + failedCount) / results.length) * 100) 
    : 0;

  const handleClose = () => {
    if (!isApplying) {
      onOpenChange(false);
      if (currentStep === "complete") {
        onComplete();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {currentStep === "select" && "Bulk Apply"}
            {currentStep === "progress" && "Sending Applications..."}
            {currentStep === "complete" && "Applications Complete"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === "select" && `Apply to ${selectedJobs.length} selected jobs`}
            {currentStep === "progress" && `Processing ${currentJobIndex + 1} of ${selectedJobs.length}`}
            {currentStep === "complete" && `${successCount} successful, ${failedCount} failed`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentStep === "select" && (
            <>
              {/* Resume Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Select Resume
                </label>
                {resumes.length > 0 ? (
                  <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.map((resume) => (
                        <SelectItem key={resume.id} value={resume.id}>
                          {resume.file_name} {resume.is_default && "(Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    No resumes uploaded. Applications will be sent without resume attachment.
                  </div>
                )}
              </div>

              {/* Selected Jobs Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Jobs to Apply ({selectedJobs.length})
                </label>
                <ScrollArea className="h-48 rounded-lg border p-3">
                  <div className="space-y-2">
                    {selectedJobs.map((job) => (
                      <div key={job.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="truncate font-medium">{job.title}</span>
                        <span className="text-muted-foreground truncate">at {job.company}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Button 
                onClick={startBulkApply} 
                className="w-full"
                size="lg"
              >
                <Mail className="mr-2 h-4 w-4" />
                Send {selectedJobs.length} Applications
              </Button>
            </>
          )}

          {(currentStep === "progress" || currentStep === "complete") && (
            <>
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Results List */}
              <ScrollArea className="h-64 rounded-lg border">
                <div className="p-3 space-y-2">
                  {results.map((result, idx) => (
                    <div 
                      key={result.jobId} 
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        result.status === "sending" ? "bg-primary/10" : 
                        result.status === "success" ? "bg-green-50 dark:bg-green-950/20" :
                        result.status === "failed" ? "bg-red-50 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <div className="shrink-0">
                        {result.status === "pending" && (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        {result.status === "sending" && (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        )}
                        {result.status === "success" && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {result.status === "failed" && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.jobTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.company}</p>
                        {result.error && (
                          <p className="text-xs text-red-600 truncate">{result.error}</p>
                        )}
                      </div>
                      <Badge variant={
                        result.status === "success" ? "default" :
                        result.status === "failed" ? "destructive" :
                        "secondary"
                      } className="shrink-0">
                        {result.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {currentStep === "complete" && (
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={() => window.location.href = "/tracker"}
                    className="flex-1"
                  >
                    View Applications
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
