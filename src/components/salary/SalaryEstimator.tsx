import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  IndianRupee,
  Briefcase,
  MapPin,
  Sparkles
} from "lucide-react";

interface SalaryEstimate {
  estimated_min: number;
  estimated_max: number;
  estimated_median: number;
  currency: string;
  market_trend: string;
  demand_level: string;
  negotiation_tips: string[];
  key_factors: string[];
  comparable_roles: Array<{ role: string; min: number; max: number }>;
}

export const SalaryEstimator = () => {
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<SalaryEstimate | null>(null);

  const handleEstimate = async () => {
    if (!role || !experience || !location) {
      toast.error("Please fill in role, experience, and location");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("estimate-salary", {
        body: {
          role,
          experienceYears: parseInt(experience),
          location,
          skills: skills.split(",").map(s => s.trim()).filter(Boolean),
          userId: user?.id,
        },
      });

      if (error) throw error;
      
      if (data.success) {
        setEstimate(data.data);
        toast.success("Salary estimate generated!");
      } else {
        throw new Error(data.error || "Failed to generate estimate");
      }
    } catch (error) {
      console.error("Error estimating salary:", error);
      toast.error(error instanceof Error ? error.message : "Failed to estimate salary");
    } finally {
      setIsLoading(false);
    }
  };

  const formatSalary = (amount: number | undefined | null, currency: string) => {
    if (amount == null) return "N/A";
    if (currency === "INR") {
      if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(1)} LPA`;
      }
      return `₹${amount.toLocaleString()}`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "rising":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Salary Estimator
          </CardTitle>
          <CardDescription>
            Get accurate salary estimates based on role, experience, and location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Job Role
            </Label>
            <Input
              id="role"
              placeholder="e.g., Software Engineer, Data Analyst"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Years of Experience</Label>
            <Input
              id="experience"
              type="number"
              placeholder="e.g., 3"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g., Bangalore, India or San Francisco, USA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Key Skills (comma-separated)</Label>
            <Input
              id="skills"
              placeholder="e.g., React, Node.js, AWS"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleEstimate} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Market Data...
              </>
            ) : (
              <>
                <IndianRupee className="mr-2 h-4 w-4" />
                Get Salary Estimate
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {estimate && (
        <div className="space-y-4">
          {/* Main Estimate Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Estimated Salary Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-primary">
                  {formatSalary(estimate.estimated_min, estimate.currency)}
                </span>
                <span className="text-muted-foreground">to</span>
                <span className="text-3xl font-bold text-primary">
                  {formatSalary(estimate.estimated_max, estimate.currency)}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className="gap-1">
                  {getTrendIcon(estimate.market_trend)}
                  Market {estimate.market_trend}
                </Badge>
                <Badge variant={estimate.demand_level === "high" ? "default" : "secondary"}>
                  {estimate.demand_level} demand
                </Badge>
                <Badge variant="outline">
                  Median: {formatSalary(estimate.estimated_median, estimate.currency)}
                </Badge>
              </div>

              {/* Key Factors */}
              {estimate.key_factors && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Key Factors:</p>
                  <div className="flex flex-wrap gap-1">
                    {estimate.key_factors.map((factor, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparable Roles */}
          {estimate.comparable_roles && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Similar Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {estimate.comparable_roles.map((comp, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                      <span className="font-medium">{comp.role}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatSalary(comp.min, estimate.currency)} - {formatSalary(comp.max, estimate.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Negotiation Tips */}
          {estimate.negotiation_tips && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Negotiation Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {estimate.negotiation_tips.map((tip, idx) => (
                    <li key={idx} className="flex gap-2 text-sm">
                      <span className="text-primary font-bold">{idx + 1}.</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
