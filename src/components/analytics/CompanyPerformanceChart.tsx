import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Card } from "@/components/ui/card";

interface CompanyPerformanceChartProps {
  applications: Array<{
    id: string;
    status: string;
    job_postings?: {
      company: string;
    };
  }>;
}

export const CompanyPerformanceChart = ({ applications }: CompanyPerformanceChartProps) => {
  const chartData = useMemo(() => {
    const companyStats = applications.reduce((acc, app) => {
      const company = app.job_postings?.company || "Unknown";
      if (!acc[company]) {
        acc[company] = { total: 0, interviews: 0, offers: 0 };
      }
      acc[company].total++;
      if (app.status === "interview") acc[company].interviews++;
      if (app.status === "offer") acc[company].offers++;
      return acc;
    }, {} as Record<string, { total: number; interviews: number; offers: number }>);

    return Object.entries(companyStats)
      .map(([company, stats]) => ({
        company: company.length > 15 ? company.slice(0, 15) + "..." : company,
        fullName: company,
        applications: stats.total,
        interviews: stats.interviews,
        offers: stats.offers,
        responseRate: Math.round((stats.interviews / stats.total) * 100),
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 10);
  }, [applications]);

  if (applications.length === 0) {
    return (
      <Card className="p-6 flex items-center justify-center h-[350px]">
        <p className="text-muted-foreground">No application data to display</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Top Companies by Applications</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis 
            type="category" 
            dataKey="company" 
            tick={{ fontSize: 11 }} 
            width={100}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }}
            formatter={(value, name) => [value, name]}
            labelFormatter={(label) => {
              const item = chartData.find(d => d.company === label);
              return item?.fullName || label;
            }}
          />
          <Legend />
          <Bar 
            dataKey="applications" 
            name="Applications" 
            fill="hsl(var(--primary))" 
            radius={[0, 4, 4, 0]}
          />
          <Bar 
            dataKey="interviews" 
            name="Interviews" 
            fill="hsl(142, 76%, 36%)" 
            radius={[0, 4, 4, 0]}
          />
          <Bar 
            dataKey="offers" 
            name="Offers" 
            fill="hsl(45, 93%, 47%)" 
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
