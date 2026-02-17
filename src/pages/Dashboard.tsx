import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardStats from "@/components/dashboard/DashboardStats";
import JobListings from "@/components/dashboard/JobListings";
import OnboardingFlow from "@/components/dashboard/OnboardingFlow";
import { AutomationControls } from "@/components/dashboard/AutomationControls";
import { ProfileCompletionReminder } from "@/components/dashboard/ProfileCompletionReminder";
import { UpcomingInterviews } from "@/components/dashboard/UpcomingInterviews";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user has completed onboarding
      setTimeout(async () => {
        const { data: preferences } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!preferences) {
          setShowOnboarding(true);
        }
        setLoading(false);
      }, 0);
    };

    initAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <DashboardLayout automationContent={<AutomationControls />}>
      <div className="space-y-6">
        {/* Profile Completion Reminder */}
        {user && <ProfileCompletionReminder userId={user.id} />}
        
        <DashboardStats />
        <UpcomingInterviews />
        <JobListings />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;