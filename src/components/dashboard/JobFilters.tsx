import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { MapPin, Briefcase, X, DollarSign, Tags } from "lucide-react";
import { useState } from "react";

interface JobFiltersProps {
  onFilterChange: (filters: { location?: string; jobType?: string; salaryMin?: number; salaryMax?: number; keywords?: string[] }) => void;
  currentFilters: { location?: string; jobType?: string; salaryMin?: number; salaryMax?: number; keywords?: string[] };
}

const JobFilters = ({ onFilterChange, currentFilters }: JobFiltersProps) => {
  const [locationInput, setLocationInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const handleLocationAdd = () => {
    if (locationInput.trim()) {
      onFilterChange({ ...currentFilters, location: locationInput.trim() });
      setLocationInput("");
    }
  };

  const handleJobTypeChange = (type: string) => {
    onFilterChange({ ...currentFilters, jobType: type });
  };

  const clearLocation = () => {
    onFilterChange({ ...currentFilters, location: undefined });
  };

  const handleSalaryChange = (values: number[]) => {
    onFilterChange({ 
      ...currentFilters, 
      salaryMin: values[0] * 100, // Convert LPA to thousands (1 LPA = 100k)
      salaryMax: values[1] * 100 
    });
  };

  const clearSalaryFilter = () => {
    onFilterChange({ 
      ...currentFilters, 
      salaryMin: undefined, 
      salaryMax: undefined 
    });
  };

  const handleKeywordAdd = () => {
    if (keywordInput.trim()) {
      const currentKeywords = currentFilters.keywords || [];
      const newKeyword = keywordInput.trim().toLowerCase();
      if (!currentKeywords.includes(newKeyword)) {
        onFilterChange({ ...currentFilters, keywords: [...currentKeywords, newKeyword] });
      }
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    const updatedKeywords = (currentFilters.keywords || []).filter(k => k !== keyword);
    onFilterChange({ ...currentFilters, keywords: updatedKeywords.length > 0 ? updatedKeywords : undefined });
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <h3 className="font-semibold flex items-center gap-2">
        <Briefcase className="h-4 w-4" />
        Filter Jobs
      </h3>

      {/* Job Type Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Job Type</label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={currentFilters.jobType === "both" || !currentFilters.jobType ? "default" : "outline"}
            onClick={() => handleJobTypeChange("both")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={currentFilters.jobType === "internship" ? "default" : "outline"}
            onClick={() => handleJobTypeChange("internship")}
          >
            Internships
          </Button>
          <Button
            size="sm"
            variant={currentFilters.jobType === "job" ? "default" : "outline"}
            onClick={() => handleJobTypeChange("job")}
          >
            Jobs
          </Button>
        </div>
      </div>

      {/* Location Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter city or country"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLocationAdd()}
          />
          <Button size="sm" onClick={handleLocationAdd}>
            Add
          </Button>
        </div>
        {currentFilters.location && (
          <div className="mt-2">
            <Badge variant="secondary" className="gap-1">
              {currentFilters.location}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={clearLocation}
              />
            </Badge>
          </div>
        )}
      </div>

      {/* Skills/Keywords Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <Tags className="h-4 w-4" />
          Skills & Keywords
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., React, Python, AWS"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleKeywordAdd()}
          />
          <Button size="sm" onClick={handleKeywordAdd}>
            Add
          </Button>
        </div>
        {currentFilters.keywords && currentFilters.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {currentFilters.keywords.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="gap-1">
                {keyword}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeKeyword(keyword)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Salary Range Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Salary Range (₹ LPA)
        </label>
        <div className="space-y-3">
          <Slider
            min={0}
            max={50}
            step={1}
            value={[
              (currentFilters.salaryMin || 0) / 100, // Convert to LPA
              (currentFilters.salaryMax || 5000) / 100
            ]}
            onValueChange={handleSalaryChange}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>₹{((currentFilters.salaryMin || 0) / 100).toFixed(0)} LPA</span>
            <span>₹{((currentFilters.salaryMax || 5000) / 100).toFixed(0)} LPA</span>
          </div>
          {(currentFilters.salaryMin !== undefined || currentFilters.salaryMax !== undefined) && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearSalaryFilter}
              className="w-full"
            >
              Clear Salary Filter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobFilters;
