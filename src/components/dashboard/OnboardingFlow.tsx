import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Briefcase, Target, CheckCircle } from "lucide-react";
import { z } from "zod";

interface OnboardingFlowProps {
  onComplete: () => void;
}

// Validation schemas
const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  phone: z.string().trim().regex(/^(\+?[1-9]\d{0,14})?$/, "Invalid phone number format").optional().or(z.literal("")),
  linkedinUrl: z.string().trim().url("Invalid URL format").optional().or(z.literal("")),
  portfolioUrl: z.string().trim().url("Invalid URL format").optional().or(z.literal("")),
});

const preferencesSchema = z.object({
  targetRoles: z.string().trim().min(1, "At least one target role is required").max(500, "Target roles must be less than 500 characters"),
  locations: z.string().trim().min(1, "At least one location is required").max(500, "Locations must be less than 500 characters"),
  salaryMin: z.string().trim().regex(/^\d*$/, "Salary must be a valid number").refine((val) => !val || (parseInt(val) >= 0 && parseInt(val) <= 10000000), "Salary must be between 0 and 10,000,000"),
  keywords: z.string().trim().max(1000, "Keywords must be less than 1000 characters").optional().or(z.literal("")),
  excludeCompanies: z.string().trim().max(1000, "Excluded companies must be less than 1000 characters").optional().or(z.literal("")),
});

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    linkedinUrl: "",
    portfolioUrl: "",
  });
  const [preferences, setPreferences] = useState({
    targetRoles: "",
    locations: "",
    salaryMin: "",
    keywords: "",
    excludeCompanies: "",
    jobType: "both",
  });

  const handleProfileSubmit = async () => {
    // Validate profile data
    try {
      profileSchema.parse(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.fullName,
        phone: profile.phone || null,
        linkedin_url: profile.linkedinUrl || null,
        portfolio_url: profile.portfolioUrl || null,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    setStep(2);
  };

  const handlePreferencesSubmit = async () => {
    // Validate preferences data
    try {
      preferencesSchema.parse(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const salaryMinValue = preferences.salaryMin ? parseInt(preferences.salaryMin) : null;
    if (salaryMinValue !== null && (isNaN(salaryMinValue) || salaryMinValue < 0)) {
      toast.error("Invalid salary value");
      return;
    }

    const { error } = await supabase
      .from("user_preferences")
      .insert({
        user_id: user.id,
        target_roles: preferences.targetRoles.split(",").map((r) => r.trim()).filter((r) => r),
        locations: preferences.locations.split(",").map((l) => l.trim()).filter((l) => l),
        salary_min: salaryMinValue,
        job_type: preferences.jobType,
        keywords: preferences.keywords.split(",").map((k) => k.trim()).filter((k) => k),
        exclude_companies: preferences.excludeCompanies
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c),
        apply_mode: "manual",
      });

    if (error) {
      toast.error("Failed to save preferences");
      return;
    }

    toast.success("Profile setup complete!");
    onComplete();
  };

  const steps = [
    { number: 1, title: "Profile", icon: User },
    { number: 2, title: "Job Preferences", icon: Briefcase },
    { number: 3, title: "Complete", icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-hover">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome to JobAgent Pro!</h2>
          <p className="text-muted-foreground">
            Let's set up your profile to start finding perfect job matches
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    step >= s.number
                      ? "bg-gradient-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <span className={`text-sm font-medium ${step >= s.number ? "" : "text-muted-foreground"}`}>
                  {s.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${step > s.number ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                type="url"
                value={profile.linkedinUrl}
                onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio URL</Label>
              <Input
                id="portfolio"
                type="url"
                value={profile.portfolioUrl}
                onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                placeholder="https://johndoe.com"
              />
            </div>

            <Button
              className="w-full bg-gradient-primary"
              onClick={handleProfileSubmit}
              disabled={!profile.fullName}
            >
              Continue to Job Preferences
            </Button>
          </div>
        )}

        {/* Step 2: Job Preferences */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>I'm looking for</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={preferences.jobType === "internship" ? "default" : "outline"}
                  onClick={() => setPreferences({ ...preferences, jobType: "internship" })}
                  className="w-full"
                >
                  Internships
                </Button>
                <Button
                  type="button"
                  variant={preferences.jobType === "job" ? "default" : "outline"}
                  onClick={() => setPreferences({ ...preferences, jobType: "job" })}
                  className="w-full"
                >
                  Jobs
                </Button>
                <Button
                  type="button"
                  variant={preferences.jobType === "both" ? "default" : "outline"}
                  onClick={() => setPreferences({ ...preferences, jobType: "both" })}
                  className="w-full"
                >
                  Both
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roles">Target Roles * (comma-separated)</Label>
              <Input
                id="roles"
                value={preferences.targetRoles}
                onChange={(e) => setPreferences({ ...preferences, targetRoles: e.target.value })}
                placeholder="Software Engineer, Backend Developer, Full Stack Developer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locations">Preferred Locations (comma-separated)</Label>
              <Input
                id="locations"
                value={preferences.locations}
                onChange={(e) => setPreferences({ ...preferences, locations: e.target.value })}
                placeholder="Remote, New York, San Francisco"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Minimum Salary (annual)</Label>
              <Input
                id="salary"
                type="number"
                value={preferences.salaryMin}
                onChange={(e) => setPreferences({ ...preferences, salaryMin: e.target.value })}
                placeholder="80000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Textarea
                id="keywords"
                value={preferences.keywords}
                onChange={(e) => setPreferences({ ...preferences, keywords: e.target.value })}
                placeholder="React, Node.js, TypeScript, AWS"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exclude">Exclude Companies (comma-separated)</Label>
              <Input
                id="exclude"
                value={preferences.excludeCompanies}
                onChange={(e) =>
                  setPreferences({ ...preferences, excludeCompanies: e.target.value })
                }
                placeholder="Company A, Company B"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1 bg-gradient-primary"
                onClick={handlePreferencesSubmit}
                disabled={!preferences.targetRoles}
              >
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OnboardingFlow;