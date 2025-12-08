import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
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
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Work";
    return "Poor";
  };

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
              "Analyze ATS Score"
            )}
          </Button>
        </CardContent>
      </Card>

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
                <Progress value={result.atsScore} className="mt-4" />
              </div>

              {/* Overall Feedback */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm">{result.overallFeedback}</p>
              </div>

              {/* Issues */}
              {result.issues?.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Issues Found
                  </h4>
                  <ul className="space-y-2">
                    {result.issues.map((issue, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-start gap-2 p-2 bg-yellow-500/10 rounded"
                      >
                        <span className="text-yellow-500">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formatting Tips */}
              {result.formattingTips?.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Formatting Tips
                  </h4>
                  <ul className="space-y-2">
                    {result.formattingTips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-start gap-2 p-2 bg-green-500/10 rounded"
                      >
                        <span className="text-green-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keyword Suggestions */}
              {result.keywordSuggestions?.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Keyword Suggestions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.keywordSuggestions.map((keyword, i) => (
                      <Badge key={i} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ATSScorer;
