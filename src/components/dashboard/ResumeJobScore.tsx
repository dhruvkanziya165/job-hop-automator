import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileSearch, Loader2, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";

interface Result {
  score: number; matched: string[]; missing: string[]; suggestions: string[];
  resumeName: string; requirementsFound: number;
}

export const ResumeJobScore = ({ jobId }: { jobId: string }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setResult(null); setMessage(null); }, [jobId]);

  const run = async () => {
    setLoading(true); setMessage(null);
    const { data, error } = await supabase.functions.invoke("score-resume-job", { body: { jobId } });
    setLoading(false);
    if (error) { setMessage("Couldn't score your resume right now. Please try again."); return; }
    if (data?.error) { setMessage(data.message ?? data.error); return; }
    setResult(data);
  };

  const tone = !result ? "" : result.score >= 70 ? "text-primary" : result.score >= 45 ? "text-accent-foreground" : "text-destructive";

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold flex items-center gap-2"><FileSearch className="h-5 w-5 text-primary" />Resume match for this job</h3>
        <Button size="sm" variant={result ? "outline" : "default"} onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {result ? "Re-check" : "Score my resume"}
        </Button>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground">
          {message} {message.includes("Profile") && <Link to="/profile" className="text-primary underline">Go to Profile</Link>}
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className={`text-4xl font-bold ${tone}`}>{result.score}</span>
            <div className="flex-1 space-y-1">
              <Progress value={result.score} />
              <p className="text-xs text-muted-foreground">
                {result.resumeName} · {result.requirementsFound} skills found in the job post
              </p>
            </div>
          </div>
          {result.matched.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" />You have</p>
              <div className="flex flex-wrap gap-1.5">{result.matched.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
            </div>
          )}
          {result.missing.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1"><XCircle className="h-4 w-4 text-destructive" />Missing from your resume</p>
              <div className="flex flex-wrap gap-1.5">{result.missing.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
            </div>
          )}
          {result.suggestions.length > 0 && (
            <ul className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-sm flex gap-2"><Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
