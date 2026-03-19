import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { classifyApplyType } from "@/lib/jobUtils";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary_range?: string;
}

interface OneClickApplyProps {
  job: Job;
  onApplied?: () => void;
}

export const OneClickApply = ({ job, onApplied }: OneClickApplyProps) => {
  const applyType = classifyApplyType(job.url);

  const handleApply = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to apply");
      return;
    }

    if (applyType.type === "unsupported") {
      toast.error("This job has an invalid link.");
      return;
    }

    // Open real job URL
    window.open(job.url, "_blank");

    // Track application
    const { error } = await supabase.from("applications").insert({
      user_id: user.id,
      job_id: job.id,
      status: "pending",
      notes: `Apply type: ${applyType.label}. Redirected to ${new URL(job.url).hostname}`,
    });

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.info("You've already tracked this application");
      }
      return;
    }

    toast.info(
      `📋 Opened ${job.company}'s application page. Complete your application there — we've tracked it for you.`,
      { duration: 6000 }
    );
    onApplied?.();
  };

  return (
    <Button
      onClick={handleApply}
      disabled={applyType.type === "unsupported"}
      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
      size="lg"
    >
      <ExternalLink className="mr-2 h-5 w-5" />
      {applyType.type === "manual" ? "Open & Apply" : "Apply Now"}
    </Button>
  );
};
