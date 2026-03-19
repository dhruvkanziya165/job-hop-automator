import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, DollarSign, ExternalLink, Clock, Briefcase, CheckCircle2, Lightbulb, ShieldCheck, AlertTriangle } from "lucide-react";
import { CircularProgress } from "./CircularProgress";
import { classifyApplyType, cleanMarkdownText } from "@/lib/jobUtils";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary_range: string;
  description: string;
  url: string;
  source: string;
  posted_date: string;
  job_type: string;
}

interface JobDetailsModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchScore?: { score: number; reasons: string[] };
  similarJobs?: Job[];
  onApply: (jobId: string) => void;
  onJobSelect: (job: Job) => void;
}

export const JobDetailsModal = ({ 
  job, 
  open, 
  onOpenChange, 
  matchScore,
  similarJobs = [],
  onApply,
  onJobSelect
}: JobDetailsModalProps) => {
  if (!job) return null;

  const applyType = classifyApplyType(job.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2 text-foreground">
                {cleanMarkdownText(job.title)}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Building2 className="h-4 w-4" />
                  {cleanMarkdownText(job.company)}
                </span>
                {job.location && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                  </>
                )}
              </div>
            </div>
            {matchScore && (
              <div className="flex flex-col items-center gap-1">
                <CircularProgress value={matchScore.score} size={80} />
                <span className="text-xs text-muted-foreground">Match Score</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Job Meta */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="gap-1">
              <Briefcase className="h-3 w-3" />
              {job.job_type === "internship" ? "Internship" : "Full-time"}
            </Badge>
            {job.salary_range && (
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                {job.salary_range}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Posted {new Date(job.posted_date).toLocaleDateString()}
            </Badge>
            <Badge variant="outline">{job.source}</Badge>
            {/* Apply Type Badge */}
            <Badge variant="outline" className={applyType.badgeColor}>
              {applyType.label}
            </Badge>
          </div>

          {/* Apply Type Notice */}
          <div className={`rounded-lg p-4 border ${
            applyType.type === "manual" 
              ? "bg-amber-500/5 border-amber-200 dark:border-amber-800" 
              : applyType.type === "unsupported"
              ? "bg-destructive/5 border-destructive/20"
              : "bg-green-500/5 border-green-200 dark:border-green-800"
          }`}>
            <div className="flex items-start gap-3">
              {applyType.type === "manual" ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : applyType.type === "unsupported" ? (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium">{applyType.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We never fake submissions — your application is tracked honestly.
                </p>
              </div>
            </div>
          </div>

          {/* Match Reasons */}
          {matchScore && matchScore.reasons && matchScore.reasons.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-primary" />
                Why this matches you
              </h3>
              <ul className="space-y-2">
                {matchScore.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          {/* Description */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Job Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {cleanMarkdownText(job.description) || "No description available."}
            </p>
          </div>

          {/* Similar Jobs */}
          {similarJobs.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">Similar Opportunities</h3>
                <div className="grid gap-3">
                  {similarJobs.slice(0, 3).map((similarJob) => (
                    <div
                      key={similarJob.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        onOpenChange(false);
                        setTimeout(() => onJobSelect(similarJob), 100);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{cleanMarkdownText(similarJob.title)}</p>
                          <p className="text-xs text-muted-foreground">{cleanMarkdownText(similarJob.company)}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {similarJob.job_type === "internship" ? "Internship" : "Full-time"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => onApply(job.id)}
              disabled={applyType.type === "unsupported"}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              size="lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {applyType.type === "manual" ? "Open & Apply" : "Apply Now"}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(job.url, "_blank")}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Job Posting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
