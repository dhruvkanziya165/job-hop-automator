import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  linkedin: z.string().trim().max(255).optional().or(z.literal("")),
  coverNote: z.string().trim().max(2000).optional(),
});

interface Props {
  job: { id: string; title: string; company: string; url: string } | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApplied?: () => void;
}

export const ApplyFormDialog = ({ job, open, onOpenChange, onApplied }: Props) => {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", linkedin: "", coverNote: "" });
  const [resumes, setResumes] = useState<{ id: string; file_name: string }[]>([]);
  const [resumeId, setResumeId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false); setErrors({});
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("full_name,email,phone,linkedin_url").eq("id", user.id).maybeSingle(),
        supabase.from("resumes").select("id,file_name,is_default").eq("user_id", user.id).order("is_default", { ascending: false }),
      ]);
      setForm((f) => ({ ...f, fullName: p?.full_name ?? "", email: p?.email ?? user.email ?? "", phone: p?.phone ?? "", linkedin: p?.linkedin_url ?? "" }));
      setResumes(r ?? []);
      setResumeId(r?.[0]?.id ?? "");
    })();
  }, [open]);

  if (!job) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const copyDetails = () => {
    const text = `${form.fullName}\n${form.email}\n${form.phone}${form.linkedin ? `\n${form.linkedin}` : ""}${form.coverNote ? `\n\n${form.coverNote}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Your details are copied — paste them on the company's form.");
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.errors.map((e) => [e.path[0] as string, e.message])));
      return;
    }
    setErrors({}); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); toast.error("Please sign in first"); return; }

    // Keep profile up to date for next time
    await supabase.from("profiles").update({ full_name: form.fullName, phone: form.phone, linkedin_url: form.linkedin || null }).eq("id", user.id);

    const notes = `Applied via in-app form on ${new URL(job.url).hostname}.${form.coverNote ? ` Note: ${form.coverNote.slice(0, 500)}` : ""}`;
    const payload = { status: "applied", applied_at: new Date().toISOString(), resume_id: resumeId || null, notes };
    const { data: existing } = await supabase.from("applications").select("id").eq("user_id", user.id).eq("job_id", job.id).maybeSingle();
    const { error } = existing
      ? await supabase.from("applications").update(payload).eq("id", existing.id)
      : await supabase.from("applications").insert({ ...payload, user_id: user.id, job_id: job.id });
    setSaving(false);
    if (error) { toast.error("Couldn't save your application. Please try again."); return; }
    setDone(true);
    onApplied?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to {job.title}</DialogTitle>
          <DialogDescription>{job.company}</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <p className="font-medium">Marked as Applied in your Application Tracker.</p>
            <p className="text-sm text-muted-foreground">
              Finish on {job.company}'s page if you haven't already — paste your copied details there.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="outline" onClick={copyDetails}><Copy className="h-4 w-4 mr-2" />Copy my details</Button>
              <Button onClick={() => window.open(job.url, "_blank")}><ExternalLink className="h-4 w-4 mr-2" />Open company page</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {([["fullName", "Full name"], ["email", "Email"], ["phone", "Phone"], ["linkedin", "LinkedIn (optional)"]] as const).map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={k}>{label}</Label>
                <Input id={k} value={form[k]} onChange={set(k)} />
                {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Resume</Label>
              {resumes.length ? (
                <Select value={resumeId} onValueChange={setResumeId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{resumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.file_name}</SelectItem>)}</SelectContent>
                </Select>
              ) : <p className="text-sm text-muted-foreground">No resume uploaded yet — add one in Profile.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coverNote">Short note to the employer (optional)</Label>
              <Textarea id="coverNote" rows={4} value={form.coverNote} onChange={set("coverNote")} />
            </div>
            <p className="text-xs text-muted-foreground">
              Companies only accept applications on their own page. We save this as Applied, then open their page so you can paste your details.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={copyDetails} className="flex-1"><Copy className="h-4 w-4 mr-2" />Copy details</Button>
              <Button onClick={async () => { await submit(); }} disabled={saving} className="flex-1">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit & mark Applied
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
