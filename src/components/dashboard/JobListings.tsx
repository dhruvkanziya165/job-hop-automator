import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  ExternalLink,
  Clock,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";
import JobFilters from "./JobFilters";

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

const JobListings = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ location?: string; jobType?: string }>({ jobType: "both" });

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    let query = supabase
      .from("job_postings")
      .select("*");
    
    // Apply location filter
    if (filters.location) {
      query = query.ilike("location", `%${filters.location}%`);
    }
    
    // Apply job type filter
    if (filters.jobType && filters.jobType !== "both") {
      query = query.eq("job_type", filters.jobType);
    }
    
    const { data, error } = await query
      .order("fetched_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to fetch jobs");
      return;
    }

    setJobs(data || []);
    setLoading(false);
  };

  const handleApply = async (jobId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        job_id: jobId,
        status: "pending",
      });

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("You've already applied to this job");
      } else {
        toast.error("Failed to apply");
      }
      return;
    }

    toast.success("Application added to queue!");
    fetchJobs();
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading jobs...</div>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No jobs found yet</h3>
        <p className="text-muted-foreground mb-4">
          Our automation agent will start finding matching jobs based on your preferences
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Matched Jobs</h2>
      </div>
      
      <JobFilters onFilterChange={setFilters} currentFilters={filters} />

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className="p-6 shadow-card hover:shadow-hover transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {job.company}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    )}
                    {job.salary_range && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {job.salary_range}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge variant="secondary">
                    {job.source}
                  </Badge>
                  <Badge variant="outline">
                    {job.job_type === "internship" ? "Internship" : "Job"}
                  </Badge>
                </div>
              </div>

              {job.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {job.description}
                </p>
              )}

              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Posted {new Date(job.posted_date).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-gradient-primary flex-1"
                    onClick={() => {
                      window.open(job.url, "_blank");
                      handleApply(job.id);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default JobListings;