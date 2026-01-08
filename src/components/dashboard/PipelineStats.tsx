import { Card } from "@/components/ui/card";
import { 
  FileText, 
  Send, 
  Users, 
  Trophy, 
  XCircle, 
  TrendingUp,
  Calendar,
  Target
} from "lucide-react";

interface Application {
  id: string;
  status: string;
  created_at: string;
  applied_at: string | null;
  updated_at: string;
}

interface PipelineStatsProps {
  applications: Application[];
}

export const PipelineStats = ({ applications }: PipelineStatsProps) => {
  const stats = {
    pending: applications.filter(a => a.status === "pending").length,
    applied: applications.filter(a => a.status === "applied").length,
    interview: applications.filter(a => a.status === "interview").length,
    offer: applications.filter(a => a.status === "offer").length,
    rejected: applications.filter(a => a.status === "rejected").length,
    total: applications.length,
  };

  // Calculate success rate
  const successRate = stats.total > 0 
    ? Math.round(((stats.interview + stats.offer) / stats.total) * 100) 
    : 0;

  // Calculate applications this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeek = applications.filter(
    a => new Date(a.created_at) >= oneWeekAgo
  ).length;

  // Calculate response rate
  const responseRate = stats.total > 0 
    ? Math.round(((stats.total - stats.pending) / stats.total) * 100) 
    : 0;

  const statCards = [
    { 
      label: "Total Applications", 
      value: stats.total, 
      icon: FileText, 
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    { 
      label: "This Week", 
      value: thisWeek, 
      icon: Calendar, 
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10"
    },
    { 
      label: "In Interview", 
      value: stats.interview, 
      icon: Users, 
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    { 
      label: "Offers Received", 
      value: stats.offer, 
      icon: Trophy, 
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    { 
      label: "Success Rate", 
      value: `${successRate}%`, 
      icon: TrendingUp, 
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    { 
      label: "Response Rate", 
      value: `${responseRate}%`, 
      icon: Target, 
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
