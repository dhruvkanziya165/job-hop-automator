import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Copy, Sparkles, Check, Lightbulb, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const RecruiterOutreach = () => {
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [generatedBody, setGeneratedBody] = useState("");
  const [tips, setTips] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);

  const generateEmail = async () => {
    if (!contactName || !contactCompany) {
      toast.error("Please enter contact name and company");
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
          targetRoles: prefs?.target_roles || [],
          experience: `${prefs?.target_roles?.join(', ')} professional`
        };
      }

      const { data, error } = await supabase.functions.invoke('generate-networking-message', {
        body: {
          messageType: 'email_initial',
          contactName,
          contactTitle,
          contactCompany,
          jobTitle,
          jobDescription,
          userProfile
        }
      });

      if (error) throw error;

      setGeneratedSubject(data.subject || "");
      setGeneratedBody(data.body || "");
      setTips(data.tips || []);
      toast.success("Email generated!");
    } catch (error: any) {
      console.error("Error generating email:", error);
      toast.error(error.message || "Failed to generate email");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (type: 'subject' | 'body') => {
    const text = type === 'subject' ? generatedSubject : generatedBody;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(`${type === 'subject' ? 'Subject' : 'Body'} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveAndSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save and schedule");
        return;
      }

      // Save contact
      const { data: contact, error: contactError } = await supabase
        .from('networking_contacts')
        .insert({
          user_id: user.id,
          name: contactName,
          title: contactTitle,
          company: contactCompany,
          email: contactEmail,
          contact_type: 'recruiter'
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Save message
      const { data: message, error: messageError } = await supabase
        .from('outreach_messages')
        .insert({
          user_id: user.id,
          contact_id: contact.id,
          message_type: 'email_initial',
          subject: generatedSubject,
          content: generatedBody,
          status: 'draft'
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Schedule follow-ups (3, 7, 14 days)
      const followUpDays = [3, 7, 14];
      const followUps = followUpDays.map((days, index) => ({
        user_id: user.id,
        contact_id: contact.id,
        message_id: message.id,
        scheduled_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        follow_up_number: index + 1,
        status: 'pending'
      }));

      const { error: followUpError } = await supabase
        .from('follow_up_schedules')
        .insert(followUps);

      if (followUpError) throw followUpError;

      toast.success("Saved with 3 follow-ups scheduled!");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Failed to save");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Cold Email Generator
          </CardTitle>
          <CardDescription>
            Create compelling cold emails to recruiters and hiring managers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recruiterName">Contact Name *</Label>
              <Input
                id="recruiterName"
                placeholder="e.g., John Smith"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recruiterTitle">Title</Label>
              <Input
                id="recruiterTitle"
                placeholder="e.g., Tech Recruiter"
                value={contactTitle}
                onChange={(e) => setContactTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                placeholder="e.g., Amazon"
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="recruiter@company.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetJob">Target Job Title</Label>
            <Input
              id="targetJob"
              placeholder="e.g., Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDesc">Job Description (Optional)</Label>
            <Textarea
              id="jobDesc"
              placeholder="Paste the job description for more personalized emails..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <Button 
            onClick={generateEmail} 
            disabled={isGenerating}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Cold Email"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Email</CardTitle>
          <CardDescription>
            Review, edit, and send your personalized email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generatedSubject || generatedBody ? (
            <>
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <div className="relative">
                  <Input
                    value={generatedSubject}
                    onChange={(e) => setGeneratedSubject(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 h-full"
                    onClick={() => copyToClipboard('subject')}
                  >
                    {copied === 'subject' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Body</Label>
                <div className="relative">
                  <Textarea
                    value={generatedBody}
                    onChange={(e) => setGeneratedBody(e.target.value)}
                    className="min-h-[200px] pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard('body')}
                  >
                    {copied === 'body' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveAndSchedule} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Save & Schedule Follow-ups
                </Button>
              </div>

              {tips.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Sending Tips
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
              <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Fill in the contact details and click "Generate Cold Email" to create a personalized outreach email
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
