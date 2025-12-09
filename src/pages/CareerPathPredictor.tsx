import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  TrendingUp, 
  Compass, 
  DollarSign, 
  Clock, 
  Plus, 
  X,
  Loader2,
  ArrowRight,
  Zap,
  BarChart3,
  Sparkles,
  Target,
  CheckCircle2
} from "lucide-react";

interface CareerRole {
  title: string;
  years_from_now: number;
  required_skills: string[];
  description: string;
}

interface CareerPath {
  path_name: string;
  description: string;
  roles: CareerRole[];
  success_probability: "high" | "medium" | "low";
  effort_required: "high" | "medium" | "low";
}

interface IndustryInsight {
  trend: string;
  impact: "positive" | "neutral" | "negative";
  description: string;
  timeframe: string;
}

interface SalaryProgression {
  years_experience: number;
  role: string;
  min_salary: number;
  max_salary: number;
  median_salary: number;
}

interface CareerPrediction {
  predicted_paths: CareerPath[];
  industry_insights: IndustryInsight[];
  salary_progression: SalaryProgression[];
}

const CareerPathPredictor = () => {
  const [currentRole, setCurrentRole] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<CareerPrediction | null>(null);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const predictCareerPath = async () => {
    if (!currentRole.trim()) {
      toast.error("Please enter your current role");
      return;
    }

    if (skills.length === 0) {
      toast.error("Please add at least one skill");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-career", {
        body: {
          userId: user.id,
          currentRole,
          skills,
          experienceYears: parseInt(experienceYears) || 0,
        },
      });

      if (error) throw error;
      setPrediction(data);
      toast.success("Career path prediction complete!");
    } catch (error) {
      console.error("Error predicting career:", error);
      toast.error("Failed to predict career path. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case "high": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "low": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive": return "text-green-600";
      case "negative": return "text-red-600";
      default: return "text-yellow-600";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Career Path Predictor
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered predictions for your future career trajectory and growth opportunities
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Your Profile
              </CardTitle>
              <CardDescription>
                Enter your current career details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Role</label>
                <Input
                  placeholder="e.g., Frontend Developer"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Years of Experience</label>
                <Input
                  type="number"
                  placeholder="e.g., 3"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  min="0"
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
                  {skills.map((skill) => (
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
                onClick={predictCareerPath} 
                className="w-full" 
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Predict Career Path
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="lg:col-span-2 space-y-6">
            {prediction ? (
              <>
                {/* Career Paths */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      Predicted Career Paths
                    </CardTitle>
                    <CardDescription>
                      Potential trajectories based on your profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {prediction.predicted_paths.map((path, pathIndex) => (
                      <div key={pathIndex} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{path.path_name}</h4>
                            <p className="text-sm text-muted-foreground">{path.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className={getProbabilityColor(path.success_probability)}>
                              {path.success_probability} success
                            </Badge>
                            <Badge variant="outline">
                              {path.effort_required} effort
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Role Timeline */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                          {path.roles.map((role, roleIndex) => (
                            <div key={roleIndex} className="flex items-center">
                              <div className="min-w-[180px] p-3 rounded-lg bg-muted/50 border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {role.years_from_now === 0 ? "Now" : `+${role.years_from_now} years`}
                                  </span>
                                </div>
                                <p className="font-medium text-sm">{role.title}</p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {role.description}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {role.required_skills.slice(0, 2).map((skill, sIndex) => (
                                    <Badge key={sIndex} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {role.required_skills.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{role.required_skills.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {roleIndex < path.roles.length - 1 && (
                                <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Industry Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Industry Insights
                    </CardTitle>
                    <CardDescription>
                      Market trends affecting your career
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {prediction.industry_insights.map((insight, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium">{insight.trend}</h4>
                            <Badge variant="outline" className={getImpactColor(insight.impact)}>
                              {insight.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {insight.description}
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {insight.timeframe}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Salary Progression */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Salary Progression
                    </CardTitle>
                    <CardDescription>
                      Expected compensation at each career stage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {prediction.salary_progression.map((salary, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{salary.role}</p>
                              <p className="text-sm text-muted-foreground">
                                {salary.years_experience} years experience
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                {formatSalary(salary.median_salary)}
                              </p>
                              <p className="text-xs text-muted-foreground">median</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                                style={{ 
                                  width: `${((salary.median_salary - salary.min_salary) / (salary.max_salary - salary.min_salary)) * 100}%`,
                                  marginLeft: `${((salary.min_salary) / salary.max_salary) * 20}%`
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>{formatSalary(salary.min_salary)}</span>
                            <span>{formatSalary(salary.max_salary)}</span>
                          </div>
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
                    <Compass className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Prediction Yet</h3>
                    <p className="text-sm">
                      Enter your current role and skills, then click "Predict Career Path" 
                      to see your potential career trajectories.
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

export default CareerPathPredictor;
