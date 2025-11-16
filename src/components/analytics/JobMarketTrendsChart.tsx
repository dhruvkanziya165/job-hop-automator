import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface JobMarketTrendsChartProps {
  jobPostings: any[];
}

const JobMarketTrendsChart = ({ jobPostings }: JobMarketTrendsChartProps) => {
  // Group jobs by date and platform
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 29 - i));
    return format(date, "MMM dd");
  });

  const platforms = ["LinkedIn", "Internshala", "RemoteOK", "Wellfound"];
  
  const trendData = last30Days.map((dateStr, index) => {
    const date = startOfDay(subDays(new Date(), 29 - index));
    const nextDay = startOfDay(subDays(new Date(), 28 - index));
    
    const dataPoint: any = { date: dateStr };
    
    platforms.forEach((platform) => {
      const count = jobPostings.filter((job) => {
        const jobDate = new Date(job.fetched_at);
        return (
          job.source === platform &&
          jobDate >= date &&
          jobDate < nextDay
        );
      }).length;
      
      dataPoint[platform] = count;
    });
    
    return dataPoint;
  });

  if (jobPostings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No job market data available yet. Start scraping jobs to see trends!
      </div>
    );
  }

  const colors = {
    LinkedIn: "hsl(var(--chart-1))",
    Internshala: "hsl(var(--chart-2))",
    RemoteOK: "hsl(var(--chart-3))",
    Wellfound: "hsl(var(--chart-4))",
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Job Market Trends by Platform</h3>
        <p className="text-sm text-muted-foreground">
          New jobs scraped per day over the last 30 days
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: "Jobs Scraped", angle: -90, position: "insideLeft" }}
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
          {platforms.map((platform) => (
            <Line
              key={platform}
              type="monotone"
              dataKey={platform}
              stroke={colors[platform as keyof typeof colors]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default JobMarketTrendsChart;
