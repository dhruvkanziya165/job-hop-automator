import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  FileText,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ProfileCompletionReminderProps {
  userId: string;
}

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  linkedin_url: string | null;
}

export const ProfileCompletionReminder = ({ userId }: ProfileCompletionReminderProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [profileRes, resumesRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, linkedin_url").eq("id", userId).single(),
        supabase.from("resumes").select("id").eq("user_id", userId),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
      }
      setResumeCount(resumesRes.data?.length || 0);
      setLoading(false);
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  if (loading) return null;

  // Calculate completion
  const hasName = !!profile?.full_name;
  const hasContact = !!(profile?.phone || profile?.linkedin_url);
  const hasResume = resumeCount > 0;

  const completedSteps = [hasName, hasContact, hasResume].filter(Boolean).length;
  const progress = Math.round((completedSteps / 3) * 100);

  // Don't show if profile is complete
  if (progress === 100) return null;

  // Check if user dismissed today
  const dismissKey = `profile_reminder_dismissed_${userId}`;
  const dismissed = localStorage.getItem(dismissKey);
  const today = new Date().toDateString();
  if (dismissed === today && !isVisible) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, today);
    setIsVisible(false);
  };

  const steps = [
    {
      label: "Add your name",
      completed: hasName,
      icon: User,
    },
    {
      label: "Add contact info",
      completed: hasContact,
      icon: User,
    },
    {
      label: "Upload resume",
      completed: hasResume,
      icon: FileText,
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-5 mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Complete Your Profile</h3>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Complete your profile to enable <strong>One-Click Apply</strong> and speed up your job applications
                </p>

                {/* Progress */}
                <div className="flex items-center gap-3 mb-4">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-sm font-medium text-primary">{progress}%</span>
                </div>

                {/* Steps */}
                <div className="flex flex-wrap gap-4">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm ${
                        step.completed ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      )}
                      <span className={step.completed ? "line-through opacity-60" : ""}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0">
                <Button
                  onClick={() => navigate("/profile")}
                  className="gap-2 bg-primary hover:bg-primary/90 shadow-lg"
                >
                  <Zap className="h-4 w-4" />
                  Complete Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};