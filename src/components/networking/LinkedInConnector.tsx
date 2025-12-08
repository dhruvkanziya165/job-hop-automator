import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Copy, Sparkles, Check, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const LinkedInConnector = () => {
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [tips, setTips] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateMessage = async () => {
    if (!contactName) {
      toast.error("Please enter the contact's name");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let userProfile = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        userProfile = {
          ...profile,
          skills: prefs?.keywords || [],
          targetRoles: prefs?.target_roles || []
        };
      }

      const { data, error } = await supabase.functions.invoke('generate-networking-message', {
        body: {
          messageType: 'linkedin_connection',
          contactName,
          contactTitle,
          contactCompany,
          jobTitle,
          userProfile
        }
      });

      if (error) throw error;

      setGeneratedMessage(data.message || "");
      setTips(data.tips || []);
      toast.success("Connection message generated!");
    } catch (error: any) {
      console.error("Error generating message:", error);
      toast.error(error.message || "Failed to generate message");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const saveContact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save contacts");
        return;
      }

      const { error } = await supabase.from('networking_contacts').insert({
        user_id: user.id,
        name: contactName,
        title: contactTitle,
        company: contactCompany,
        contact_type: 'recruiter'
      });

      if (error) throw error;
      toast.success("Contact saved!");
    } catch (error: any) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
            LinkedIn Connection Request
          </CardTitle>
          <CardDescription>
            Generate personalized connection requests that get accepted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name *</Label>
            <Input
              id="contactName"
              placeholder="e.g., Sarah Johnson"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactTitle">Title/Role</Label>
            <Input
              id="contactTitle"
              placeholder="e.g., Senior Recruiter, Engineering Manager"
              value={contactTitle}
              onChange={(e) => setContactTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactCompany">Company</Label>
            <Input
              id="contactCompany"
              placeholder="e.g., Google, Microsoft"
              value={contactCompany}
              onChange={(e) => setContactCompany(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle">Related Job (Optional)</Label>
            <Input
              id="jobTitle"
              placeholder="e.g., Frontend Developer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateMessage} 
              disabled={isGenerating}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Message"}
            </Button>
            <Button variant="outline" onClick={saveContact}>
              Save Contact
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Message</CardTitle>
          <CardDescription>
            Copy and paste this into LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generatedMessage ? (
            <>
              <div className="relative">
                <Textarea
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  className="min-h-[120px] pr-12"
                  placeholder="Your personalized message will appear here..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {generatedMessage.length}/300 characters
                </Badge>
                {generatedMessage.length > 300 && (
                  <Badge variant="destructive">Too long</Badge>
                )}
              </div>

              {tips.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Tips for Success
                  </div>
                  <ul className="space-y-1">
                    {tips.map((tip, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Linkedin className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Fill in the contact details and click "Generate Message" to create a personalized connection request
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
