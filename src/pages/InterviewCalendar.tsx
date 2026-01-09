import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { InterviewScheduler } from "@/components/dashboard/InterviewScheduler";

const InterviewCalendar = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Interview Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage your job interviews with automated reminders
          </p>
        </div>
        
        <InterviewScheduler />
      </div>
    </DashboardLayout>
  );
};

export default InterviewCalendar;
