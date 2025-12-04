import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalaryEstimator } from "@/components/salary/SalaryEstimator";
import { OfferComparison } from "@/components/salary/OfferComparison";
import { NegotiationCoach } from "@/components/salary/NegotiationCoach";
import { 
  TrendingUp, 
  Scale, 
  MessageSquare 
} from "lucide-react";

const SalaryInsights = () => {
  const [activeTab, setActiveTab] = useState("estimate");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Salary Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered salary estimates, offer comparison, and negotiation coaching
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="estimate" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Estimate</span>
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger value="negotiate" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Negotiate</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estimate" className="space-y-6">
            <SalaryEstimator />
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <OfferComparison />
          </TabsContent>

          <TabsContent value="negotiate" className="space-y-6">
            <NegotiationCoach />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SalaryInsights;
