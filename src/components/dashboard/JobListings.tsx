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
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ location?: string; jobType?: string; salaryMin?: number; salaryMax?: number }>({ jobType: "both" });

  useEffect(() => {
    fetchJobs();
  }, [filters.location, filters.jobType]);

  useEffect(() => {
    filterJobsBySalary();
  }, [jobs, filters.salaryMin, filters.salaryMax]);

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
      .limit(1000); // Show up to 1000 jobs

    if (error) {
      toast.error("Failed to fetch jobs");
      return;
    }

    setJobs(data || []);
    setLoading(false);
  };

  const parseSalaryRange = (salaryRange: string | null): { min: number; max: number } | null => {
    if (!salaryRange) return null;
    
    // Extract numbers from salary range text
    const numbers = salaryRange.match(/\d+/g);
    if (!numbers || numbers.length === 0) return null;
    
    const values = numbers.map(n => parseInt(n));
    
    // Handle different formats
    if (salaryRange.toLowerCase().includes('lpa') || salaryRange.toLowerCase().includes('lakh')) {
      // Indian format (lakhs per annum) - convert to thousands
      return {
        min: values[0] * 100, // 1 lakh = 100k
        max: values.length > 1 ? values[1] * 100 : values[0] * 100
      };
    } else if (salaryRange.includes('k') || salaryRange.includes('K')) {
      // Already in thousands
      return {
        min: values[0],
        max: values.length > 1 ? values[1] : values[0]
      };
    } else {
      // Assume it's in thousands if no unit specified
      return {
        min: values[0],
        max: values.length > 1 ? values[1] : values[0]
      };
    }
  };

  const filterJobsBySalary = () => {
    if (filters.salaryMin === undefined && filters.salaryMax === undefined) {
      setFilteredJobs(jobs);
      return;
    }

    const filtered = jobs.filter(job => {
      const salaryRange = parseSalaryRange(job.salary_range);
      if (!salaryRange) return true; // Include jobs without salary info
      
      const filterMin = filters.salaryMin || 0;
      const filterMax = filters.salaryMax || Infinity;
      
      // Job matches if its salary range overlaps with filter range
      return salaryRange.max >= filterMin && salaryRange.min <= filterMax;
    });

    setFilteredJobs(filtered);
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

  if (filteredJobs.length === 0 && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Matched Jobs</h2>
        </div>
        
        <JobFilters onFilterChange={setFilters} currentFilters={filters} />
        
        <Card className="p-8 text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or click "Scrape 100+ Jobs Now" to find new opportunities
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Matched Jobs</h2>
      </div>
      
      <JobFilters onFilterChange={setFilters} currentFilters={filters} />

      <div className="grid gap-4">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="p-6 shadow-card hover:shadow-hover transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold mb-2 truncate">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{job.company}</span>
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </span>
                    )}
                    {job.salary_range && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                        <DollarSign className="h-4 w-4 shrink-0" />
                        <span className="truncate">{job.salary_range}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {job.source}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={job.job_type === "internship" ? "border-blue-500 text-blue-600 dark:text-blue-400" : ""}
                  >
                    {job.job_type === "internship" ? "Internship" : "Full-time"}
                  </Badge>
                </div>
              </div>

              {job.description && job.description.length > 20 && (
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {job.description}
                </p>
              )}

              <div className="flex items-center justify-between gap-4 pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Posted {new Date(job.posted_date).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-gradient-primary"
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