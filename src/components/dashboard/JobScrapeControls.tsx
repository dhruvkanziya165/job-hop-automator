import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Zap, 
  Globe, 
  Building2,
  MapPin,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Database,
  History,
  Play
} from "lucide-react";
import ScrapeHistoryPanel from "./ScrapeHistoryPanel";

const INDIAN_CITIES = [
  "Bangalore", "Mumbai", "Delhi NCR", "Hyderabad", "Chennai", "Pune",
  "Kolkata", "Ahmedabad", "Noida", "Gurugram", "Jaipur", "Lucknow",
  "Chandigarh", "Kochi", "Coimbatore", "Indore", "Remote India"
];

const JOB_CATEGORIES = [
  "all", "engineering", "data", "product", "design", 
  "sales_marketing", "operations", "internships"
];

interface JobScrapeControlsProps {
  onJobsUpdated: () => void;
}

const JobScrapeControls = ({ onJobsUpdated }: JobScrapeControlsProps) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [jobCount, setJobCount] = useState("500");
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{ total: number; today: number } | null>(null);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalResult, todayResult] = await Promise.all([
      supabase.from("job_postings").select("id", { count: "exact", head: true }),
      supabase.from("job_postings")
        .select("id", { count: "exact", head: true })
        .gte("fetched_at", today.toISOString())
    ]);

    setStats({
      total: totalResult.count || 0,
      today: todayResult.count || 0
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSeedJobs = async () => {
    setIsSeeding(true);
    setProgress(10);

    try {
      toast.info(`Generating ${jobCount} India-focused jobs...`);
      setProgress(30);

      const { data, error } = await supabase.functions.invoke("seed-india-jobs", {
        body: {
          count: parseInt(jobCount),
          location: selectedCity,
          category: selectedCategory
        }
      });

      setProgress(90);

      if (error) throw error;

      toast.success(`🎉 Added ${data.jobsInserted} new jobs!`);
      setProgress(100);
      await fetchStats();
      onJobsUpdated();
    } catch (error: any) {
      console.error("Seed error:", error);
      toast.error(error.message || "Failed to seed jobs");
    } finally {
      setIsSeeding(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleLiveScrape = async () => {
    setIsScraping(true);
    setProgress(10);

    try {
      toast.info("Scraping live jobs from multiple sources...");
      setProgress(30);

      const { data, error } = await supabase.functions.invoke("scrape-jobs", {
        body: {
          source: "all",
          keywords: ["software", "developer", "engineer", "data", "product"],
          location: selectedCity === "all" ? "India" : selectedCity,
          jobType: "both"
        }
      });

      setProgress(90);

      if (error) throw error;

      toast.success(`🔍 Scraped ${data.jobsFound} jobs, added ${data.jobsInserted} new!`);
      setProgress(100);
      await fetchStats();
      onJobsUpdated();
    } catch (error: any) {
      console.error("Scrape error:", error);
      toast.error(error.message || "Failed to scrape jobs");
    } finally {
      setIsScraping(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="controls" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="controls" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Job Controls
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Scrape History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="mt-4">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Job Database Controls
              </CardTitle>
              <CardDescription>
                Add 1000+ India-focused jobs instantly or scrape live from job boards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold text-primary">{stats.total.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-sm text-muted-foreground">Added Today</p>
                    <p className="text-2xl font-bold text-green-500">{stats.today.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {progress > 0 && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {progress < 100 ? "Processing..." : "Complete!"}
                  </p>
                </div>
              )}

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    City
                  </label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {INDIAN_CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Category
                  </label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Jobs to Add
                  </label>
                  <Select value={jobCount} onValueChange={setJobCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 Jobs</SelectItem>
                      <SelectItem value="250">250 Jobs</SelectItem>
                      <SelectItem value="500">500 Jobs</SelectItem>
                      <SelectItem value="1000">1,000 Jobs</SelectItem>
                      <SelectItem value="2000">2,000 Jobs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={handleSeedJobs}
                  disabled={isSeeding || isScraping}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  size="lg"
                >
                  {isSeeding ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Jobs...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      Add {jobCount}+ Jobs Instantly
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleLiveScrape}
                  disabled={isSeeding || isScraping}
                  variant="outline"
                  className="w-full border-2"
                  size="lg"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Scraping Live...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-5 w-5" />
                      Scrape Live Jobs
                    </>
                  )}
                </Button>
              </div>

              {/* Info badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  TCS, Infosys, Wipro
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Google, Microsoft, Amazon
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Flipkart, Zomato, Swiggy
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  20+ Indian Cities
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ScrapeHistoryPanel onJobsUpdated={onJobsUpdated} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobScrapeControls;
