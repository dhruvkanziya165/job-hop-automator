import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Search, Sparkles, BarChart3 } from "lucide-react";
import ATSScorer from "@/components/resume/ATSScorer";
import KeywordOptimizer from "@/components/resume/KeywordOptimizer";
import ResumeTailor from "@/components/resume/ResumeTailor";

const ResumeOptimizer = () => {
  const [activeTab, setActiveTab] = useState("ats");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AI Resume Optimizer
          </h1>
          <p className="text-muted-foreground mt-2">
            Optimize your resume with AI-powered ATS scoring, keyword analysis, and tailored generation
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="ats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">ATS Score</span>
              <span className="sm:hidden">ATS</span>
            </TabsTrigger>
            <TabsTrigger value="keywords" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Keywords</span>
              <span className="sm:hidden">Keys</span>
            </TabsTrigger>
            <TabsTrigger value="tailor" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Tailor Resume</span>
              <span className="sm:hidden">Tailor</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ats" className="mt-6">
            <ATSScorer />
          </TabsContent>

          <TabsContent value="keywords" className="mt-6">
            <KeywordOptimizer />
          </TabsContent>

          <TabsContent value="tailor" className="mt-6">
            <ResumeTailor />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ResumeOptimizer;
