import { Card } from "@/components/ui/card";
import { TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";

interface AnalyticsStatsProps {
  applications: any[];
}

const AnalyticsStats = ({ applications }: AnalyticsStatsProps) => {
  const totalApplications = applications.length;
  const successfulApps = applications.filter(
    (app) => app.status === "accepted" || app.status === "interviewing"
  ).length;
  const rejectedApps = applications.filter((app) => app.status === "rejected").length;
  const pendingApps = applications.filter((app) => app.status === "pending").length;

  const successRate = totalApplications > 0 
    ? ((successfulApps / totalApplications) * 100).toFixed(1) 
    : "0";

  const avgResponseTime = applications
    .filter((app) => app.applied_at && app.updated_at)
    .reduce((acc, app) => {
      const applied = new Date(app.applied_at).getTime();
      const updated = new Date(app.updated_at).getTime();
      return acc + (updated - applied);
    }, 0);

  const avgDays = applications.filter((app) => app.applied_at && app.updated_at).length > 0
    ? Math.round(avgResponseTime / (1000 * 60 * 60 * 24) / applications.filter((app) => app.applied_at && app.updated_at).length)
    : 0;

  const stats = [
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      description: `${successfulApps} successful applications`,
      color: "text-green-500",
    },
    {
      title: "Avg Response Time",
      value: `${avgDays} days`,
      icon: Clock,
      description: "Time to hear back",
      color: "text-blue-500",
    },
    {
      title: "Active Applications",
      value: pendingApps,
      icon: CheckCircle,
      description: "Pending responses",
      color: "text-yellow-500",
    },
    {
      title: "Rejected",
      value: rejectedApps,
      icon: XCircle,
      description: "Unsuccessful attempts",
      color: "text-red-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </div>
              <Icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default AnalyticsStats;
