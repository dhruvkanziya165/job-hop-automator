import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Edit3,
  Trash2,
  Star,
  Save,
  Loader2,
  Briefcase,
  Code,
  PenTool,
  Megaphone,
  Users,
  Settings,
  Copy,
} from "lucide-react";

interface CoverTemplate {
  id: string;
  template_name: string;
  content: string;
  is_default: boolean | null;
  created_at: string;
}

interface CoverLetterTemplatesProps {
  userId: string;
}

const JOB_TYPE_ICONS: Record<string, React.ReactNode> = {
  general: <FileText className="h-4 w-4" />,
  technical: <Code className="h-4 w-4" />,
  creative: <PenTool className="h-4 w-4" />,
  marketing: <Megaphone className="h-4 w-4" />,
  management: <Users className="h-4 w-4" />,
  operations: <Settings className="h-4 w-4" />,
  business: <Briefcase className="h-4 w-4" />,
};

const TEMPLATE_PLACEHOLDERS = `Available placeholders:
{{name}} - Your full name
{{company}} - Company name
{{position}} - Job title
{{skills}} - Your key skills
{{experience}} - Years of experience`;

const DEFAULT_TEMPLATE = `Dear Hiring Manager,

I am writing to express my strong interest in the {{position}} role at {{company}}. With my background in {{skills}}, I am confident in my ability to contribute effectively to your team.

Throughout my career, I have developed expertise that aligns well with the requirements of this position. I am particularly drawn to {{company}}'s mission and would welcome the opportunity to bring my skills and enthusiasm to your organization.

I would appreciate the opportunity to discuss how my experience and skills would benefit your team. Thank you for considering my application.

Best regards,
{{name}}`;

const CoverLetterTemplates = ({ userId }: CoverLetterTemplatesProps) => {
  const [templates, setTemplates] = useState<CoverTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CoverTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<CoverTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATE);
  const [isDefault, setIsDefault] = useState(false);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("cover_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load templates");
      return;
    }

    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchTemplates();
    }
  }, [userId]);

  const resetForm = () => {
    setTemplateName("");
    setTemplateContent(DEFAULT_TEMPLATE);
    setIsDefault(false);
    setEditingTemplate(null);
  };

  const handleOpenDialog = (template?: CoverTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.template_name);
      setTemplateContent(template.content);
      setIsDefault(template.is_default || false);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!templateContent.trim()) {
      toast.error("Please enter template content");
      return;
    }

    setSaving(true);

    try {
      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from("cover_templates")
          .update({ is_default: false })
          .eq("user_id", userId);
      }

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from("cover_templates")
          .update({
            template_name: templateName.trim(),
            content: templateContent.trim(),
            is_default: isDefault,
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        // Create new template
        const { error } = await supabase.from("cover_templates").insert({
          user_id: userId,
          template_name: templateName.trim(),
          content: templateContent.trim(),
          is_default: isDefault,
        });

        if (error) throw error;
        toast.success("Template created successfully");
      }

      handleCloseDialog();
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplate) return;

    try {
      const { error } = await supabase
        .from("cover_templates")
        .delete()
        .eq("id", deleteTemplate.id);

      if (error) throw error;

      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setDeleteTemplate(null);
    }
  };

  const handleSetDefault = async (template: CoverTemplate) => {
    try {
      // Unset all defaults
      await supabase
        .from("cover_templates")
        .update({ is_default: false })
        .eq("user_id", userId);

      // Set new default
      const { error } = await supabase
        .from("cover_templates")
        .update({ is_default: true })
        .eq("id", template.id);

      if (error) throw error;

      toast.success(`"${template.template_name}" set as default`);
      fetchTemplates();
    } catch (error) {
      console.error("Error setting default:", error);
      toast.error("Failed to set default template");
    }
  };

  const handleDuplicateTemplate = async (template: CoverTemplate) => {
    try {
      const { error } = await supabase.from("cover_templates").insert({
        user_id: userId,
        template_name: `${template.template_name} (Copy)`,
        content: template.content,
        is_default: false,
      });

      if (error) throw error;

      toast.success("Template duplicated");
      fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  const getJobTypeFromName = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("tech") || lowerName.includes("developer") || lowerName.includes("engineer")) {
      return "technical";
    }
    if (lowerName.includes("creative") || lowerName.includes("design")) {
      return "creative";
    }
    if (lowerName.includes("marketing") || lowerName.includes("sales")) {
      return "marketing";
    }
    if (lowerName.includes("manager") || lowerName.includes("lead")) {
      return "management";
    }
    if (lowerName.includes("operations") || lowerName.includes("ops")) {
      return "operations";
    }
    if (lowerName.includes("business") || lowerName.includes("analyst")) {
      return "business";
    }
    return "general";
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Cover Letter Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create templates for different job types to speed up applications
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create New Template"}
              </DialogTitle>
              <DialogDescription>
                Create a reusable cover letter template for your job applications
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Technical Roles, Creative Positions, General"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-content">Template Content</Label>
                <Textarea
                  id="template-content"
                  placeholder="Write your cover letter template..."
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground whitespace-pre-line">
                  {TEMPLATE_PLACEHOLDERS}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="is-default">Set as Default</Label>
                  <p className="text-xs text-muted-foreground">
                    Use this template by default when applying to jobs
                  </p>
                </div>
                <Switch
                  id="is-default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingTemplate ? "Update Template" : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-medium mb-2">No templates yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first cover letter template to speed up applications
          </p>
          <Button onClick={() => handleOpenDialog()} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const jobType = getJobTypeFromName(template.template_name);
            return (
              <Card
                key={template.id}
                className={`p-4 transition-all hover:shadow-md ${
                  template.is_default ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {JOB_TYPE_ICONS[jobType] || <FileText className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{template.template_name}</h4>
                        {template.is_default && (
                          <Badge className="bg-primary/20 text-primary text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {template.content.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(template)}
                    className="gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </Button>
                  {!template.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(template)}
                      className="gap-1"
                    >
                      <Star className="h-3 w-3" />
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTemplate(template)}
                    className="gap-1 text-destructive hover:text-destructive ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.template_name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CoverLetterTemplates;