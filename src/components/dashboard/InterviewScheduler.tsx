import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, isSameDay, parseISO, addDays } from "date-fns";
import { 
  CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  Phone, 
  Users, 
  Plus, 
  Trash2, 
  Bell,
  ExternalLink,
  Loader2,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Interview {
  id: string;
  application_id: string | null;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  interviewer_name: string | null;
  interviewer_email: string | null;
  notes: string | null;
  reminder_sent: boolean;
  status: string;
  applications?: {
    job_postings: {
      title: string;
      company: string;
    };
  };
}

interface Application {
  id: string;
  job_postings: {
    title: string;
    company: string;
  };
}

const INTERVIEW_TYPES = [
  { value: "phone", label: "Phone Screen", icon: Phone },
  { value: "video", label: "Video Call", icon: Video },
  { value: "onsite", label: "On-site", icon: MapPin },
  { value: "technical", label: "Technical", icon: Users },
  { value: "panel", label: "Panel", icon: Users },
];

export const InterviewScheduler = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    application_id: "",
    interview_type: "video",
    scheduled_at: new Date(),
    scheduled_time: "10:00",
    duration_minutes: 60,
    location: "",
    meeting_link: "",
    interviewer_name: "",
    interviewer_email: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [interviewsRes, applicationsRes] = await Promise.all([
      supabase
        .from("interviews")
        .select(`
          *,
          applications (
            job_postings (
              title,
              company
            )
          )
        `)
        .eq("user_id", user.id)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("applications")
        .select(`
          id,
          job_postings (
            title,
            company
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["applied", "interview"])
    ]);

    if (interviewsRes.data) setInterviews(interviewsRes.data as Interview[]);
    if (applicationsRes.data) setApplications(applicationsRes.data as Application[]);
    setLoading(false);
  };

  const handleSchedule = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    
    const [hours, minutes] = formData.scheduled_time.split(":").map(Number);
    const scheduledAt = new Date(formData.scheduled_at);
    scheduledAt.setHours(hours, minutes, 0, 0);

    const { error } = await supabase.from("interviews").insert({
      user_id: user.id,
      application_id: formData.application_id || null,
      interview_type: formData.interview_type,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: formData.duration_minutes,
      location: formData.location || null,
      meeting_link: formData.meeting_link || null,
      interviewer_name: formData.interviewer_name || null,
      interviewer_email: formData.interviewer_email || null,
      notes: formData.notes || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to schedule interview");
      return;
    }

    toast.success("Interview scheduled successfully!");
    setIsDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleSendReminder = async (interview: Interview) => {
    setSendingReminder(interview.id);
    
    try {
      const { error } = await supabase.functions.invoke("send-interview-reminder", {
        body: { interviewId: interview.id }
      });

      if (error) throw error;
      
      toast.success("Reminder email sent!");
      fetchData();
    } catch (err) {
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("interviews").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete interview");
      return;
    }
    
    toast.success("Interview deleted");
    fetchData();
  };

  const resetForm = () => {
    setFormData({
      application_id: "",
      interview_type: "video",
      scheduled_at: new Date(),
      scheduled_time: "10:00",
      duration_minutes: 60,
      location: "",
      meeting_link: "",
      interviewer_name: "",
      interviewer_email: "",
      notes: "",
    });
  };

  const getInterviewsForDate = (date: Date) => {
    return interviews.filter(i => isSameDay(parseISO(i.scheduled_at), date));
  };

  const upcomingInterviews = interviews.filter(
    i => new Date(i.scheduled_at) >= new Date() && i.status === "scheduled"
  );

  const getTypeIcon = (type: string) => {
    const typeInfo = INTERVIEW_TYPES.find(t => t.value === type);
    return typeInfo?.icon || Video;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-500/10 text-blue-500";
      case "completed": return "bg-green-500/10 text-green-500";
      case "cancelled": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Interview Schedule</h2>
          <p className="text-muted-foreground">
            {upcomingInterviews.length} upcoming interview{upcomingInterviews.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule New Interview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Application Select */}
              <div className="space-y-2">
                <Label>Link to Application (optional)</Label>
                <Select 
                  value={formData.application_id} 
                  onValueChange={(v) => setFormData({ ...formData, application_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an application" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.job_postings?.title} at {app.job_postings?.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interview Type */}
              <div className="space-y-2">
                <Label>Interview Type</Label>
                <Select 
                  value={formData.interview_type} 
                  onValueChange={(v) => setFormData({ ...formData, interview_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(formData.scheduled_at, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_at}
                        onSelect={(d) => d && setFormData({ ...formData, scheduled_at: d })}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Select 
                  value={String(formData.duration_minutes)} 
                  onValueChange={(v) => setFormData({ ...formData, duration_minutes: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Meeting Link or Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meeting Link</Label>
                  <Input
                    placeholder="https://zoom.us/..."
                    value={formData.meeting_link}
                    onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="Office address..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              {/* Interviewer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interviewer Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={formData.interviewer_name}
                    onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interviewer Email</Label>
                  <Input
                    type="email"
                    placeholder="interviewer@company.com"
                    value={formData.interviewer_email}
                    onChange={(e) => setFormData({ ...formData, interviewer_email: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Interview preparation notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSchedule}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Schedule Interview
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            modifiers={{
              hasInterview: interviews.map(i => parseISO(i.scheduled_at))
            }}
            modifiersStyles={{
              hasInterview: { 
                fontWeight: "bold",
                backgroundColor: "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))"
              }
            }}
          />
          
          {/* Selected Date Interviews */}
          <div className="mt-4 pt-4 border-t">
            <h3 className="font-medium mb-3">
              {format(selectedDate, "MMMM d, yyyy")}
            </h3>
            {getInterviewsForDate(selectedDate).length === 0 ? (
              <p className="text-sm text-muted-foreground">No interviews scheduled</p>
            ) : (
              <div className="space-y-2">
                {getInterviewsForDate(selectedDate).map((interview) => {
                  const TypeIcon = getTypeIcon(interview.interview_type);
                  return (
                    <div key={interview.id} className="p-2 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-3 w-3" />
                        <span className="font-medium">
                          {format(parseISO(interview.scheduled_at), "h:mm a")}
                        </span>
                      </div>
                      {interview.applications?.job_postings && (
                        <p className="text-muted-foreground mt-1">
                          {interview.applications.job_postings.company}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming Interviews List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold">Upcoming Interviews</h3>
          
          {upcomingInterviews.length === 0 ? (
            <Card className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No upcoming interviews</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule your first interview to see it here
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingInterviews.map((interview) => {
                const TypeIcon = getTypeIcon(interview.interview_type);
                const typeInfo = INTERVIEW_TYPES.find(t => t.value === interview.interview_type);
                
                return (
                  <Card key={interview.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className={cn(
                          "p-3 rounded-lg",
                          "bg-primary/10"
                        )}>
                          <TypeIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {typeInfo?.label || "Interview"}
                            </h4>
                            <Badge className={getStatusColor(interview.status)}>
                              {interview.status}
                            </Badge>
                            {interview.reminder_sent && (
                              <Badge variant="outline" className="text-xs">
                                <Bell className="h-3 w-3 mr-1" />
                                Reminder sent
                              </Badge>
                            )}
                          </div>
                          
                          {interview.applications?.job_postings && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {interview.applications.job_postings.title} at{" "}
                              {interview.applications.job_postings.company}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(parseISO(interview.scheduled_at), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(interview.scheduled_at), "h:mm a")} ({interview.duration_minutes} min)
                            </span>
                            {interview.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {interview.location}
                              </span>
                            )}
                          </div>
                          
                          {interview.interviewer_name && (
                            <p className="text-sm mt-2">
                              <span className="text-muted-foreground">With:</span>{" "}
                              {interview.interviewer_name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {interview.meeting_link && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(interview.meeting_link!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Join
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          title="Add to Google Calendar"
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.functions.invoke("generate-calendar-event", {
                                body: { interviewId: interview.id },
                              });
                              if (error) throw error;
                              if (data?.googleCalendarUrl) window.open(data.googleCalendarUrl, "_blank");
                            } catch {
                              toast.error("Failed to add to calendar");
                            }
                          }}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Download .ics file"
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.functions.invoke("generate-calendar-event", {
                                body: { interviewId: interview.id },
                              });
                              if (error) throw error;
                              if (data?.icsContent) {
                                const blob = new Blob([data.icsContent], { type: "text/calendar" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `interview-${interview.id.slice(0, 8)}.ics`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            } catch {
                              toast.error("Failed to download calendar file");
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(interview)}
                          disabled={sendingReminder === interview.id}
                        >
                          {sendingReminder === interview.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(interview.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    
                    {interview.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">{interview.notes}</p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
