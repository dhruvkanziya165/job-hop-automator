import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Linkedin, Mail, Clock } from "lucide-react";
import { LinkedInConnector } from "@/components/networking/LinkedInConnector";
import { RecruiterOutreach } from "@/components/networking/RecruiterOutreach";
import { FollowUpManager } from "@/components/networking/FollowUpManager";

const NetworkingAssistant = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Networking Assistant
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered outreach for LinkedIn connections, recruiter emails, and automated follow-ups
          </p>
        </div>

        <Tabs defaultValue="linkedin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="linkedin" className="flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Outreach
            </TabsTrigger>
            <TabsTrigger value="followups" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Follow-ups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="linkedin">
            <LinkedInConnector />
          </TabsContent>

          <TabsContent value="email">
            <RecruiterOutreach />
          </TabsContent>

          <TabsContent value="followups">
            <FollowUpManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default NetworkingAssistant;
