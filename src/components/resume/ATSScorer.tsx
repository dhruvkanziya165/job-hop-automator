import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, AlertTriangle, CheckCircle, Lightbulb, TrendingUp, TrendingDown, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ATSResult {
  atsScore: number;
  issues: string[];
  formattingTips: string[];
  keywordSuggestions: string[];
  overallFeedback: string;
}

const ATSScorer = () => {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);

  const analyzeResume = async () => {
    if (!resumeText.trim()) {
      toast.error("Please paste your resume text");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: {
          resumeText,
          jobDescription: jobDescription || null,
          analysisType: "ats",
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResult(data.result);
      toast.success("ATS analysis complete!");
    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast.error("Failed to analyze resume");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Work";
    return "Poor";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "[&>div]:bg-green-500";
    if (score >= 60) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-destructive";
  };

  // Derive strengths from formatting tips (things done right)
  const strengths = result?.formattingTips?.slice(0, 4) || [];
  // Derive weaknesses from issues
  const weaknesses = result?.issues?.slice(0, 4) || [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume Input
          </CardTitle>
          <CardDescription>
            Paste your resume text to analyze ATS compatibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Resume</label>
            <Textarea
              placeholder="Paste your resume content here..."
              className="min-h-[200px] font-mono text-sm"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Job Description (Optional)
            </label>
            <Textarea
              placeholder="Paste the target job description for more accurate analysis..."
              className="min-h-[100px] font-mono text-sm"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <Button onClick={analyzeResume} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Analyze ATS Score
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ATS Analysis Results</CardTitle>
            <CardDescription>
              See how your resume performs with Applicant Tracking Systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Paste your resume and click analyze to see results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score Display */}
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className={`text-5xl font-bold ${getScoreColor(result.atsScore)}`}>
                    {result.atsScore}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">out of 100</div>
                  <Badge
                    variant={result.atsScore >= 60 ? "default" : "destructive"}
                    className="mt-2"
                  >
                    {getScoreLabel(result.atsScore)}
                  </Badge>
                  <Progress value={result.atsScore} className={`mt-4 ${getProgressColor(result.atsScore)}`} />
                </div>

                {/* Overall Feedback */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm">{result.overallFeedback}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <>
            {/* Strengths & Weaknesses */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {strengths.map((item, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No specific strengths identified</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <TrendingDown className="h-4 w-4" />
                    Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {weaknesses.length > 0 ? (
                    <ul className="space-y-2">
                      {weaknesses.map((item, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No issues found — great job!</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Keyword Suggestions */}
            {result.keywordSuggestions?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Suggested Keywords to Add
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.keywordSuggestions.map((keyword, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        + {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Improvement Tips */}
            {result.issues?.length > 4 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Additional Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.issues.slice(4).map((issue, i) => (
                      <li key={i} className="text-xs flex items-start gap-2 p-2 bg-amber-500/5 rounded">
                        <span className="text-amber-500">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ATSScorer;
