import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Briefcase, LayoutDashboard, FileText, LogOut, User, Bot,
  BarChart3, PieChart, IndianRupee, FileCheck, Users, Target,
  Compass, Calendar, Mic, Menu, Brain
} from "lucide-react";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
  automationContent?: ReactNode;
}

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/applications", icon: FileText, label: "Applications" },
  { path: "/stats", icon: PieChart, label: "Stats" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/salary", icon: IndianRupee, label: "Salary" },
  { path: "/resume", icon: FileCheck, label: "Resume" },
  { path: "/networking", icon: Users, label: "Networking" },
  { path: "/skills", icon: Target, label: "Skills" },
  { path: "/career", icon: Compass, label: "Career" },
  { path: "/interviews", icon: Calendar, label: "Interviews" },
  { path: "/mock-interview", icon: Mic, label: "Practice" },
  { path: "/ai-chat", icon: Brain, label: "AI Chat" },
  { path: "/profile", icon: User, label: "Profile" },
];

const DashboardLayout = ({ children, automationContent }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const NavButton = ({ item, mobile = false }: { item: typeof navItems[0]; mobile?: boolean }) => {
    const isActive = location.pathname === item.path;
    return (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={`shrink-0 ${mobile ? "w-full justify-start" : ""} ${isActive ? "bg-primary/10 text-primary font-semibold" : ""}`}
        onClick={() => {
          navigate(item.path);
          if (mobile) setMobileOpen(false);
        }}
      >
        <item.icon className="h-4 w-4 mr-2" />
        {item.label}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-4">
                  <div className="flex flex-col gap-1 mt-6">
                    {navItems.map((item) => (
                      <NavButton key={item.path} item={item} mobile />
                    ))}
                    <hr className="my-3" />
                    <Button variant="outline" size="sm" onClick={handleLogout} className="justify-start">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
                  <Briefcase className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-tight">
                    JobAgent Pro
                  </h1>
                  <p className="text-[10px] text-muted-foreground leading-tight">Automated Job Applications</p>
                </div>
              </div>
            </div>

            {/* Desktop nav - horizontal scroll */}
            <div className="hidden md:block flex-1 mx-4 overflow-hidden">
              <ScrollArea className="w-full">
                <div className="flex items-center gap-1 px-1">
                  {navItems.map((item) => (
                    <NavButton key={item.path} item={item} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout} className="hidden md:flex shrink-0">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-4 py-6">
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
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Job Application Automation
                </h2>
                <p className="text-muted-foreground mt-1">
                  Scrape jobs, generate AI emails, and send applications automatically
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
