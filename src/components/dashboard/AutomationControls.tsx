import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw, Mail } from "lucide-react";

export const AutomationControls = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [dailyCap, setDailyCap] = useState(5);
  const [isScraping, setIsScraping] = useState(false);

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

      // Get user preferences
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const { data, error } = await supabase.functions.invoke("scrape-jobs", {
        body: {
          source: "all",
          keywords: prefs?.keywords || [],
          location: prefs?.locations?.[0] || "any",
          jobType: prefs?.job_type || "both",
        },
      });

      if (error) throw error;

      toast.success(`Found ${data.jobsFound} jobs, added ${data.jobsInserted} new ones`);
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

      const { data, error } = await supabase.functions.invoke("automate-applications", {
        body: { userId: user.id },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error running automation:", error);
      toast.error("Automation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>
            Configure auto-apply settings for job applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-mode">Auto-Apply Mode</Label>
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
            <p className="text-xs text-muted-foreground">
              Maximum applications per day (1-50)
            </p>
          </div>

          <Button
            onClick={() => handleToggleAutoMode(isAutoMode)}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Manually trigger automation tasks
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Scrape New Jobs
          </Button>

          <Button
            onClick={handleRunAutomation}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send Applications Now
          </Button>

          <p className="text-xs text-muted-foreground">
            {isAutoMode
              ? "Auto-apply is active. Applications will be sent automatically."
              : "Enable auto-mode to send applications automatically."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
