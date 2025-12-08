import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Check, ArrowRight, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TailorResult {
  tailoredResume: string;
  changesExplanation: string[];
  highlightedSkills: string[];
  estimatedMatchScore: number;
}

const ResumeTailor = () => {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const tailorResume = async () => {
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
          analysisType: "tailor",
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResult(data.result);
      toast.success("Resume tailored successfully!");
    } catch (error) {
      console.error("Error tailoring resume:", error);
      toast.error("Failed to tailor resume");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (result?.tailoredResume) {
      await navigator.clipboard.writeText(result.tailoredResume);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Original Resume
            </CardTitle>
            <CardDescription>
              Paste your current resume content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your resume content here..."
              className="min-h-[300px] font-mono text-sm"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Target Job
            </CardTitle>
            <CardDescription>
              Paste the job description you want to apply for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste the job description here..."
              className="min-h-[300px] font-mono text-sm"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={tailorResume}
          disabled={loading}
          className="px-8"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Tailoring Resume...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Tailored Resume
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tailored Resume */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Tailored Resume
                  </CardTitle>
                  <CardDescription>
                    Your resume optimized for this specific job
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {result.tailoredResume}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Match Score */}
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-4xl font-bold text-primary">
                  {result.estimatedMatchScore}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Estimated Match Score
                </div>
              </div>

              {/* Highlighted Skills */}
              {result.highlightedSkills?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Emphasized Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.highlightedSkills.map((skill, i) => (
                      <Badge key={i} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Changes Explanation */}
              {result.changesExplanation?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Changes Made</h4>
                  <ul className="space-y-2">
                    {result.changesExplanation.map((change, i) => (
                      <li
                        key={i}
                        className="text-sm p-2 bg-muted rounded flex items-start gap-2"
                      >
                        <span className="text-primary font-bold">{i + 1}.</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ResumeTailor;
