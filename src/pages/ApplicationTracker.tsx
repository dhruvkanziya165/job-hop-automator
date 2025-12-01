import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, MapPin, Clock, Edit, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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

const statusColumns = [
  { id: "pending", label: "Pending", color: "bg-gray-500" },
  { id: "applied", label: "Applied", color: "bg-blue-500" },
  { id: "interview", label: "Interview", color: "bg-purple-500" },
  { id: "offer", label: "Offer", color: "bg-green-500" },
  { id: "rejected", label: "Rejected", color: "bg-red-500" },
  { id: "withdrawn", label: "Withdrawn", color: "bg-orange-500" },
];

const ApplicationTracker = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        job_postings (
          id,
          title,
          company,
          location,
          url,
          job_type
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load applications");
      return;
    }

    setApplications(data || []);
    setLoading(false);
  };

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    
    if (newStatus === "applied" && !applications.find(a => a.id === appId)?.applied_at) {
      updates.applied_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("applications")
      .update(updates)
      .eq("id", appId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success("Status updated");
    fetchApplications();
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
    fetchApplications();
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
    fetchApplications();
  };

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Loading applications...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Application Tracker
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your job applications through the hiring pipeline
          </p>
        </div>

        {applications.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No applications yet. Start applying to jobs!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {statusColumns.map((column) => {
              const columnApps = getApplicationsByStatus(column.id);
              return (
                <div key={column.id} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-semibold text-sm">{column.label}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {columnApps.length}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {columnApps.map((app) => (
                      <Card key={app.id} className="p-4 space-y-3 hover:shadow-lg transition-shadow">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm line-clamp-2 leading-tight">
                            {app.job_postings.title}
                          </h4>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{app.job_postings.company}</span>
                            </div>
                            {app.job_postings.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{app.job_postings.location}</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {app.job_postings.job_type === "internship" ? "Internship" : "Full-time"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {app.applied_at ? `Applied ${formatDate(app.applied_at)}` : `Added ${formatDate(app.created_at)}`}
                          </span>
                        </div>

                        {app.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
                            {app.notes}
                          </p>
                        )}

                        <div className="flex gap-1 pt-2 border-t">
                          <Select
                            value={app.status}
                            onValueChange={(value) => handleUpdateStatus(app.id, value)}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusColumns.map((status) => (
                                <SelectItem key={status.id} value={status.id} className="text-xs">
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingApp(app);
                                  setEditNotes(app.notes || "");
                                  setEditStatus(app.status);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Application</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-1">{app.job_postings.title}</h4>
                                  <p className="text-sm text-muted-foreground">{app.job_postings.company}</p>
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
                                          {status.label}
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
                                    placeholder="Add notes about this application..."
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
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(app.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApplicationTracker;
