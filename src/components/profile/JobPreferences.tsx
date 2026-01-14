import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Target,
  MapPin,
  DollarSign,
  Ban,
  Briefcase,
  X,
  Plus,
} from "lucide-react";

interface UserPreferences {
  id: string;
  target_roles: string[];
  locations: string[];
  salary_min: number | null;
  salary_max: number | null;
  exclude_companies: string[];
  job_type: string | null;
  is_active: boolean | null;
  daily_apply_cap: number | null;
}

interface JobPreferencesProps {
  userId: string;
}

const POPULAR_ROLES = [
  "Software Engineer",
  "Product Manager",
  "Data Scientist",
  "UX Designer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Analyst",
  "Project Manager",
  "Marketing Manager",
  "Sales Representative",
  "Business Analyst",
  "HR Manager",
  "Financial Analyst",
];

const POPULAR_LOCATIONS = [
  "Bangalore",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Remote",
  "Hybrid",
];

const JobPreferences = ({ userId }: JobPreferencesProps) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [excludeCompanies, setExcludeCompanies] = useState<string[]>([]);
  const [jobType, setJobType] = useState<string>("both");
  const [isActive, setIsActive] = useState(true);
  const [dailyApplyCap, setDailyApplyCap] = useState<string>("5");

  // Input state for adding new items
  const [newRole, setNewRole] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newExcludeCompany, setNewExcludeCompany] = useState("");

  const fetchPreferences = async () => {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      toast.error("Failed to load preferences");
      setLoading(false);
      return;
    }

    if (data) {
      setPreferences(data);
      setTargetRoles(data.target_roles || []);
      setLocations(data.locations || []);
      setSalaryMin(data.salary_min?.toString() || "");
      setSalaryMax(data.salary_max?.toString() || "");
      setExcludeCompanies(data.exclude_companies || []);
      setJobType(data.job_type || "both");
      setIsActive(data.is_active ?? true);
      setDailyApplyCap(data.daily_apply_cap?.toString() || "5");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchPreferences();
    }
  }, [userId]);

  const handleSavePreferences = async () => {
    setSaving(true);

    const preferencesData = {
      user_id: userId,
      target_roles: targetRoles,
      locations: locations,
      salary_min: salaryMin ? parseInt(salaryMin) : null,
      salary_max: salaryMax ? parseInt(salaryMax) : null,
      exclude_companies: excludeCompanies,
      job_type: jobType,
      is_active: isActive,
      daily_apply_cap: dailyApplyCap ? parseInt(dailyApplyCap) : 5,
    };

    try {
      if (preferences) {
        // Update existing preferences
        const { error } = await supabase
          .from("user_preferences")
          .update(preferencesData)
          .eq("id", preferences.id);

        if (error) throw error;
      } else {
        // Create new preferences
        const { error } = await supabase
          .from("user_preferences")
          .insert(preferencesData);

        if (error) throw error;
      }

      toast.success("Preferences saved successfully");
      fetchPreferences();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const addItem = (
    value: string,
    list: string[],
    setList: (items: string[]) => void,
    setValue: (val: string) => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setValue("");
    }
  };

  const removeItem = (item: string, list: string[], setList: (items: string[]) => void) => {
    setList(list.filter((i) => i !== item));
  };

  const addFromSuggestion = (
    item: string,
    list: string[],
    setList: (items: string[]) => void
  ) => {
    if (!list.includes(item)) {
      setList([...list, item]);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Job Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Set your preferences for better job matching
          </p>
        </div>
        <Button onClick={handleSavePreferences} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Preferences
        </Button>
      </div>

      <div className="space-y-6">
        {/* Target Roles */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Target Roles
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a target role..."
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem(newRole, targetRoles, setTargetRoles, setNewRole);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addItem(newRole, targetRoles, setTargetRoles, setNewRole)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {targetRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {targetRoles.map((role) => (
                <Badge key={role} variant="secondary" className="gap-1 pr-1">
                  {role}
                  <button
                    onClick={() => removeItem(role, targetRoles, setTargetRoles)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {POPULAR_ROLES.filter((r) => !targetRoles.includes(r))
              .slice(0, 5)
              .map((role) => (
                <button
                  key={role}
                  onClick={() => addFromSuggestion(role, targetRoles, setTargetRoles)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  + {role}
                </button>
              ))}
          </div>
        </div>

        {/* Preferred Locations */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Preferred Locations
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a location..."
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem(newLocation, locations, setLocations, setNewLocation);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addItem(newLocation, locations, setLocations, setNewLocation)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {locations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {locations.map((location) => (
                <Badge key={location} variant="secondary" className="gap-1 pr-1">
                  {location}
                  <button
                    onClick={() => removeItem(location, locations, setLocations)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {POPULAR_LOCATIONS.filter((l) => !locations.includes(l))
              .slice(0, 5)
              .map((location) => (
                <button
                  key={location}
                  onClick={() => addFromSuggestion(location, locations, setLocations)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  + {location}
                </button>
              ))}
          </div>
        </div>

        {/* Salary Expectations */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Salary Expectations (LPA)
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Minimum</Label>
              <Input
                type="number"
                placeholder="e.g., 500000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Maximum</Label>
              <Input
                type="number"
                placeholder="e.g., 1500000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Job Type */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Job Type Preference
          </Label>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger>
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both (Full-time & Internships)</SelectItem>
              <SelectItem value="job">Full-time Jobs Only</SelectItem>
              <SelectItem value="internship">Internships Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Excluded Companies */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive" />
            Excluded Companies
          </Label>
          <p className="text-xs text-muted-foreground">
            Companies you don't want to apply to
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Add a company to exclude..."
              value={newExcludeCompany}
              onChange={(e) => setNewExcludeCompany(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem(
                    newExcludeCompany,
                    excludeCompanies,
                    setExcludeCompanies,
                    setNewExcludeCompany
                  );
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                addItem(
                  newExcludeCompany,
                  excludeCompanies,
                  setExcludeCompanies,
                  setNewExcludeCompany
                )
              }
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {excludeCompanies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {excludeCompanies.map((company) => (
                <Badge key={company} variant="destructive" className="gap-1 pr-1">
                  {company}
                  <button
                    onClick={() => removeItem(company, excludeCompanies, setExcludeCompanies)}
                    className="ml-1 hover:text-white/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Automation Settings */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="font-medium">Automation Settings</h4>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label>Enable Job Matching</Label>
              <p className="text-xs text-muted-foreground">
                Get job recommendations based on your preferences
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label>Daily Application Limit</Label>
            <Select value={dailyApplyCap} onValueChange={setDailyApplyCap}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per day</SelectItem>
                <SelectItem value="10">10 per day</SelectItem>
                <SelectItem value="15">15 per day</SelectItem>
                <SelectItem value="20">20 per day</SelectItem>
                <SelectItem value="25">25 per day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default JobPreferences;