import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import ApplicationTracker from "./pages/ApplicationTracker";
import ApplicationStats from "./pages/ApplicationStats";
import SalaryInsights from "./pages/SalaryInsights";
import ResumeOptimizer from "./pages/ResumeOptimizer";
import NetworkingAssistant from "./pages/NetworkingAssistant";
import SkillGapAnalysis from "./pages/SkillGapAnalysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/applications" element={<ApplicationTracker />} />
          <Route path="/stats" element={<ApplicationStats />} />
          <Route path="/salary" element={<SalaryInsights />} />
          <Route path="/resume" element={<ResumeOptimizer />} />
          <Route path="/networking" element={<NetworkingAssistant />} />
          <Route path="/skills" element={<SkillGapAnalysis />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
