import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { format, parseISO, startOfWeek, eachWeekOfInterval, subWeeks } from "date-fns";

interface ApplicationTrendsChartProps {
  applications: Array<{
    id: string;
    status: string;
    created_at: string;
    applied_at: string | null;
  }>;
}

export const ApplicationTrendsChart = ({ applications }: ApplicationTrendsChartProps) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const startDate = subWeeks(now, 12);
    
    const weeks = eachWeekOfInterval({ start: startDate, end: now });
    
    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekApps = applications.filter(app => {
        const date = parseISO(app.created_at);
        return date >= weekStart && date < weekEnd;
      });

      const applied = weekApps.filter(a => a.status !== "pending").length;
      const interviews = weekApps.filter(a => a.status === "interview").length;
      const offers = weekApps.filter(a => a.status === "offer").length;
      
      return {
        week: format(weekStart, "MMM d"),
        total: weekApps.length,
        applied,
        interviews,
        offers,
      };
    });
  }, [applications]);

  if (applications.length === 0) {
    return (
      <Card className="p-6 flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">No application data to display</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Application Trends (Last 12 Weeks)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOffers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="total" 
            name="Total Applications"
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorTotal)" 
          />
          <Area 
            type="monotone" 
            dataKey="interviews" 
            name="Interviews"
            stroke="hsl(142, 76%, 36%)" 
            fillOpacity={1} 
            fill="url(#colorInterviews)" 
          />
          <Area 
            type="monotone" 
            dataKey="offers" 
            name="Offers"
            stroke="hsl(45, 93%, 47%)" 
            fillOpacity={1} 
            fill="url(#colorOffers)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};
