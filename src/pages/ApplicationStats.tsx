import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Clock, Target, Award, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Application {
  id: string;
  status: string;
  created_at: string;
  applied_at: string | null;
  updated_at: string;
  job_postings: {
    company: string;
    job_type: string;
  };
}

const COLORS = {
  pending: 'hsl(var(--chart-1))',
  applied: 'hsl(var(--chart-2))',
  interview: 'hsl(var(--chart-3))',
  offer: 'hsl(var(--chart-4))',
  rejected: 'hsl(var(--chart-5))',
  withdrawn: 'hsl(var(--muted))',
};

const ApplicationStats = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

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
          company,
          job_type
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to load statistics");
      return;
    }

    setApplications(data || []);
    setLoading(false);
  };

  // Calculate metrics
  const totalApplications = applications.length;
  const appliedCount = applications.filter(a => a.status !== 'pending').length;
  const interviewCount = applications.filter(a => a.status === 'interview').length;
  const offerCount = applications.filter(a => a.status === 'offer').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  const responseRate = appliedCount > 0 ? ((interviewCount + offerCount) / appliedCount * 100).toFixed(1) : '0';
  const successRate = appliedCount > 0 ? (offerCount / appliedCount * 100).toFixed(1) : '0';
  const interviewRate = appliedCount > 0 ? (interviewCount / appliedCount * 100).toFixed(1) : '0';

  // Calculate average time to interview
  const applicationsWithInterview = applications.filter(a => 
    a.status === 'interview' && a.applied_at
  );
  const avgTimeToInterview = applicationsWithInterview.length > 0
    ? applicationsWithInterview.reduce((sum, app) => {
        const appliedDate = new Date(app.applied_at!);
        const interviewDate = new Date(app.updated_at);
        const days = Math.floor((interviewDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / applicationsWithInterview.length
    : 0;

  // Status distribution data
  const statusData = [
    { name: 'Pending', value: applications.filter(a => a.status === 'pending').length, color: COLORS.pending },
    { name: 'Applied', value: applications.filter(a => a.status === 'applied').length, color: COLORS.applied },
    { name: 'Interview', value: interviewCount, color: COLORS.interview },
    { name: 'Offer', value: offerCount, color: COLORS.offer },
    { name: 'Rejected', value: rejectedCount, color: COLORS.rejected },
    { name: 'Withdrawn', value: applications.filter(a => a.status === 'withdrawn').length, color: COLORS.withdrawn },
  ].filter(item => item.value > 0);

  // Success by company data (top 10 companies by application count)
  const companyStats = applications.reduce((acc, app) => {
    const company = app.job_postings.company;
    if (!acc[company]) {
      acc[company] = { total: 0, interview: 0, offer: 0, rejected: 0 };
    }
    acc[company].total++;
    if (app.status === 'interview') acc[company].interview++;
    if (app.status === 'offer') acc[company].offer++;
    if (app.status === 'rejected') acc[company].rejected++;
    return acc;
  }, {} as Record<string, { total: number; interview: number; offer: number; rejected: number }>);

  const companyData = Object.entries(companyStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([company, stats]) => ({
      company: company.length > 20 ? company.substring(0, 20) + '...' : company,
      total: stats.total,
      interview: stats.interview,
      offer: stats.offer,
      successRate: stats.total > 0 ? ((stats.offer / stats.total) * 100).toFixed(0) : '0'
    }));

  // Success by job type
  const jobTypeStats = applications.reduce((acc, app) => {
    const type = app.job_postings.job_type || 'unknown';
    if (!acc[type]) {
      acc[type] = { total: 0, interview: 0, offer: 0 };
    }
    acc[type].total++;
    if (app.status === 'interview') acc[type].interview++;
    if (app.status === 'offer') acc[type].offer++;
    return acc;
  }, {} as Record<string, { total: number; interview: number; offer: number }>);

  const jobTypeData = Object.entries(jobTypeStats).map(([type, stats]) => ({
    type: type === 'internship' ? 'Internship' : 'Full-time',
    applications: stats.total,
    interviews: stats.interview,
    offers: stats.offer,
    successRate: stats.total > 0 ? parseFloat(((stats.offer / stats.total) * 100).toFixed(1)) : 0
  }));

  // Weekly application trend (last 8 weeks)
  const getWeekData = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const weekApps = applications.filter(app => {
        const date = new Date(app.created_at);
        return date >= weekStart && date < weekEnd;
      });

      weeks.push({
        week: `Week ${8 - i}`,
        applications: weekApps.length,
        interviews: weekApps.filter(a => a.status === 'interview').length,
        offers: weekApps.filter(a => a.status === 'offer').length
      });
    }
    return weeks;
  };

  const weeklyData = getWeekData();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Loading statistics...</div>
      </DashboardLayout>
    );
  }

  if (totalApplications === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Application Statistics
          </h1>
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No applications yet. Start applying to see your statistics!</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Application Statistics
          </h1>
          <p className="text-muted-foreground mt-2">
            Insights and analytics from your job applications
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{responseRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {interviewCount + offerCount} of {appliedCount} applied
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {offerCount} offers received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Interview Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{interviewRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {interviewCount} interviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Avg. Time to Interview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTimeToInterview.toFixed(0)} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {applicationsWithInterview.length} interviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Application Status Distribution</CardTitle>
              <CardDescription>Current status of all applications</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Application Trend</CardTitle>
              <CardDescription>Last 8 weeks of activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="applications" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  <Line type="monotone" dataKey="interviews" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                  <Line type="monotone" dataKey="offers" stroke="hsl(var(--chart-4))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Success by Job Type */}
          <Card>
            <CardHeader>
              <CardTitle>Success by Job Type</CardTitle>
              <CardDescription>Performance across different job types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jobTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="applications" fill="hsl(var(--chart-1))" name="Total" />
                  <Bar dataKey="interviews" fill="hsl(var(--chart-3))" name="Interviews" />
                  <Bar dataKey="offers" fill="hsl(var(--chart-4))" name="Offers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Companies */}
          <Card>
            <CardHeader>
              <CardTitle>Top Companies Applied</CardTitle>
              <CardDescription>Success rate by company (top 10)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={companyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="company" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--chart-1))" name="Total" />
                  <Bar dataKey="interview" fill="hsl(var(--chart-3))" name="Interview" />
                  <Bar dataKey="offer" fill="hsl(var(--chart-4))" name="Offer" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Most Applied Company
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {companyData[0]?.company || 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {companyData[0]?.total || 0} applications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Best Performing Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {jobTypeData.sort((a, b) => b.successRate - a.successRate)[0]?.type || 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {jobTypeData.sort((a, b) => b.successRate - a.successRate)[0]?.successRate.toFixed(1) || 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {rejectedCount < offerCount ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {offerCount > rejectedCount ? 'Excellent' : offerCount === rejectedCount ? 'Good' : 'Keep Going'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {offerCount} offers vs {rejectedCount} rejections
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApplicationStats;
