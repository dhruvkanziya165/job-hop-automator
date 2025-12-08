import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, CheckCircle, XCircle, Lightbulb, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KeywordResult {
  matchingKeywords: string[];
  missingKeywords: string[];
  keywordDensity: number;
  suggestions: string[];
  priorityKeywords: string[];
}

const KeywordOptimizer = () => {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeywordResult | null>(null);

  const analyzeKeywords = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast.error("Please provide both resume and job description");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: {
          resumeText,
          jobDescription,
          analysisType: "keywords",
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResult(data.result);
      toast.success("Keyword analysis complete!");
    } catch (error) {
      console.error("Error analyzing keywords:", error);
      toast.error("Failed to analyze keywords");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Keyword Analysis
          </CardTitle>
          <CardDescription>
            Compare your resume keywords against the job description
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Resume</label>
            <Textarea
              placeholder="Paste your resume content here..."
              className="min-h-[150px] font-mono text-sm"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Job Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Paste the job description to match keywords..."
              className="min-h-[150px] font-mono text-sm"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <Button onClick={analyzeKeywords} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Keywords...
              </>
            ) : (
              "Analyze Keywords"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword Match Results</CardTitle>
          <CardDescription>
            See which keywords you have and which ones you're missing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Provide your resume and job description to analyze keywords</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Keyword Density Score */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Keyword Match Rate</span>
                  <span className="text-2xl font-bold text-primary">
                    {result.keywordDensity}%
                  </span>
                </div>
                <Progress value={result.keywordDensity} className="h-2" />
              </div>

              {/* Priority Keywords */}
              {result.priorityKeywords?.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Priority Keywords to Add
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.priorityKeywords.map((keyword, i) => (
                      <Badge key={i} className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Keywords */}
              {result.matchingKeywords?.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Matching Keywords ({result.matchingKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.matchingKeywords.map((keyword, i) => (
                      <Badge key={i} variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Keywords */}
              {result.missingKeywords?.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Missing Keywords ({result.missingKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((keyword, i) => (
                      <Badge key={i} variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions?.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    How to Add Missing Keywords
                  </h4>
                  <ul className="space-y-2">
                    {result.suggestions.map((suggestion, i) => (
                      <li
                        key={i}
                        className="text-sm p-3 bg-primary/5 rounded-lg border border-primary/10"
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordOptimizer;
