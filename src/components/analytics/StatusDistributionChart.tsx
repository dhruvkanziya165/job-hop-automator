import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";

interface StatusDistributionChartProps {
  applications: Array<{
    id: string;
    status: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--muted-foreground))",
  applied: "hsl(217, 91%, 60%)",
  interview: "hsl(142, 76%, 36%)",
  offer: "hsl(45, 93%, 47%)",
  rejected: "hsl(0, 84%, 60%)",
  withdrawn: "hsl(var(--muted))",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const StatusDistributionChart = ({ applications }: StatusDistributionChartProps) => {
  const chartData = useMemo(() => {
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "hsl(var(--muted))",
    }));
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
      <h3 className="font-semibold mb-4">Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
