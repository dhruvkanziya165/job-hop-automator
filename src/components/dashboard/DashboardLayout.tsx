import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  LayoutDashboard, 
  Settings, 
  FileText, 
  LogOut,
  User,
  Bot,
  BarChart3,
  PieChart,
  IndianRupee
} from "lucide-react";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
  automationContent?: ReactNode;
}

const DashboardLayout = ({ children, automationContent }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  JobAgent Pro
                </h1>
                <p className="text-xs text-muted-foreground">Automated Job Applications</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
                <FileText className="h-4 w-4 mr-2" />
                Applications
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/stats")}>
                <PieChart className="h-4 w-4 mr-2" />
                Stats
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/salary")}>
                <IndianRupee className="h-4 w-4 mr-2" />
                Salary
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </nav>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="automation">
              <Bot className="mr-2 h-4 w-4" />
              Automation
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {children}
          </TabsContent>
          
          <TabsContent value="automation">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold">Job Application Automation</h2>
                <p className="text-muted-foreground mt-2">
                  Automatically scrape jobs, generate personalized emails with AI, and send applications
                </p>
              </div>
              {automationContent}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardLayout;