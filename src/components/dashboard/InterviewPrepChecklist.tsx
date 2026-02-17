import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ClipboardList,
} from "lucide-react";

interface InterviewPrepButtonProps {
  interviewId: string;
  jobTitle: string;
  company: string;
}

interface PrepData {
  companyResearch: {
    overview: string;
    culture: string;
    recentNews: string[];
    keyProducts: string[];
    competitors: string[];
  };
  commonQuestions: Array<{
    question: string;
    tip: string;
    category: string;
  }>;
  talkingPoints: Array<{
    point: string;
    context: string;
  }>;
  checklist: Array<{
    item: string;
    priority: string;
  }>;
  dosDonts: {
    dos: string[];
    donts: string[];
  };
}

export const InterviewPrepChecklist = ({ interviewId, jobTitle, company }: InterviewPrepButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [prepData, setPrepData] = useState<PrepData | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-interview-prep", {
        body: { interviewId },
      });
      if (error) throw error;
      if (data?.preparation) {
        setPrepData(data.preparation);
      }
    } catch {
      toast.error("Failed to generate preparation checklist");
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const completedCount = checkedItems.size;
  const totalItems = prepData?.checklist?.length || 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive/10 text-destructive";
      case "medium": return "bg-amber-500/10 text-amber-600";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "behavioral": return MessageSquare;
      case "technical": return BookOpen;
      case "situational": return Lightbulb;
      default: return HelpCircle;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            setOpen(true);
            if (!prepData) handleGenerate();
          }}
        >
          <ClipboardList className="h-3 w-3 mr-1" />
          Prep
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Interview Prep: {jobTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            <Building2 className="h-3 w-3 inline mr-1" />
            {company}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Generating personalized preparation checklist...
            </p>
          </div>
        ) : prepData ? (
          <div className="space-y-4 mt-2">
            {/* Progress */}
            {totalItems > 0 && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Preparation Progress</span>
                    <span>{completedCount}/{totalItems} complete</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${totalItems > 0 ? (completedCount / totalItems) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <Accordion type="multiple" defaultValue={["research", "checklist", "questions"]} className="space-y-2">
              {/* Company Research */}
              <AccordionItem value="research" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Company Research
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-4">
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Overview</h5>
                    <p className="text-sm">{prepData.companyResearch.overview}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Culture</h5>
                    <p className="text-sm">{prepData.companyResearch.culture}</p>
                  </div>
                  {prepData.companyResearch.recentNews?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Recent News</h5>
                      <ul className="list-disc list-inside text-sm space-y-0.5">
                        {prepData.companyResearch.recentNews.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {prepData.companyResearch.keyProducts?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Key Products</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {prepData.companyResearch.keyProducts.map((p, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {prepData.companyResearch.competitors?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Competitors</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {prepData.companyResearch.competitors.map((c, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Preparation Checklist */}
              <AccordionItem value="checklist" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Preparation Checklist
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pb-4">
                  {prepData.checklist?.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        checkedItems.has(i) ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={checkedItems.has(i)}
                        onCheckedChange={() => toggleCheck(i)}
                      />
                      <span className={`text-sm flex-1 ${checkedItems.has(i) ? "line-through text-muted-foreground" : ""}`}>
                        {item.item}
                      </span>
                      <Badge className={`text-[10px] ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </Badge>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Common Questions */}
              <AccordionItem value="questions" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    Common Questions ({prepData.commonQuestions?.length || 0})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-4">
                  {prepData.commonQuestions?.map((q, i) => {
                    const CatIcon = getCategoryIcon(q.category);
                    return (
                      <div key={i} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start gap-2">
                          <CatIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm font-medium">{q.question}</p>
                        </div>
                        <div className="ml-6 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                          <span>{q.tip}</span>
                        </div>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>

              {/* Talking Points */}
              <AccordionItem value="talking" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Talking Points
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pb-4">
                  {prepData.talkingPoints?.map((tp, i) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <p className="text-sm font-medium">{tp.point}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        📌 {tp.context}
                      </p>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Do's and Don'ts */}
              <AccordionItem value="dosdonts" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-primary" />
                    Do's & Don'ts
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold uppercase flex items-center gap-1 text-primary">
                        <ThumbsUp className="h-3 w-3" /> Do's
                      </h5>
                      {prepData.dosDonts?.dos?.map((d, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary shrink-0">✓</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-destructive uppercase flex items-center gap-1">
                        <ThumbsDown className="h-3 w-3" /> Don'ts
                      </h5>
                      {prepData.dosDonts?.donts?.map((d, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-destructive shrink-0">✗</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Regenerate Checklist
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to generate prep. Click below to retry.</p>
            <Button className="mt-4" onClick={handleGenerate}>
              Generate Checklist
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
