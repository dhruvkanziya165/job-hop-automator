import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary_range?: string;
  source: string;
}

interface JobApplicationProps {
  job: Job;
  userId: string;
  onApplied?: () => void;
}

export const JobApplication = ({ job, userId, onApplied }: JobApplicationProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  const handleGenerateEmail = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          jobId: job.id,
          userId,
          emailType: "application",
        },
      });

      if (error) throw error;

      toast({
        title: "Email Generated!",
        description: "Your personalized application email is ready.",
      });

      // Show email in a modal or copy to clipboard
      navigator.clipboard.writeText(data.body);
      toast({
        title: "Copied to clipboard",
        description: "Email content has been copied. You can now paste it in your email client.",
      });
    } catch (error) {
      console.error("Error generating email:", error);
      toast({
        title: "Error",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      // Open job URL in new tab
      window.open(job.url, "_blank");

      // Mark as applied in database
      const { error } = await supabase.from("applications").insert({
        user_id: userId,
        job_id: job.id,
        status: "pending",
        applied_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Application Tracked!",
        description: `Your application to ${job.company} has been tracked.`,
      });

      onApplied?.();
    } catch (error) {
      console.error("Error tracking application:", error);
      toast({
        title: "Error",
        description: "Failed to track application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <CardDescription className="text-base font-medium">{job.company}</CardDescription>
          </div>
          <Badge variant="secondary">{job.source}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>📍 {job.location}</span>
          {job.salary_range && <span>💰 {job.salary_range}</span>}
        </div>
        <p className="text-sm line-clamp-3">{job.description}</p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleGenerateEmail}
          disabled={isGenerating}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Generate Email
            </>
          )}
        </Button>
        <Button
          onClick={handleApply}
          disabled={isApplying}
          className="flex-1"
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Apply Now
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
