import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InterviewPrepChecklist } from "./InterviewPrepChecklist";
import { InterviewFeedbackModal } from "./InterviewFeedbackModal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval, addDays } from "date-fns";
import {
  CalendarIcon,
  Clock,
  MapPin,
  Video,
  Phone,
  Users,
  Bell,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";

interface Interview {
  id: string;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  interviewer_name: string | null;
  reminder_sent: boolean;
  status: string;
  applications?: {
    job_postings: {
      title: string;
      company: string;
    };
  } | null;
}

const TYPE_ICONS: Record<string, typeof Video> = {
  video: Video,
  phone: Phone,
  onsite: MapPin,
  technical: Users,
  panel: Users,
};

export const UpcomingInterviews = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const fetchUpcoming = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date().toISOString();
    const weekFromNow = addDays(new Date(), 7).toISOString();

    const { data } = await supabase
      .from("interviews")
      .select(`
        id, interview_type, scheduled_at, duration_minutes,
        location, meeting_link, interviewer_name, reminder_sent, status,
        applications (
          job_postings ( title, company )
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", now)
      .lte("scheduled_at", weekFromNow)
      .order("scheduled_at", { ascending: true })
      .limit(5);

    if (data) setInterviews(data as Interview[]);
    setLoading(false);
  };

  const handleSendReminder = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase.functions.invoke("send-interview-reminder", {
        body: { interviewId: id, type: "reminder" },
      });
      if (error) throw error;
      toast.success("Reminder email sent!");
      fetchUpcoming();
    } catch {
      toast.error("Failed to send reminder");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToCalendar = async (id: string) => {
    setActionLoading(`cal-${id}`);
    try {
      const { data, error } = await supabase.functions.invoke("generate-calendar-event", {
        body: { interviewId: id },
      });
      if (error) throw error;

      // Open Google Calendar link
      if (data?.googleCalendarUrl) {
        window.open(data.googleCalendarUrl, "_blank");
      }
    } catch {
      toast.error("Failed to generate calendar event");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadICS = async (id: string) => {
    setActionLoading(`ics-${id}`);
    try {
      const { data, error } = await supabase.functions.invoke("generate-calendar-event", {
        body: { interviewId: id },
      });
      if (error) throw error;

      if (data?.icsContent) {
        const blob = new Blob([data.icsContent], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `interview-${id.slice(0, 8)}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Calendar file downloaded");
      }
    } catch {
      toast.error("Failed to download calendar file");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Upcoming Interviews
        </h3>
        <Badge variant="secondary">{interviews.length} this week</Badge>
      </div>

      {interviews.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No interviews scheduled for the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => {
            const TypeIcon = TYPE_ICONS[interview.interview_type] || Video;
            const scheduledAt = parseISO(interview.scheduled_at);
            const isToday = format(scheduledAt, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <div
                key={interview.id}
                className={`p-3 rounded-lg border transition-colors ${
                  isToday
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeIcon className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {interview.applications?.job_postings?.title || "Interview"}
                      </span>
                      {isToday && (
                        <Badge className="bg-primary/10 text-primary text-[10px] px-1.5">
                          Today
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {interview.applications?.job_postings?.company || ""}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(scheduledAt, "EEE, MMM d")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(scheduledAt, "h:mm a")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    <InterviewPrepChecklist
                      interviewId={interview.id}
                      jobTitle={interview.applications?.job_postings?.title || "Interview"}
                      company={interview.applications?.job_postings?.company || "Company"}
                    />
                    <InterviewFeedbackModal
                      interviewId={interview.id}
                      jobTitle={interview.applications?.job_postings?.title || "Interview"}
                      company={interview.applications?.job_postings?.company || "Company"}
                    />
                    {interview.meeting_link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(interview.meeting_link!, "_blank")}
                        title="Join meeting"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={actionLoading === `cal-${interview.id}`}
                      onClick={() => handleAddToCalendar(interview.id)}
                      title="Add to Google Calendar"
                    >
                      {actionLoading === `cal-${interview.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CalendarIcon className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={actionLoading === `ics-${interview.id}`}
                      onClick={() => handleDownloadICS(interview.id)}
                      title="Download .ics file"
                    >
                      {actionLoading === `ics-${interview.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </Button>
                    {!interview.reminder_sent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={actionLoading === interview.id}
                        onClick={() => handleSendReminder(interview.id)}
                        title="Send reminder email"
                      >
                        {actionLoading === interview.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Bell className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
