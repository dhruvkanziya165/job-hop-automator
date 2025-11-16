import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ResponseTimeChartProps {
  applications: any[];
}

const ResponseTimeChart = ({ applications }: ResponseTimeChartProps) => {
  const responseData = applications
    .filter((app) => app.applied_at && app.updated_at && app.status !== "pending")
    .map((app) => {
      const applied = new Date(app.applied_at).getTime();
      const updated = new Date(app.updated_at).getTime();
      const days = Math.round((updated - applied) / (1000 * 60 * 60 * 24));
      return {
        company: app.job_postings?.company || "Unknown",
        days: days > 0 ? days : 0,
        status: app.status,
      };
    })
    .sort((a, b) => b.days - a.days)
    .slice(0, 10);

  if (responseData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No response time data available yet. Keep applying and updating your application statuses!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Response Times by Company</h3>
        <p className="text-sm text-muted-foreground">
          Days between application and status update (top 10)
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={responseData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="company"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            label={{ value: "Days", angle: -90, position: "insideLeft" }}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Bar dataKey="days" fill="hsl(var(--chart-2))" name="Response Time (Days)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ResponseTimeChart;
