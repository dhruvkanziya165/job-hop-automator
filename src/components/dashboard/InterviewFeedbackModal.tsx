import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, MessageSquarePlus, Star } from "lucide-react";

interface InterviewFeedbackModalProps {
  interviewId: string;
  jobTitle: string;
  company: string;
  trigger?: React.ReactNode;
}

interface FeedbackData {
  overall_rating: number;
  difficulty_rating: number;
  outcome: string;
  went_well: string;
  could_improve: string;
  questions_asked: string;
  notes: string;
  would_recommend: boolean;
}

const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 transition-colors"
        >
          <Star
            className={`h-5 w-5 ${star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        </button>
      ))}
    </div>
  </div>
);

export const InterviewFeedbackModal = ({ interviewId, jobTitle, company, trigger }: InterviewFeedbackModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<boolean>(false);
  const [form, setForm] = useState<FeedbackData>({
    overall_rating: 3,
    difficulty_rating: 3,
    outcome: "pending",
    went_well: "",
    could_improve: "",
    questions_asked: "",
    notes: "",
    would_recommend: false,
  });

  const loadExisting = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("interview_feedback" as any)
      .select("*")
      .eq("interview_id", interviewId)
      .maybeSingle();

    if (data) {
      setExistingFeedback(true);
      setForm({
        overall_rating: (data as any).overall_rating,
        difficulty_rating: (data as any).difficulty_rating,
        outcome: (data as any).outcome || "pending",
        went_well: (data as any).went_well || "",
        could_improve: (data as any).could_improve || "",
        questions_asked: (data as any).questions_asked || "",
        notes: (data as any).notes || "",
        would_recommend: (data as any).would_recommend || false,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      interview_id: interviewId,
      ...form,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existingFeedback) {
      ({ error } = await supabase
        .from("interview_feedback" as any)
        .update(payload as any)
        .eq("interview_id", interviewId));
    } else {
      ({ error } = await supabase
        .from("interview_feedback" as any)
        .insert(payload as any));
    }

    setSaving(false);
    if (error) {
      toast.error("Failed to save feedback");
      return;
    }
    toast.success("Feedback saved!");
    setExistingFeedback(true);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadExisting(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-xs">
            <MessageSquarePlus className="h-3 w-3 mr-1" />
            Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Interview Feedback
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{jobTitle} at {company}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <StarRating label="Overall Experience" value={form.overall_rating} onChange={(v) => setForm({ ...form, overall_rating: v })} />
              <StarRating label="Difficulty Level" value={form.difficulty_rating} onChange={(v) => setForm({ ...form, difficulty_rating: v })} />
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="passed">Passed / Advanced</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="offer">Received Offer</SelectItem>
                  <SelectItem value="ghosted">No Response</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>What went well?</Label>
              <Textarea placeholder="Strong points, good answers..." value={form.went_well} onChange={(e) => setForm({ ...form, went_well: e.target.value })} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>What could be improved?</Label>
              <Textarea placeholder="Areas to work on..." value={form.could_improve} onChange={(e) => setForm({ ...form, could_improve: e.target.value })} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Questions asked</Label>
              <Textarea placeholder="List the questions you were asked..." value={form.questions_asked} onChange={(e) => setForm({ ...form, questions_asked: e.target.value })} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Additional notes</Label>
              <Textarea placeholder="Any other thoughts..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label className="text-sm">Would you recommend this company?</Label>
              <Switch checked={form.would_recommend} onCheckedChange={(v) => setForm({ ...form, would_recommend: v })} />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {existingFeedback ? "Update Feedback" : "Save Feedback"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
