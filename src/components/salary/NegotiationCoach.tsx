import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  MessageSquare,
  Copy,
  CheckCircle2,
  XCircle,
  Mail,
  Lightbulb
} from "lucide-react";

interface NegotiationScript {
  opening_script: string;
  key_points: string[];
  counter_offer_script: string;
  responses_to_objections: Record<string, string>;
  closing_script: string;
  email_template: string;
  dos_and_donts: {
    dos: string[];
    donts: string[];
  };
  timing_tips: string[];
  leverage_points: string[];
}

export const NegotiationCoach = () => {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [currentOffer, setCurrentOffer] = useState("");
  const [desiredSalary, setDesiredSalary] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState<NegotiationScript | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!company || !role || !currentOffer || !desiredSalary) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-negotiation", {
        body: {
          company,
          role,
          currentOffer,
          desiredSalary,
          context,
        },
      });

      if (error) throw error;
      
      if (data.success) {
        setScript(data.data);
        toast.success("Negotiation scripts generated!");
      } else {
        throw new Error(data.error || "Failed to generate scripts");
      }
    } catch (error) {
      console.error("Error generating negotiation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate scripts");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => copyToClipboard(text, field)}
      className="h-8 w-8"
    >
      {copiedField === field ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            AI Negotiation Coach
          </CardTitle>
          <CardDescription>
            Get personalized negotiation scripts and strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Input
                placeholder="e.g., Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Input
                placeholder="e.g., Senior SDE"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Offer *</Label>
              <Input
                placeholder="e.g., 25 LPA"
                value={currentOffer}
                onChange={(e) => setCurrentOffer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Desired Salary *</Label>
              <Input
                placeholder="e.g., 32 LPA"
                value={desiredSalary}
                onChange={(e) => setDesiredSalary(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Context</Label>
            <Textarea
              placeholder="e.g., I have competing offers, 5 years experience at FAANG..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Scripts...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Generate Negotiation Strategy
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {script && (
        <Card className="lg:row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Negotiation Toolkit</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="scripts" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="scripts">Scripts</TabsTrigger>
                <TabsTrigger value="objections">Objections</TabsTrigger>
                <TabsTrigger value="tips">Tips</TabsTrigger>
              </TabsList>

              <TabsContent value="scripts">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {/* Opening Script */}
                    <Card>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Opening Statement</CardTitle>
                          <CopyButton text={script.opening_script} field="opening" />
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm">
                        {script.opening_script}
                      </CardContent>
                    </Card>

                    {/* Counter Offer */}
                    <Card>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Counter Offer Script</CardTitle>
                          <CopyButton text={script.counter_offer_script} field="counter" />
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm">
                        {script.counter_offer_script}
                      </CardContent>
                    </Card>

                    {/* Closing */}
                    <Card>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Closing Statement</CardTitle>
                          <CopyButton text={script.closing_script} field="closing" />
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm">
                        {script.closing_script}
                      </CardContent>
                    </Card>

                    {/* Email Template */}
                    <Card>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Follow-up Email Template
                          </CardTitle>
                          <CopyButton text={script.email_template} field="email" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                          {script.email_template}
                        </pre>
                      </CardContent>
                    </Card>

                    {/* Key Points */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Key Points to Emphasize</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {script.key_points.map((point, idx) => (
                            <li key={idx} className="flex gap-2 text-sm">
                              <span className="text-primary font-bold">{idx + 1}.</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="objections">
                <ScrollArea className="h-[500px] pr-4">
                  <Accordion type="single" collapsible className="space-y-2">
                    {Object.entries(script.responses_to_objections).map(([objection, response], idx) => (
                      <AccordionItem key={idx} value={objection} className="border rounded-lg px-4">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          "{objection.replace(/_/g, " ")}"
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm text-muted-foreground">{response}</p>
                            <CopyButton text={response} field={`objection-${idx}`} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="tips">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {/* Do's and Don'ts */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="border-green-200 dark:border-green-900">
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Do's
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {script.dos_and_donts.dos.map((item, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border-red-200 dark:border-red-900">
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                            <XCircle className="h-4 w-4" />
                            Don'ts
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {script.dos_and_donts.donts.map((item, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Timing Tips */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Timing Tips</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {script.timing_tips.map((tip, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Leverage Points */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Your Leverage Points</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {script.leverage_points.map((point, idx) => (
                            <Badge key={idx} variant="secondary">
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
