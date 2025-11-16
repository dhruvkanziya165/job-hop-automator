import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ApplicationSuccessChartProps {
  applications: any[];
}

const ApplicationSuccessChart = ({ applications }: ApplicationSuccessChartProps) => {
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  const COLORS = {
    Pending: "hsl(var(--chart-1))",
    Applied: "hsl(var(--chart-2))",
    Interviewing: "hsl(var(--chart-3))",
    Accepted: "hsl(var(--chart-4))",
    Rejected: "hsl(var(--chart-5))",
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No application data available yet. Start applying to jobs to see your success rate!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Application Status Distribution</h3>
        <p className="text-sm text-muted-foreground">
          Breakdown of your applications by current status
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ApplicationSuccessChart;
