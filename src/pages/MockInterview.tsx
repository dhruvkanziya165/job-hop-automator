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
  companyFocus?: string;
}

const COMPANIES = [
  // FAANG / MAANG
  { id: 'google', name: 'Google', color: 'from-blue-500 to-green-500', logo: '🔍' },
  { id: 'amazon', name: 'Amazon', color: 'from-orange-500 to-yellow-500', logo: '📦' },
  { id: 'microsoft', name: 'Microsoft', color: 'from-blue-600 to-cyan-500', logo: '💻' },
  { id: 'meta', name: 'Meta', color: 'from-blue-500 to-purple-500', logo: '👥' },
  { id: 'apple', name: 'Apple', color: 'from-gray-600 to-gray-400', logo: '🍎' },
  { id: 'netflix', name: 'Netflix', color: 'from-red-600 to-red-500', logo: '🎬' },
  // Top Tech Companies
  { id: 'stripe', name: 'Stripe', color: 'from-purple-600 to-indigo-600', logo: '💳' },
  { id: 'airbnb', name: 'Airbnb', color: 'from-rose-500 to-pink-500', logo: '🏠' },
  { id: 'uber', name: 'Uber', color: 'from-gray-900 to-gray-700', logo: '🚗' },
  { id: 'linkedin', name: 'LinkedIn', color: 'from-blue-700 to-blue-500', logo: '💼' },
  // Additional Popular Companies
  { id: 'salesforce', name: 'Salesforce', color: 'from-blue-400 to-cyan-400', logo: '☁️' },
  { id: 'adobe', name: 'Adobe', color: 'from-red-500 to-orange-500', logo: '🎨' },
  { id: 'twitter', name: 'X (Twitter)', color: 'from-gray-900 to-gray-600', logo: '𝕏' },
  { id: 'spotify', name: 'Spotify', color: 'from-green-500 to-green-400', logo: '🎵' },
  { id: 'shopify', name: 'Shopify', color: 'from-green-600 to-lime-500', logo: '🛒' },
  { id: 'nvidia', name: 'NVIDIA', color: 'from-green-600 to-green-500', logo: '🎮' },
  // Indian Tech Giants
  { id: 'tcs', name: 'TCS', color: 'from-blue-800 to-blue-600', logo: '🏢' },
  { id: 'infosys', name: 'Infosys', color: 'from-blue-600 to-indigo-500', logo: '🏛️' },
  { id: 'wipro', name: 'Wipro', color: 'from-purple-700 to-purple-500', logo: '🌐' },
  { id: 'flipkart', name: 'Flipkart', color: 'from-yellow-500 to-blue-500', logo: '🛍️' },
  { id: 'paytm', name: 'Paytm', color: 'from-blue-500 to-cyan-400', logo: '💰' },
  { id: 'zomato', name: 'Zomato', color: 'from-red-500 to-red-400', logo: '🍽️' },
  { id: 'swiggy', name: 'Swiggy', color: 'from-orange-500 to-orange-400', logo: '🍔' },
  { id: 'razorpay', name: 'Razorpay', color: 'from-blue-600 to-blue-400', logo: '💳' },
];

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
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
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
        body: { action: 'generate_questions', role, questionType, company: selectedCompany }
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
    setSelectedCompany(null);
  };

  const getSelectedCompanyInfo = () => {
    return COMPANIES.find(c => c.id === selectedCompany);
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
          <div className="space-y-6">
            {/* Company Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Select Target Company (Optional)
                </CardTitle>
                <CardDescription>
                  Choose a specific company to get tailored questions matching their interview style and culture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {COMPANIES.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setSelectedCompany(selectedCompany === company.id ? null : company.id)}
                      className={`relative p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        selectedCompany === company.id
                          ? 'border-primary bg-primary/10 shadow-lg'
                          : 'border-border hover:border-primary/50 bg-card'
                      }`}
                    >
                      <div className="text-center space-y-2">
                        <span className="text-3xl">{company.logo}</span>
                        <p className="font-medium text-sm">{company.name}</p>
                      </div>
                      {selectedCompany === company.id && (
                        <div className="absolute -top-2 -right-2">
                          <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedCompany && (
                  <div className="mt-4 p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>
                        Questions will be tailored to <strong>{getSelectedCompanyInfo()?.name}</strong>'s interview style, culture, and values
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Setup */}
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Start Practice Session
                </CardTitle>
                <CardDescription>
                  {selectedCompany 
                    ? `Practice with ${getSelectedCompanyInfo()?.name}-style interview questions`
                    : 'Enter your target role and question type to generate personalized interview questions'
                  }
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
                      Generating {selectedCompany ? `${getSelectedCompanyInfo()?.name} ` : ''}Questions...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start {selectedCompany ? `${getSelectedCompanyInfo()?.name} ` : ''}Interview
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
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
              {selectedCompany && (
                <div className={`p-4 rounded-lg bg-gradient-to-r ${getSelectedCompanyInfo()?.color} text-white flex items-center gap-3`}>
                  <span className="text-2xl">{getSelectedCompanyInfo()?.logo}</span>
                  <div>
                    <p className="font-semibold">{getSelectedCompanyInfo()?.name} Interview Prep</p>
                    <p className="text-sm opacity-90">Questions tailored to {getSelectedCompanyInfo()?.name}'s culture and values</p>
                  </div>
                </div>
              )}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{questions[currentIndex]?.type}</Badge>
                      <Badge className={getDifficultyColor(questions[currentIndex]?.difficulty)}>
                        {questions[currentIndex]?.difficulty}
                      </Badge>
                      {questions[currentIndex]?.companyFocus && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {questions[currentIndex]?.companyFocus}
                        </Badge>
                      )}
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
