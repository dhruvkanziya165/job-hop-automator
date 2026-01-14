import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  CheckCircle,
  Loader2,
  Star,
  StarOff
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Resume {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  role_type: string | null;
  is_default: boolean | null;
  created_at: string;
}

interface ResumeUploadProps {
  userId: string;
  resumes: Resume[];
  onResumesChange: () => void;
}

const ResumeUpload = ({ userId, resumes, onResumesChange }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File) => {
    if (!file.type.includes("pdf") && !file.type.includes("document")) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const isFirstResume = resumes.length === 0;

      const { error: dbError } = await supabase.from("resumes").insert({
        user_id: userId,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        is_default: isFirstResume,
      });

      if (dbError) throw dbError;

      toast.success("Resume uploaded successfully!");
      onResumesChange();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await uploadFile(files[0]);
      }
    },
    [userId, resumes.length]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
    e.target.value = "";
  };

  const handleDelete = async (resume: Resume) => {
    setDeletingId(resume.id);
    try {
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .remove([resume.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resume.id);

      if (dbError) throw dbError;

      toast.success("Resume deleted");
      onResumesChange();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete resume");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (resumeId: string) => {
    try {
      // Remove default from all resumes
      await supabase
        .from("resumes")
        .update({ is_default: false })
        .eq("user_id", userId);

      // Set new default
      await supabase
        .from("resumes")
        .update({ is_default: true })
        .eq("id", resumeId);

      toast.success("Default resume updated");
      onResumesChange();
    } catch (error: any) {
      toast.error("Failed to update default resume");
    }
  };

  const handleDownload = async (resume: Resume) => {
    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(resume.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = resume.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download resume");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          id="resume-upload"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <label htmlFor="resume-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            {uploading ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <p className="text-lg font-medium">
                {uploading ? "Uploading..." : "Drop your resume here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse (PDF, DOC, DOCX - max 5MB)
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Resume List */}
      {resumes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Your Resumes</h3>
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className={cn(
                "p-4 flex items-center justify-between gap-4",
                resume.is_default && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{resume.file_name}</p>
                    {resume.is_default && (
                      <Badge variant="secondary" className="shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(resume.file_size)} •{" "}
                    {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSetDefault(resume.id)}
                  disabled={resume.is_default || false}
                  title={resume.is_default ? "Already default" : "Set as default"}
                >
                  {resume.is_default ? (
                    <Star className="h-4 w-4 text-warning fill-warning" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(resume)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(resume)}
                  disabled={deletingId === resume.id}
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  {deletingId === resume.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
