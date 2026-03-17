import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Phone, Video, MapPin, Users } from "lucide-react";

interface InterviewScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  jobTitle: string;
  company: string;
  onScheduled: () => void;
}

const INTERVIEW_TYPES = [
  { value: "phone", label: "Phone Screen", icon: Phone },
  { value: "video", label: "Video Call", icon: Video },
  { value: "onsite", label: "On-site", icon: MapPin },
  { value: "technical", label: "Technical", icon: Users },
  { value: "panel", label: "Panel", icon: Users },
];

export const InterviewScheduleModal = ({
  open,
  onOpenChange,
  applicationId,
  jobTitle,
  company,
  onScheduled,
}: InterviewScheduleModalProps) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
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

  const handleSchedule = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to schedule interviews");
      return;
    }

    setSaving(true);
    
    const [hours, minutes] = formData.scheduled_time.split(":").map(Number);
    const scheduledAt = new Date(formData.scheduled_at);
    scheduledAt.setHours(hours, minutes, 0, 0);

    const { data: newInterview, error } = await supabase.from("interviews").insert({
      user_id: user.id,
      application_id: applicationId,
      interview_type: formData.interview_type,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: formData.duration_minutes,
      location: formData.location || null,
      meeting_link: formData.meeting_link || null,
      interviewer_name: formData.interviewer_name || null,
      interviewer_email: formData.interviewer_email || null,
      notes: formData.notes || null,
    }).select("id").single();

    setSaving(false);

    if (error) {
      toast.error("Failed to schedule interview");
      console.error("Error scheduling interview:", error);
      return;
    }

    toast.success("Interview scheduled successfully!");

    // Send scheduled notification email
    if (newInterview?.id) {
      supabase.functions.invoke("send-interview-reminder", {
        body: { interviewId: newInterview.id, type: "scheduled" },
      }).catch(() => { /* non-critical */ });
    }

    onOpenChange(false);
    onScheduled();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule an interview for <strong>{jobTitle}</strong> at <strong>{company}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
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
            <Label>Duration</Label>
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

          <div className="flex gap-2">
            <Button 
              className="flex-1" 
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Skip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
