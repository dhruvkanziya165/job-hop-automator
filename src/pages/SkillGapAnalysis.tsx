import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Target, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Plus, 
  X,
  Loader2,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  AlertCircle
} from "lucide-react";

interface MissingSkill {
  skill: string;
  priority: "high" | "medium" | "low";
  description: string;
}

interface RoadmapMilestone {
  month: number;
  title: string;
  goals: string[];
  skills_to_learn: string[];
}

interface CourseRecommendation {
  name: string;
  platform: string;
  url: string;
  duration: string;
  skill_covered: string;
  price: string;
}

interface SkillAnalysis {
  missing_skills: MissingSkill[];
  learning_roadmap: RoadmapMilestone[];
  course_recommendations: CourseRecommendation[];
  estimated_time: string;
}

const SkillGapAnalysis = () => {
  const [targetRole, setTargetRole] = useState("");
  const [currentSkills, setCurrentSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SkillAnalysis | null>(null);

  const addSkill = () => {
    if (skillInput.trim() && !currentSkills.includes(skillInput.trim())) {
      setCurrentSkills([...currentSkills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setCurrentSkills(currentSkills.filter(s => s !== skill));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const analyzeSkillGap = async () => {
    if (!targetRole.trim()) {
      toast.error("Please enter a target role");
      return;
    }

    if (currentSkills.length === 0) {
      toast.error("Please add at least one current skill");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-skills", {
        body: {
          userId: user.id,
          targetRole,
          currentSkills,
        },
      });

      if (error) throw error;
      setAnalysis(data);
      toast.success("Skill gap analysis complete!");
    } catch (error) {
      console.error("Error analyzing skills:", error);
      toast.error("Failed to analyze skills. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "low": return "bg-green-500/10 text-green-600 border-green-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Skill Gap Analysis
          </h1>
          <p className="text-muted-foreground mt-2">
            Get personalized learning roadmaps and course recommendations for your target role
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Your Profile
              </CardTitle>
              <CardDescription>
                Enter your target role and current skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Role</label>
                <Input
                  placeholder="e.g., Senior Frontend Developer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Skills</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button size="icon" onClick={addSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentSkills.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="secondary"
                      className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={analyzeSkillGap} 
                className="w-full" 
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Skill Gap
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="lg:col-span-2 space-y-6">
            {analysis ? (
              <>
                {/* Estimated Time */}
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Time to Job-Ready</p>
                          <p className="text-2xl font-bold">{analysis.estimated_time}</p>
                        </div>
                      </div>
                      <TrendingUp className="h-12 w-12 text-primary/20" />
                    </div>
                  </CardContent>
                </Card>

                {/* Missing Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Skills to Develop
                    </CardTitle>
                    <CardDescription>
                      Prioritized skills you need to learn
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {analysis.missing_skills.map((skill, index) => (
                        <div 
                          key={index}
                          className="p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium">{skill.skill}</span>
                            <Badge 
                              variant="outline" 
                              className={getPriorityColor(skill.priority)}
                            >
                              {skill.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {skill.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Learning Roadmap */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      Learning Roadmap
                    </CardTitle>
                    <CardDescription>
                      Step-by-step path to your target role
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.learning_roadmap.map((milestone, index) => (
                        <div key={index} className="relative pl-6">
                          {index < analysis.learning_roadmap.length - 1 && (
                            <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-border" />
                          )}
                          <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-xs text-primary-foreground font-bold">
                              {milestone.month}
                            </span>
                          </div>
                          <div className="p-4 rounded-lg border bg-card ml-2">
                            <h4 className="font-semibold">{milestone.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Month {milestone.month}
                            </p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Goals:</p>
                                <ul className="space-y-1">
                                  {milestone.goals.map((goal, gIndex) => (
                                    <li key={gIndex} className="flex items-center gap-2 text-sm">
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      {goal}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {milestone.skills_to_learn.map((skill, sIndex) => (
                                  <Badge key={sIndex} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Course Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-purple-500" />
                      Recommended Courses
                    </CardTitle>
                    <CardDescription>
                      Curated courses to build your skills
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {analysis.course_recommendations.map((course, index) => (
                        <div 
                          key={index}
                          className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-medium line-clamp-2">{course.name}</h4>
                              <p className="text-sm text-muted-foreground">{course.platform}</p>
                            </div>
                            <Badge variant={course.price === "free" ? "default" : "secondary"}>
                              {course.price}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {course.duration}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {course.skill_covered}
                            </Badge>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={() => window.open(course.url, "_blank")}
                          >
                            <ExternalLink className="mr-2 h-3 w-3" />
                            View Course
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="lg:col-span-2">
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
                    <p className="text-sm">
                      Enter your target role and current skills, then click "Analyze Skill Gap" 
                      to get your personalized learning roadmap.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SkillGapAnalysis;
