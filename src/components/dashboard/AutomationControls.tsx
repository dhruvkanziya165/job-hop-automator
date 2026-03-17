import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Play, RefreshCw, Mail, CheckCircle2, 
  Building2, MapPin, Calendar, ExternalLink, Clock,
  Zap, TrendingUp, Send
} from "lucide-react";

interface AppliedJob {
  id: string;
  status: string;
  applied_at: string | null;
  created_at: string;
  notes: string | null;
  job_postings: {
    title: string;
    company: string;
    location: string | null;
    url: string;
    job_type: string | null;
  };
}

export const AutomationControls = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [dailyCap, setDailyCap] = useState(5);
  const [isScraping, setIsScraping] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [loadingApplied, setLoadingApplied] = useState(true);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    fetchAppliedJobs();
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_preferences")
      .select("apply_mode, daily_apply_cap")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setIsAutoMode(data.apply_mode === "auto");
      setDailyCap(data.daily_apply_cap || 5);
    }
  };

  const fetchAppliedJobs = async () => {
    setLoadingApplied(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allRes, todayRes] = await Promise.all([
      supabase
        .from("applications")
        .select(`*, job_postings (title, company, location, url, job_type)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString()),
    ]);

    setAppliedJobs(allRes.data || []);
    setTodayCount(todayRes.data?.length || 0);
    setLoadingApplied(false);
  };

  const handleToggleAutoMode = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_preferences")
        .update({
          apply_mode: enabled ? "auto" : "manual",
          daily_apply_cap: dailyCap,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      setIsAutoMode(enabled);
      toast.success(`Auto-apply ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling auto mode:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeJobs = async () => {
    setIsScraping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      toast.info("Starting job scraping... This may take a few minutes.");

      const { data, error } = await supabase.functions.invoke("scrape-jobs", {
        body: {
          source: "all",
          keywords: prefs?.keywords || [],
          location: prefs?.locations?.[0] || "any",
          jobType: prefs?.job_type || "both",
        },
      });

      if (error) throw error;
      toast.success(`🎉 Found ${data.jobsFound} total listings! Added ${data.jobsInserted} new jobs.`);
    } catch (error) {
      console.error("Error scraping jobs:", error);
      toast.error("Failed to scrape jobs");
    } finally {
      setIsScraping(false);
    }
  };

  const handleRunAutomation = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Temporarily enable auto mode if not already
      if (!isAutoMode) {
        await supabase
          .from("user_preferences")
          .update({ apply_mode: "auto", daily_apply_cap: dailyCap })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase.functions.invoke("automate-applications", {
        body: { userId: user.id },
      });

      // Restore manual mode if it was off
      if (!isAutoMode) {
        await supabase
          .from("user_preferences")
          .update({ apply_mode: "manual" })
          .eq("user_id", user.id);
      }

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        fetchAppliedJobs();
      } else {
        toast.error(data.message || "No new jobs to apply to");
      }
    } catch (error) {
      console.error("Error running automation:", error);
      toast.error("Automation failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "interview": return "bg-purple-500/10 text-purple-700 border-purple-200";
      case "offer": return "bg-green-500/10 text-green-700 border-green-200";
      case "rejected": return "bg-red-500/10 text-red-700 border-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{appliedJobs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Applied</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{todayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Applied Today</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {appliedJobs.filter(j => j.status === "interview").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Interviews</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-600">{dailyCap}</div>
            <p className="text-xs text-muted-foreground mt-1">Daily Limit</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-primary" />
              Automation Settings
            </CardTitle>
            <CardDescription>Configure auto-apply for job applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label htmlFor="auto-mode" className="font-medium">Auto-Apply Mode</Label>
              <Switch
                id="auto-mode"
                checked={isAutoMode}
                onCheckedChange={handleToggleAutoMode}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily-cap">Daily Application Limit</Label>
              <Input
                id="daily-cap"
                type="number"
                value={dailyCap}
                onChange={(e) => setDailyCap(parseInt(e.target.value) || 5)}
                min={1}
                max={50}
              />
            </div>

            <Button
              onClick={() => handleToggleAutoMode(isAutoMode)}
              className="w-full"
              variant="outline"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-secondary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Scrape 500+ jobs from 11 platforms & send AI-powered applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleScrapeJobs}
              className="w-full"
              variant="outline"
              disabled={isScraping}
            >
              {isScraping ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Crawling 11 Platforms...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" />Scrape 500+ Jobs Now</>
              )}
            </Button>

            <Button
              onClick={handleRunAutomation}
              className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Applications Now
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {isAutoMode
                ? "✅ Auto-apply is active. Sends applications automatically."
                : "Manual mode — click above to send a batch now."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Applied Jobs List */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Applied Jobs ({appliedJobs.length})
              </CardTitle>
              <CardDescription>Track all your submitted applications</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchAppliedJobs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingApplied ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : appliedJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No applications yet</p>
              <p className="text-sm mt-1">Click "Send Applications Now" to start applying!</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-3">
                {appliedJobs.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm line-clamp-1">
                          {app.job_postings.title}
                        </h4>
                        <Badge className={`text-[10px] shrink-0 ${getStatusColor(app.status)}`}>
                          {app.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {app.job_postings.company}
                        </span>
                        {app.job_postings.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {app.job_postings.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(app.applied_at || app.created_at)}
                        </span>
                      </div>
                      {app.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{app.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 shrink-0"
                      onClick={() => window.open(app.job_postings.url, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
