import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { MessageSquarePlus, TrendingUp, ThumbsUp, BarChart3 } from "lucide-react";

const OUTCOME_COLORS: Record<string, string> = {
  passed: "hsl(142, 71%, 45%)",
  rejected: "hsl(0, 84%, 60%)",
  offer: "hsl(262, 83%, 58%)",
  ghosted: "hsl(220, 9%, 46%)",
  pending: "hsl(38, 92%, 50%)",
};

const DIFFICULTY_LABELS = ["", "Very Easy", "Easy", "Medium", "Hard", "Very Hard"];

export const InterviewFeedbackCharts = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("interview_feedback" as any)
        .select("*")
        .eq("user_id", user.id);

      setFeedback((data as any[]) || []);
      setLoading(false);
    };
    fetchFeedback();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">Loading feedback analytics...</div>
      </Card>
    );
  }

  if (feedback.length === 0) {
    return (
      <Card className="p-6 text-center">
        <MessageSquarePlus className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No interview feedback yet. Add feedback after your interviews to see analytics here.</p>
      </Card>
    );
  }

  // Outcome distribution
  const outcomeCounts: Record<string, number> = {};
  feedback.forEach((f) => {
    const o = f.outcome || "pending";
    outcomeCounts[o] = (outcomeCounts[o] || 0) + 1;
  });
  const outcomeData = Object.entries(outcomeCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: OUTCOME_COLORS[name] || "hsl(var(--muted))",
  }));

  // Difficulty distribution
  const difficultyCounts = [0, 0, 0, 0, 0];
  feedback.forEach((f) => {
    if (f.difficulty_rating >= 1 && f.difficulty_rating <= 5) {
      difficultyCounts[f.difficulty_rating - 1]++;
    }
  });
  const difficultyData = difficultyCounts.map((count, i) => ({
    name: DIFFICULTY_LABELS[i + 1],
    count,
  }));

  // Recommendation rate
  const recommendCount = feedback.filter((f) => f.would_recommend).length;
  const recommendRate = Math.round((recommendCount / feedback.length) * 100);

  // Average ratings
  const avgOverall = (feedback.reduce((s, f) => s + f.overall_rating, 0) / feedback.length).toFixed(1);
  const avgDifficulty = (feedback.reduce((s, f) => s + f.difficulty_rating, 0) / feedback.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{feedback.length}</p>
          <p className="text-xs text-muted-foreground">Total Feedback</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{avgOverall}/5</p>
          <p className="text-xs text-muted-foreground">Avg Experience</p>
        </Card>
        <Card className="p-4 text-center">
          <MessageSquarePlus className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{avgDifficulty}/5</p>
          <p className="text-xs text-muted-foreground">Avg Difficulty</p>
        </Card>
        <Card className="p-4 text-center">
          <ThumbsUp className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{recommendRate}%</p>
          <p className="text-xs text-muted-foreground">Would Recommend</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Outcome Distribution Pie */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 text-sm">Interview Outcomes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {outcomeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Difficulty Distribution Bar */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 text-sm">Difficulty Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={difficultyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};
