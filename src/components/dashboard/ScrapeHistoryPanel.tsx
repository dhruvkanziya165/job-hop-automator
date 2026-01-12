import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  History, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Play,
  Calendar
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface ScrapeLog {
  id: string;
  scrape_type: string;
  status: string;
  jobs_found: number;
  jobs_inserted: number;
  keywords: string[];
  locations: string[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface ScrapeHistoryPanelProps {
  onJobsUpdated?: () => void;
}

const ScrapeHistoryPanel = ({ onJobsUpdated }: ScrapeHistoryPanelProps) => {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManualScraping, setIsManualScraping] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("job_scrape_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load scrape history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Set up realtime subscription
    const channel = supabase
      .channel("scrape-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_scrape_logs" },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleManualScrape = async () => {
    setIsManualScraping(true);
    try {
      toast.info("Starting manual job scrape...");
      
      const { data, error } = await supabase.functions.invoke("daily-job-scrape", {
        body: {
          scrapeType: "manual",
          keywords: ["software", "developer", "engineer", "data", "product", "design"],
          locations: ["Bangalore", "Mumbai", "Delhi NCR", "Hyderabad", "Pune"]
        }
      });

      if (error) throw error;

      toast.success(`🎉 Scrape completed! Added ${data.jobsInserted} new jobs`);
      await fetchLogs();
      onJobsUpdated?.();
    } catch (error: any) {
      console.error("Manual scrape error:", error);
      toast.error(error.message || "Failed to run manual scrape");
    } finally {
      setIsManualScraping(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "running":
        return <Badge variant="secondary">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "scheduled":
        return <Badge variant="outline" className="text-xs"><Calendar className="h-3 w-3 mr-1" />Scheduled</Badge>;
      case "manual":
        return <Badge variant="secondary" className="text-xs"><Play className="h-3 w-3 mr-1" />Manual</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Scrape History & Logs
          </CardTitle>
          <CardDescription>
            Track when job scraping runs and results
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={handleManualScrape}
            disabled={isManualScraping}
            size="sm"
          >
            {isManualScraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Now
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scrape history yet</p>
            <p className="text-sm">Run a manual scrape or wait for the daily scheduled job</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium">
                        {format(new Date(log.started_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {getTypeBadge(log.scrape_type)}
                      {getStatusBadge(log.status)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Jobs Found</p>
                      <p className="text-lg font-semibold">{log.jobs_found}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Jobs Added</p>
                      <p className="text-lg font-semibold text-green-500">{log.jobs_inserted}</p>
                    </div>
                  </div>

                  {log.keywords && log.keywords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {log.keywords.slice(0, 5).map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {log.keywords.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{log.keywords.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {log.error_message && (
                    <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-sm">
                      {log.error_message}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    {log.completed_at
                      ? `Completed ${formatDistanceToNow(new Date(log.completed_at))} ago`
                      : `Started ${formatDistanceToNow(new Date(log.started_at))} ago`}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ScrapeHistoryPanel;
