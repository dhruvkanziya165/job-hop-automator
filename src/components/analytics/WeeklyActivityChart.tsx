import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { format, parseISO, startOfWeek, getDay } from "date-fns";

interface WeeklyActivityChartProps {
  applications: Array<{
    id: string;
    created_at: string;
  }>;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WeeklyActivityChart = ({ applications }: WeeklyActivityChartProps) => {
  const chartData = useMemo(() => {
    const dayCounts = Array(7).fill(0);
    
    applications.forEach(app => {
      const dayOfWeek = getDay(parseISO(app.created_at));
      dayCounts[dayOfWeek]++;
    });

    return DAYS.map((day, index) => ({
      day,
      applications: dayCounts[index],
    }));
  }, [applications]);

  const maxValue = Math.max(...chartData.map(d => d.applications));

  if (applications.length === 0) {
    return (
      <Card className="p-6 flex items-center justify-center h-[250px]">
        <p className="text-muted-foreground">No application data to display</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Weekly Activity Pattern</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis 
            dataKey="day" 
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
            formatter={(value) => [value, "Applications"]}
          />
          <Bar 
            dataKey="applications" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
