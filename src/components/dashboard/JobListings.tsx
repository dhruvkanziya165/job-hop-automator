import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  ExternalLink,
  Clock,
  Briefcase,
  Star,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import JobFilters from "./JobFilters";
import { CircularProgress } from "./CircularProgress";
import { JobDetailsModal } from "./JobDetailsModal";
import { BulkSelectBar } from "./BulkSelectBar";
import JobScrapeControls from "./JobScrapeControls";
import { isValidJobUrl, classifyApplyType, cleanMarkdownText } from "@/lib/jobUtils";

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
  const [filters, setFilters] = useState<{ location?: string; jobType?: string; salaryMin?: number; salaryMax?: number; keywords?: string[] }>({ jobType: "both" });
  const [matchScores, setMatchScores] = useState<Record<string, { score: number; reasons: string[] }>>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  
  // Bulk selection state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchJobs();
    fetchAppliedJobIds();
  }, [filters.location, filters.jobType]);

  useEffect(() => {
    filterJobsBySalaryAndKeywords();
  }, [jobs, filters.salaryMin, filters.salaryMax, filters.keywords]);

  useEffect(() => {
    if (filteredJobs.length > 0) {
      fetchMatchScores();
    }
  }, [filteredJobs]);

  const fetchAppliedJobIds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from("applications")
      .select("job_id")
      .eq("user_id", user.id);
    
    if (data) {
      setAppliedJobIds(new Set(data.map(a => a.job_id)));
    }
  };

  const fetchJobs = async () => {
    let query = supabase
      .from("job_postings")
      .select("*");
    
    if (filters.jobType && filters.jobType !== "both") {
      query = query.eq("job_type", filters.jobType);
    }
    
    const { data, error } = await query
      .order("fetched_at", { ascending: false })
      .limit(2000);

    if (error) {
      toast.error("Failed to fetch jobs");
      return;
    }

    // Filter out jobs with invalid URLs
    let filteredData = (data || []).filter(job => isValidJobUrl(job.url));
    
    // Smart location filtering
    if (filters.location) {
      const searchLocation = filters.location.toLowerCase().trim();
      const locationParts = searchLocation.split(',').map(p => p.trim());
      const city = locationParts[0];
      const state = locationParts[1] || '';
      
      const exactMatches: typeof filteredData = [];
      const stateMatches: typeof filteredData = [];
      const remoteMatches: typeof filteredData = [];
      const indiaMatches: typeof filteredData = [];
      const otherMatches: typeof filteredData = [];
      
      filteredData.forEach(job => {
        const jobLocation = (job.location || '').toLowerCase();
        
        if (jobLocation.includes(city)) {
          exactMatches.push(job);
        } else if (state && jobLocation.includes(state)) {
          stateMatches.push(job);
        } else if (
          jobLocation.includes('remote') || 
          jobLocation.includes('wfh') || 
          jobLocation.includes('work from home') ||
          jobLocation.includes('anywhere')
        ) {
          remoteMatches.push(job);
        } else if (jobLocation.includes('india') || jobLocation.includes('pan india')) {
          indiaMatches.push(job);
        } else {
          otherMatches.push(job);
        }
      });
      
      filteredData = [
        ...exactMatches,
        ...stateMatches,
        ...remoteMatches,
        ...indiaMatches,
        ...(exactMatches.length + stateMatches.length + remoteMatches.length + indiaMatches.length < 20 
          ? otherMatches.slice(0, 30) 
          : [])
      ];
    }

    setJobs(filteredData);
    setLoading(false);
  };

  const parseSalaryRange = (salaryRange: string | null): { min: number; max: number } | null => {
    if (!salaryRange) return null;
    const numbers = salaryRange.match(/\d+/g);
    if (!numbers || numbers.length === 0) return null;
    const values = numbers.map(n => parseInt(n));
    
    if (salaryRange.toLowerCase().includes('lpa') || salaryRange.toLowerCase().includes('lakh')) {
      return { min: values[0] * 100, max: values.length > 1 ? values[1] * 100 : values[0] * 100 };
    } else if (salaryRange.includes('$') || salaryRange.includes('USD')) {
      return {
        min: Math.round((values[0] * 83) / 1000),
        max: values.length > 1 ? Math.round((values[1] * 83) / 1000) : Math.round((values[0] * 83) / 1000)
      };
    } else if (salaryRange.includes('k') || salaryRange.includes('K')) {
      const isUSD = salaryRange.includes('$');
      if (isUSD) {
        return {
          min: Math.round((values[0] * 1000 * 83) / 1000),
          max: values.length > 1 ? Math.round((values[1] * 1000 * 83) / 1000) : Math.round((values[0] * 1000 * 83) / 1000)
        };
      }
      return { min: values[0], max: values.length > 1 ? values[1] : values[0] };
    } else {
      return { min: values[0], max: values.length > 1 ? values[1] : values[0] };
    }
  };

  const filterJobsBySalaryAndKeywords = () => {
    let filtered = jobs;

    // Exclude already-applied jobs
    filtered = filtered.filter(job => !appliedJobIds.has(job.id));

    if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
      filtered = filtered.filter(job => {
        const salaryRange = parseSalaryRange(job.salary_range);
        if (!salaryRange) return true;
        const filterMin = filters.salaryMin || 0;
        const filterMax = filters.salaryMax || Infinity;
        return salaryRange.max >= filterMin && salaryRange.min <= filterMax;
      });
    }

    if (filters.keywords && filters.keywords.length > 0) {
      filtered = filtered.filter(job => {
        const searchText = `${job.title} ${job.description} ${job.company}`.toLowerCase();
        return filters.keywords!.some(keyword => searchText.includes(keyword.toLowerCase()));
      });
    }

    setFilteredJobs(filtered);
  };

  const fetchMatchScores = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const jobsToScore = filteredJobs.slice(0, 10);
    
    for (const job of jobsToScore) {
      try {
        const { data, error } = await supabase.functions.invoke('calculate-job-match', {
          body: { jobId: job.id }
        });
        if (!error && data) {
          setMatchScores(prev => ({ ...prev, [job.id]: data }));
        }
      } catch (err) {
        console.error('Error fetching match score:', err);
      }
    }
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    const similar = filteredJobs
      .filter(j => 
        j.id !== job.id && 
        (j.job_type === job.job_type || 
         j.company.toLowerCase().includes(job.company.toLowerCase().split(' ')[0]) ||
         j.location?.toLowerCase().includes(job.location?.toLowerCase().split(',')[0] || ''))
      )
      .slice(0, 5);
    setSimilarJobs(similar);
    setModalOpen(true);
  };

  const handleApplyRedirect = async (job: Job) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to apply");
      return;
    }

    const applyType = classifyApplyType(job.url);

    if (applyType.type === "unsupported") {
      toast.error("This job has an invalid link. Please search for it manually.");
      return;
    }

    // Open the real job link
    window.open(job.url, "_blank");

    // Track in database as "pending" (user needs to complete on external site)
    const { error } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        job_id: job.id,
        status: "pending",
        notes: `Apply type: ${applyType.label}. Redirected to ${new URL(job.url).hostname}`,
      });

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.info("You've already tracked this application");
      } else {
        toast.error("Failed to track application");
      }
      return;
    }

    setAppliedJobIds(prev => new Set(prev).add(job.id));

    if (applyType.type === "manual") {
      toast.info(
        `📋 Opened ${job.company}'s application page. Complete your application there — we've tracked it for you.`,
        { duration: 6000 }
      );
    } else {
      toast.success(
        `🔗 Opened job at ${job.company}. Complete your application and we'll track it.`,
        { duration: 5000 }
      );
    }
  };

  // Bulk selection handlers
  const toggleJobSelection = (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const selectAllJobs = () => {
    setSelectedJobIds(new Set(filteredJobs.map(j => j.id)));
  };

  const clearSelection = () => {
    setSelectedJobIds(new Set());
  };

  const handleBulkApplyComplete = () => {
    clearSelection();
    fetchJobs();
    fetchAppliedJobIds();
  };

  const selectedJobs = filteredJobs.filter(j => selectedJobIds.has(j.id));

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading jobs...</div>
      </Card>
    );
  }

  if (filteredJobs.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <JobScrapeControls onJobsUpdated={fetchJobs} />
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Matched Jobs</h2>
        </div>
        <JobFilters onFilterChange={setFilters} currentFilters={filters} />
        <Card className="p-8 text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
          <p className="text-muted-foreground mb-4">
            Use the controls above to add 1000+ India-focused jobs instantly!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <JobScrapeControls onJobsUpdated={fetchJobs} />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Matched Jobs
          </h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            {filteredJobs.length} verified opportunities
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <ShieldCheck className="h-3 w-3" />
              Real links only
            </span>
          </p>
        </div>
      </div>
      
      {/* Trust banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/5 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          <strong>Honest applications only.</strong> We redirect you to the real job page — no fake submissions. All links are verified.
        </span>
      </div>
      
      <JobFilters onFilterChange={setFilters} currentFilters={filters} />

      <div className="grid gap-4">
        {filteredJobs.map((job) => {
          const cleanTitle = cleanMarkdownText(job.title);
          const cleanDescription = cleanMarkdownText(job.description || "");
          const cleanCompany = cleanMarkdownText(job.company);
          const matchScore = matchScores[job.id];
          const isSelected = selectedJobIds.has(job.id);
          const applyType = classifyApplyType(job.url);
          
          return (
            <Card 
              key={job.id} 
              className={`group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-background/50 cursor-pointer ${
                isSelected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
              }`}
              onClick={() => handleJobClick(job)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="shrink-0 pt-1"
                    onClick={(e) => toggleJobSelection(job.id, e)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleJobSelection(job.id)}
                      className="h-5 w-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                  
                  {matchScore && (
                    <div className="shrink-0">
                      <CircularProgress value={matchScore.score} size={70} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {cleanTitle}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5 font-semibold text-foreground bg-secondary/50 px-3 py-1 rounded-full">
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span className="truncate">{cleanCompany}</span>
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="truncate">{job.location}</span>
                            </span>
                          )}
                          {job.salary_range && (
                            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/30 px-3 py-1 rounded-full">
                              <DollarSign className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {job.salary_range.includes('$') || job.salary_range.includes('USD') 
                                  ? `₹${job.salary_range.replace(/\$/g, '').replace('USD', '')} (approx)` 
                                  : job.salary_range.includes('lpa') || job.salary_range.includes('LPA')
                                  ? job.salary_range
                                  : `₹${job.salary_range}`}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Badge 
                      variant="secondary" 
                      className="whitespace-nowrap font-semibold shadow-sm"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {job.source}
                    </Badge>
                    <Badge 
                      variant={job.job_type === "internship" ? "default" : "outline"}
                      className={job.job_type === "internship" 
                        ? "bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-sm" 
                        : "border-2 font-semibold"}
                    >
                      {job.job_type === "internship" ? "🎓 Internship" : "💼 Full-time"}
                    </Badge>
                    {/* Apply Type Badge */}
                    <Badge 
                      variant="outline"
                      className={`text-[10px] font-semibold ${applyType.badgeColor}`}
                    >
                      {applyType.type === "manual" && "🔗 "}
                      {applyType.type === "direct" && "⚡ "}
                      {applyType.type === "unsupported" && "⚠️ "}
                      {applyType.label}
                    </Badge>
                  </div>
                </div>

                {cleanDescription && cleanDescription.length > 20 && (
                  <div className="pl-14">
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {cleanDescription}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">
                      Posted {new Date(job.posted_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(job.url, "_blank");
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyRedirect(job);
                      }}
                      disabled={applyType.type === "unsupported"}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Apply Now
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <JobDetailsModal
        job={selectedJob}
        open={modalOpen}
        onOpenChange={setModalOpen}
        matchScore={selectedJob ? matchScores[selectedJob.id] : undefined}
        similarJobs={similarJobs}
        onApply={(jobId) => {
          const job = filteredJobs.find(j => j.id === jobId);
          if (job) handleApplyRedirect(job);
        }}
        onJobSelect={handleJobClick}
      />

      {/* Bulk Selection Bar */}
      <BulkSelectBar
        selectedCount={selectedJobIds.size}
        totalCount={Math.min(filteredJobs.length, 50)}
        onSelectAll={selectAllJobs}
        onClearSelection={clearSelection}
        onBulkApply={() => {
          // Bulk apply = open all selected job URLs + track them
          selectedJobs.forEach(job => handleApplyRedirect(job));
          clearSelection();
        }}
        isAllSelected={selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0}
      />
    </div>
  );
};

export default JobListings;
