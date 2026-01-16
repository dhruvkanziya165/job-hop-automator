import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, 
  MapPin, 
  Edit, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  GripVertical,
  Calendar,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InterviewScheduleModal } from "./InterviewScheduleModal";

interface Application {
  id: string;
  status: string;
  created_at: string;
  applied_at: string | null;
  updated_at: string;
  notes: string | null;
  job_postings: {
    id: string;
    title: string;
    company: string;
    location: string;
    url: string;
    job_type: string;
  };
}

interface ApplicationPipelineProps {
  applications: Application[];
  onUpdate: () => void;
}

const statusColumns = [
  { id: "pending", label: "📝 Pending", color: "bg-slate-500", borderColor: "border-slate-400", bgLight: "bg-slate-50 dark:bg-slate-900/30" },
  { id: "applied", label: "📨 Applied", color: "bg-blue-500", borderColor: "border-blue-400", bgLight: "bg-blue-50 dark:bg-blue-900/30" },
  { id: "interview", label: "🎯 Interview", color: "bg-purple-500", borderColor: "border-purple-400", bgLight: "bg-purple-50 dark:bg-purple-900/30" },
  { id: "offer", label: "🎉 Offer", color: "bg-green-500", borderColor: "border-green-400", bgLight: "bg-green-50 dark:bg-green-900/30" },
  { id: "rejected", label: "❌ Rejected", color: "bg-red-500", borderColor: "border-red-400", bgLight: "bg-red-50 dark:bg-red-900/30" },
  { id: "withdrawn", label: "🔙 Withdrawn", color: "bg-orange-500", borderColor: "border-orange-400", bgLight: "bg-orange-50 dark:bg-orange-900/30" },
];

export const ApplicationPipeline = ({ applications, onUpdate }: ApplicationPipelineProps) => {
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [draggedApp, setDraggedApp] = useState<string | null>(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [pendingInterviewApp, setPendingInterviewApp] = useState<Application | null>(null);

  const handleUpdateStatus = async (appId: string, newStatus: string, skipInterviewPrompt = false) => {
    const app = applications.find(a => a.id === appId);
    
    // If moving to interview stage, prompt to schedule
    if (newStatus === "interview" && !skipInterviewPrompt && app) {
      setPendingInterviewApp(app);
      setInterviewModalOpen(true);
    }
    const updates: Record<string, unknown> = { status: newStatus };
    
    if (newStatus === "applied") {
      const app = applications.find(a => a.id === appId);
      if (app && !app.applied_at) {
        updates.applied_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from("applications")
      .update(updates)
      .eq("id", appId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success(`Status updated to ${statusColumns.find(s => s.id === newStatus)?.label}`);
    onUpdate();
  };

  const handleUpdateNotes = async () => {
    if (!editingApp) return;

    const { error } = await supabase
      .from("applications")
      .update({ 
        notes: editNotes,
        status: editStatus 
      })
      .eq("id", editingApp.id);

    if (error) {
      toast.error("Failed to update application");
      return;
    }

    toast.success("Application updated");
    setEditingApp(null);
    onUpdate();
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return;

    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", appId);

    if (error) {
      toast.error("Failed to delete application");
      return;
    }

    toast.success("Application deleted");
    onUpdate();
  };

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    setDraggedApp(appId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (draggedApp) {
      const app = applications.find(a => a.id === draggedApp);
      if (targetStatus === "interview" && app) {
        setPendingInterviewApp(app);
        setInterviewModalOpen(true);
      }
      await handleUpdateStatus(draggedApp, targetStatus, targetStatus === "interview");
      setDraggedApp(null);
    }
  };

  const handleInterviewScheduled = () => {
    setPendingInterviewApp(null);
    onUpdate();
  };

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {statusColumns.map((column) => {
          const columnApps = getApplicationsByStatus(column.id);
          return (
            <div 
              key={column.id} 
              className={`w-72 flex-shrink-0 rounded-xl ${column.bgLight} border-2 ${column.borderColor}/30`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`p-4 rounded-t-xl border-b-2 ${column.borderColor}/30`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color} shadow-lg`} />
                    <h3 className="font-bold text-sm">{column.label}</h3>
                  </div>
                  <Badge 
                    className={`${column.color} text-white font-bold shadow-sm`}
                  >
                    {columnApps.length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-3 space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto">
                {columnApps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>No applications</p>
                    <p className="text-xs mt-1">Drag cards here</p>
                  </div>
                ) : (
                  columnApps.map((app) => (
                    <Card 
                      key={app.id} 
                      className={`p-4 space-y-3 hover:shadow-xl transition-all duration-200 cursor-grab active:cursor-grabbing border-l-4 ${column.borderColor} ${
                        draggedApp === app.id ? "opacity-50 scale-95" : ""
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                    >
                      {/* Drag Handle */}
                      <div className="flex items-start justify-between gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm line-clamp-2 leading-tight">
                            {app.job_postings.title}
                          </h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {app.job_postings.job_type === "internship" ? "🎓" : "💼"}
                        </Badge>
                      </div>

                      {/* Company & Location */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Building2 className="h-3 w-3 text-primary" />
                          <span className="font-medium truncate">{app.job_postings.company}</span>
                        </div>
                        {app.job_postings.location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{app.job_postings.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Date Info */}
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full w-fit">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {app.applied_at 
                            ? getTimeAgo(app.applied_at)
                            : getTimeAgo(app.created_at)}
                        </span>
                      </div>

                      {/* Notes Preview */}
                      {app.notes && (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                          <p className="line-clamp-2">{app.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 pt-2 border-t">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={() => {
                                setEditingApp(app);
                                setEditNotes(app.notes || "");
                                setEditStatus(app.status);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Application</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-4 bg-muted/50 rounded-lg">
                                <h4 className="font-semibold">{app.job_postings.title}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Building2 className="h-3 w-3" />
                                  {app.job_postings.company}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={editStatus} onValueChange={setEditStatus}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusColumns.map((status) => (
                                      <SelectItem key={status.id} value={status.id}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                          {status.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Notes</label>
                                <Textarea
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  placeholder="Add interview notes, follow-up reminders, contact info..."
                                  rows={4}
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button onClick={handleUpdateNotes} className="flex-1">
                                  Save Changes
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => window.open(app.job_postings.url, "_blank")}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => window.open(app.job_postings.url, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(app.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Quick Status Change */}
                      {column.id !== "offer" && column.id !== "rejected" && column.id !== "withdrawn" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => {
                            const nextStatus = column.id === "pending" ? "applied" 
                              : column.id === "applied" ? "interview" 
                              : "offer";
                            handleUpdateStatus(app.id, nextStatus);
                          }}
                        >
                          Move to {column.id === "pending" ? "Applied" : column.id === "applied" ? "Interview" : "Offer"}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interview Schedule Modal */}
      {pendingInterviewApp && (
        <InterviewScheduleModal
          open={interviewModalOpen}
          onOpenChange={(open) => {
            setInterviewModalOpen(open);
            if (!open) setPendingInterviewApp(null);
          }}
          applicationId={pendingInterviewApp.id}
          jobTitle={pendingInterviewApp.job_postings.title}
          company={pendingInterviewApp.job_postings.company}
          onScheduled={handleInterviewScheduled}
        />
      )}
    </div>
  );
};
