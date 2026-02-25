import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ApplicationSuccessChart from "@/components/analytics/ApplicationSuccessChart";
import ResponseTimeChart from "@/components/analytics/ResponseTimeChart";
import JobMarketTrendsChart from "@/components/analytics/JobMarketTrendsChart";
import AnalyticsStats from "@/components/analytics/AnalyticsStats";
import { ApplicationTrendsChart } from "@/components/analytics/ApplicationTrendsChart";
import { StatusDistributionChart } from "@/components/analytics/StatusDistributionChart";
import { CompanyPerformanceChart } from "@/components/analytics/CompanyPerformanceChart";
import { WeeklyActivityChart } from "@/components/analytics/WeeklyActivityChart";
import { InterviewFeedbackCharts } from "@/components/analytics/InterviewFeedbackCharts";
import { toast } from "sonner";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch applications data
      const { data: applications, error: appError } = await supabase
        .from("applications")
        .select(`
          *,
          job_postings (
            title,
            company,
            source,
            posted_date
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (appError) throw appError;

      // Fetch all job postings for market trends
      const { data: jobPostings, error: jobsError } = await supabase
        .from("job_postings")
        .select("source, posted_date, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(500);

      if (jobsError) throw jobsError;

      setAnalyticsData({
        applications: applications || [],
        jobPostings: jobPostings || [],
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your application success and job market insights
          </p>
        </div>

        <AnalyticsStats applications={analyticsData?.applications || []} />

        {/* Trends Overview */}
        <ApplicationTrendsChart applications={analyticsData?.applications || []} />

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <StatusDistributionChart applications={analyticsData?.applications || []} />
          <WeeklyActivityChart applications={analyticsData?.applications || []} />
        </div>

        <CompanyPerformanceChart applications={analyticsData?.applications || []} />

        {/* Interview Feedback Analytics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Interview Feedback Analytics</h2>
          <InterviewFeedbackCharts />
        </div>

        <Tabs defaultValue="success" className="space-y-4">
          <TabsList>
            <TabsTrigger value="success">Success Rate</TabsTrigger>
            <TabsTrigger value="response">Response Times</TabsTrigger>
            <TabsTrigger value="trends">Market Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="success" className="space-y-4">
            <Card className="p-6">
              <ApplicationSuccessChart applications={analyticsData?.applications || []} />
            </Card>
          </TabsContent>

          <TabsContent value="response" className="space-y-4">
            <Card className="p-6">
              <ResponseTimeChart applications={analyticsData?.applications || []} />
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card className="p-6">
              <JobMarketTrendsChart jobPostings={analyticsData?.jobPostings || []} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
