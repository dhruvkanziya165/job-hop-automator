import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Briefcase, 
  CheckCircle, 
  Zap, 
  Shield,
  ArrowRight,
  Bot,
  Clock,
  Target
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bot,
      title: "AI-Powered Matching",
      description: "Advanced algorithms find jobs that perfectly match your skills and preferences"
    },
    {
      icon: Zap,
      title: "Auto-Apply",
      description: "Automatically submit applications to matching jobs with your pre-filled data"
    },
    {
      icon: Clock,
      title: "Daily Job Discovery",
      description: "Wake up to new opportunities - our system searches 24/7 across multiple platforms"
    },
    {
      icon: Target,
      title: "Smart Filtering",
      description: "Set your criteria once and let the system filter thousands of jobs for you"
    },
    {
      icon: CheckCircle,
      title: "Application Tracking",
      description: "Monitor all your applications in one place with real-time status updates"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and secure. You control what gets shared"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-primary mb-4 shadow-hover">
            <Briefcase className="h-10 w-10 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Your Personal{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Job Application
            </span>
            {" "}Agent
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop spending hours applying to jobs. Let our AI-powered agent find and apply to 
            perfect opportunities while you focus on interview prep.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 transition-opacity text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Setup in 2 minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Set up your profile once, and let our automation handle the rest
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <Card 
              key={idx} 
              className="p-6 shadow-card hover:shadow-hover transition-all hover:-translate-y-1"
            >
              <div className={`h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4`}>
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="p-12 bg-gradient-primary text-white text-center shadow-hover">
          <h2 className="text-3xl font-bold mb-4">Ready to Automate Your Job Search?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of job seekers who've automated their applications
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8"
            onClick={() => navigate("/auth")}
          >
            Start Applying Automatically
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 JobAgent Pro. Automate your career growth.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;