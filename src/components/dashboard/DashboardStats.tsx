import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Briefcase, CheckCircle, Clock, AlertCircle } from "lucide-react";

const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    applied: 0,
    pending: 0,
    needsReview: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: applications } = await supabase
        .from("applications")
        .select("status")
        .eq("user_id", user.id);

      if (applications) {
        setStats({
          totalJobs: applications.length,
          applied: applications.filter((a) => a.status === "applied").length,
          pending: applications.filter((a) => a.status === "pending").length,
          needsReview: applications.filter((a) => a.status === "manual_review").length,
        });
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Jobs Tracked",
      value: stats.totalJobs,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Successfully Applied",
      value: stats.applied,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Pending Applications",
      value: stats.pending,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Needs Manual Review",
      value: stats.needsReview,
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="p-6 shadow-card hover:shadow-hover transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
            <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;