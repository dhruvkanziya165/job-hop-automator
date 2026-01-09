import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Mic, 
  Play, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Sparkles,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Loader2
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface Question {
  id: number;
  question: string;
  type: string;
  difficulty: string;
  tips: string;
}

interface Feedback {
  score: number;
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
  overallFeedback: string;
}

const MockInterview = () => {
  const [role, setRole] = useState("");
  const [questionType, setQuestionType] = useState("behavioral");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [scores, setScores] = useState<number[]>([]);

  const generateQuestions = async () => {
    if (!role.trim()) {
      toast.error("Please enter a job role");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('mock-interview', {
        body: { action: 'generate_questions', role, questionType }
      });

      if (error) throw error;
      
      setQuestions(data.result);
      setSessionStarted(true);
      setCurrentIndex(0);
      setCompletedQuestions([]);
      setScores([]);
      setFeedback(null);
      setAnswer("");
      toast.success("Interview questions generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!answer.trim()) {
      toast.error("Please provide an answer");
      return;
    }

    setIsEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke('mock-interview', {
        body: { 
          action: 'evaluate_answer', 
          question: questions[currentIndex].question,
          answer 
        }
      });

      if (error) throw error;
      
      setFeedback(data.result);
      setScores([...scores, data.result.score]);
      if (!completedQuestions.includes(currentIndex)) {
        setCompletedQuestions([...completedQuestions, currentIndex]);
      }
      toast.success("Answer evaluated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to evaluate answer");
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswer("");
      setFeedback(null);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setAnswer("");
      setFeedback(null);
    }
  };

  const restartSession = () => {
    setSessionStarted(false);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswer("");
    setFeedback(null);
    setCompletedQuestions([]);
    setScores([]);
  };

  const averageScore = scores.length > 0 
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) 
    : 0;

  const progressPercent = questions.length > 0 
    ? (completedQuestions.length / questions.length) * 100 
    : 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'hard': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mock Interview Practice</h1>
          <p className="text-muted-foreground">Practice with AI-powered interview questions and get instant feedback</p>
        </div>

        {!sessionStarted ? (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                Start Practice Session
              </CardTitle>
              <CardDescription>
                Enter your target role and question type to generate personalized interview questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Role</label>
                <Input
                  placeholder="e.g., Software Engineer, Product Manager, Data Scientist"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Question Type</label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="situational">Situational</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={generateQuestions} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Interview
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Progress sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Session Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span>{completedQuestions.length}/{questions.length}</span>
                  </div>
                  <Progress value={progressPercent} />
                </div>
                
                {scores.length > 0 && (
                  <div className="p-4 rounded-lg bg-primary/10 text-center">
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-3xl font-bold text-primary">{averageScore}/10</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Questions</p>
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(i);
                        setAnswer("");
                        setFeedback(null);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                        i === currentIndex 
                          ? 'bg-primary text-primary-foreground' 
                          : completedQuestions.includes(i)
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {completedQuestions.includes(i) && <CheckCircle2 className="h-4 w-4" />}
                        <span>Question {i + 1}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <Button variant="outline" onClick={restartSession} className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  New Session
                </Button>
              </CardContent>
            </Card>

            {/* Main interview area */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{questions[currentIndex]?.type}</Badge>
                      <Badge className={getDifficultyColor(questions[currentIndex]?.difficulty)}>
                        {questions[currentIndex]?.difficulty}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                  </div>
                  <CardTitle className="text-xl mt-2">
                    {questions[currentIndex]?.question}
                  </CardTitle>
                  {questions[currentIndex]?.tips && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted mt-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{questions[currentIndex]?.tips}</p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Answer</label>
                    <Textarea
                      placeholder="Type your answer here... Be specific and use examples from your experience."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={prevQuestion}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={evaluateAnswer}
                      disabled={isEvaluating || !answer.trim()}
                      className="flex-1"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Get AI Feedback
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={nextQuestion}
                      disabled={currentIndex === questions.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback section */}
              {feedback && (
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        AI Feedback
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Score:</span>
                        <Badge className={`text-lg px-3 py-1 ${
                          feedback.score >= 8 ? 'bg-green-500' :
                          feedback.score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {feedback.score}/10
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{feedback.overallFeedback}</p>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">Strengths</span>
                        </div>
                        <ul className="space-y-1">
                          {feedback.strengths.map((s, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-orange-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Areas to Improve</span>
                        </div>
                        <ul className="space-y-1">
                          {feedback.improvements.map((s, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted space-y-2">
                      <p className="text-sm font-medium">Sample Strong Answer</p>
                      <p className="text-sm text-muted-foreground">{feedback.sampleAnswer}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MockInterview;
