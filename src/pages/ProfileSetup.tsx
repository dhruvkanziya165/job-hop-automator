import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Loader2, 
  User as UserIcon, 
  FileText, 
  CheckCircle, 
  ArrowLeft,
  Briefcase,
  Settings,
  Mail
} from "lucide-react";
import ProfileForm from "@/components/profile/ProfileForm";
import ResumeUpload from "@/components/profile/ResumeUpload";
import JobPreferences from "@/components/profile/JobPreferences";
import CoverLetterTemplates from "@/components/profile/CoverLetterTemplates";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
}

interface Resume {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  role_type: string | null;
  is_default: boolean | null;
  created_at: string;
}

const ProfileSetup = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverTemplateCount, setCoverTemplateCount] = useState(0);
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) setProfile(data);
  };

  const fetchResumes = async (userId: string) => {
    const { data } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (data) setResumes(data);
  };

  const fetchCoverTemplates = async (userId: string) => {
    const { count } = await supabase
      .from("cover_templates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    setCoverTemplateCount(count || 0);
  };

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

      // Fetch profile and resumes
      setTimeout(async () => {
        await Promise.all([
          fetchProfile(session.user.id),
          fetchResumes(session.user.id),
          fetchCoverTemplates(session.user.id)
        ]);
        setLoading(false);
      }, 0);
    };

    initAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const calculateProgress = () => {
    let progress = 0;
    if (profile?.full_name) progress += 20;
    if (profile?.phone || profile?.linkedin_url) progress += 20;
    if (resumes.length > 0) progress += 40;
    if (coverTemplateCount > 0) progress += 20;
    return progress;
  };

  const progress = calculateProgress();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Profile Setup
                  </h1>
                  <p className="text-xs text-muted-foreground">Complete your profile to enable one-click apply</p>
                </div>
              </div>
            </div>

            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Card */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Profile Completion</h2>
              <p className="text-sm text-muted-foreground">
                {progress === 100 
                  ? "Your profile is complete! You can use one-click apply."
                  : "Complete your profile to enable one-click apply"}
              </p>
            </div>
            <div className="text-2xl font-bold text-primary">{progress}%</div>
          </div>
          <Progress value={progress} className="h-2" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className={`flex items-center gap-2 ${profile?.full_name ? "text-green-600" : "text-muted-foreground"}`}>
              <CheckCircle className={`h-5 w-5 ${profile?.full_name ? "text-green-500" : ""}`} />
              <span className="text-sm">Basic Info</span>
            </div>
            <div className={`flex items-center gap-2 ${(profile?.phone || profile?.linkedin_url) ? "text-green-600" : "text-muted-foreground"}`}>
              <CheckCircle className={`h-5 w-5 ${(profile?.phone || profile?.linkedin_url) ? "text-green-500" : ""}`} />
              <span className="text-sm">Contact Details</span>
            </div>
            <div className={`flex items-center gap-2 ${resumes.length > 0 ? "text-green-600" : "text-muted-foreground"}`}>
              <CheckCircle className={`h-5 w-5 ${resumes.length > 0 ? "text-green-500" : ""}`} />
              <span className="text-sm">Resume Uploaded</span>
            </div>
            <div className={`flex items-center gap-2 ${coverTemplateCount > 0 ? "text-green-600" : "text-muted-foreground"}`}>
              <CheckCircle className={`h-5 w-5 ${coverTemplateCount > 0 ? "text-green-500" : ""}`} />
              <span className="text-sm">Cover Letter</span>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-2">
            <TabsTrigger value="profile" className="gap-2">
              <UserIcon className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="resumes" className="gap-2">
              <FileText className="h-4 w-4" />
              Resumes
              {resumes.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                  {resumes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="h-4 w-4" />
              Job Preferences
            </TabsTrigger>
            <TabsTrigger value="cover-letters" className="gap-2">
              <Mail className="h-4 w-4" />
              Cover Letters
              {coverTemplateCount > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                  {coverTemplateCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileForm 
              userId={user?.id || ""} 
              profile={profile} 
              onProfileUpdate={() => fetchProfile(user?.id || "")}
            />
          </TabsContent>

          <TabsContent value="resumes">
            <ResumeUpload 
              userId={user?.id || ""} 
              resumes={resumes} 
              onResumesChange={() => fetchResumes(user?.id || "")}
            />
          </TabsContent>

          <TabsContent value="preferences">
            <JobPreferences userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="cover-letters">
            <CoverLetterTemplates userId={user?.id || ""} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfileSetup;
