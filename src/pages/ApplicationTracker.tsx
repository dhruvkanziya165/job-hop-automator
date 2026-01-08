import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ApplicationPipeline } from "@/components/dashboard/ApplicationPipeline";
import { PipelineStats } from "@/components/dashboard/PipelineStats";

interface Application {
  id: string;
  status: string;
  created_at: string;
  applied_at: string | null;
  updated_at: string;
  notes: string | null;
  job_postings: {
    id: string;
    title: string;
    company: string;
    location: string;
    url: string;
    job_type: string;
  };
}

const ApplicationTracker = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        job_postings (
          id,
          title,
          company,
          location,
          url,
          job_type
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load applications");
      return;
    }

    setApplications(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Application Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your job applications through the hiring process
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <PipelineStats applications={applications} />

        {/* Pipeline View */}
        {applications.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                <LayoutGrid className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">No applications yet</h3>
              <p className="text-muted-foreground">
                Start applying to jobs and they'll appear here. You can track 
                each application through the hiring pipeline.
              </p>
              <Button onClick={() => window.location.href = "/dashboard"}>
                Browse Jobs
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>💡 Tip: Drag and drop cards to change their status</span>
            </div>
            <ApplicationPipeline 
              applications={applications} 
              onUpdate={fetchApplications}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApplicationTracker;
