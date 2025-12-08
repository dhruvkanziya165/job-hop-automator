import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Check, X, Sparkles, Send, Calendar, User, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";

interface FollowUp {
  id: string;
  scheduled_date: string;
  follow_up_number: number;
  status: string;
  contact: {
    id: string;
    name: string;
    company: string;
    title: string;
    email: string;
  };
  message: {
    id: string;
    subject: string;
    content: string;
  };
}

export const FollowUpManager = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedFollowUp, setGeneratedFollowUp] = useState<{ id: string; content: string } | null>(null);

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('follow_up_schedules')
        .select(`
          id,
          scheduled_date,
          follow_up_number,
          status,
          contact:networking_contacts(id, name, company, title, email),
          message:outreach_messages(id, subject, content)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setFollowUps((data || []) as unknown as FollowUp[]);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFollowUpMessage = async (followUp: FollowUp) => {
    setGeneratingFor(followUp.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-networking-message', {
        body: {
          messageType: 'email_followup',
          contactName: followUp.contact.name,
          contactTitle: followUp.contact.title,
          contactCompany: followUp.contact.company,
          followUpNumber: followUp.follow_up_number
        }
      });

      if (error) throw error;

      setGeneratedFollowUp({
        id: followUp.id,
        content: `Subject: ${data.subject}\n\n${data.body}`
      });
      toast.success("Follow-up generated!");
    } catch (error: any) {
      console.error("Error generating follow-up:", error);
      toast.error("Failed to generate follow-up");
    } finally {
      setGeneratingFor(null);
    }
  };

  const markAsSent = async (followUpId: string) => {
    try {
      const { error } = await supabase
        .from('follow_up_schedules')
        .update({ status: 'sent' })
        .eq('id', followUpId);

      if (error) throw error;

      setFollowUps(prev => prev.filter(f => f.id !== followUpId));
      setGeneratedFollowUp(null);
      toast.success("Marked as sent!");
    } catch (error) {
      console.error("Error updating follow-up:", error);
      toast.error("Failed to update");
    }
  };

  const cancelFollowUp = async (followUpId: string) => {
    try {
      const { error } = await supabase
        .from('follow_up_schedules')
        .update({ status: 'cancelled' })
        .eq('id', followUpId);

      if (error) throw error;

      setFollowUps(prev => prev.filter(f => f.id !== followUpId));
      toast.success("Follow-up cancelled");
    } catch (error) {
      console.error("Error cancelling follow-up:", error);
      toast.error("Failed to cancel");
    }
  };

  const getStatusBadge = (scheduledDate: string) => {
    const date = new Date(scheduledDate);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-yellow-500">Today</Badge>;
    }
    return <Badge variant="secondary">{formatDistanceToNow(date, { addSuffix: true })}</Badge>;
  };

  const todayFollowUps = followUps.filter(f => isToday(new Date(f.scheduled_date)) || isPast(new Date(f.scheduled_date)));
  const upcomingFollowUps = followUps.filter(f => !isToday(new Date(f.scheduled_date)) && !isPast(new Date(f.scheduled_date)));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today/Overdue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-yellow-500" />
            Today's Follow-ups
          </CardTitle>
          <CardDescription>
            {todayFollowUps.length > 0 
              ? `${todayFollowUps.length} follow-up${todayFollowUps.length > 1 ? 's' : ''} due today`
              : "No follow-ups due today"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayFollowUps.length > 0 ? (
            <div className="space-y-4">
              {todayFollowUps.map((followUp) => (
                <div key={followUp.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{followUp.contact.name}</span>
                        {getStatusBadge(followUp.scheduled_date)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        {followUp.contact.company}
                        {followUp.contact.title && ` • ${followUp.contact.title}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Follow-up #{followUp.follow_up_number} • Original: "{followUp.message?.subject}"
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateFollowUpMessage(followUp)}
                        disabled={generatingFor === followUp.id}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {generatingFor === followUp.id ? "..." : "Generate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelFollowUp(followUp.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {generatedFollowUp?.id === followUp.id && (
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        value={generatedFollowUp.content}
                        onChange={(e) => setGeneratedFollowUp({ ...generatedFollowUp, content: e.target.value })}
                        className="min-h-[120px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => markAsSent(followUp.id)}>
                          <Send className="h-4 w-4 mr-1" />
                          Mark as Sent
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(generatedFollowUp.content)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>All caught up! No follow-ups due today.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming Follow-ups
          </CardTitle>
          <CardDescription>
            {upcomingFollowUps.length} scheduled follow-up{upcomingFollowUps.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingFollowUps.length > 0 ? (
            <div className="space-y-3">
              {upcomingFollowUps.slice(0, 10).map((followUp) => (
                <div 
                  key={followUp.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{followUp.contact.name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{followUp.contact.company}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Follow-up #{followUp.follow_up_number} • {format(new Date(followUp.scheduled_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(followUp.scheduled_date)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelFollowUp(followUp.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p>No upcoming follow-ups scheduled.</p>
              <p className="text-sm">Send some cold emails to start building your pipeline!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
