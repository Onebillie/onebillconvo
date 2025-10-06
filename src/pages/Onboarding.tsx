import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { id: 1, title: "Welcome", description: "Get started with your account" },
  { id: 2, title: "Choose Plan", description: "Select your subscription" },
  { id: 3, title: "Connect WhatsApp", description: "Link your WhatsApp Business" },
  { id: 4, title: "Connect Email", description: "Set up email integration" },
  { id: 5, title: "Complete", description: "You're all set!" },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user, checkSubscription, subscriptionState, currentBusinessId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if user is authenticated but not loaded yet
    if (authLoading) return;
    
    // If coming back from Stripe checkout
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      checkSubscription();
      toast({
        title: "Payment successful!",
        description: "Your subscription is now active",
      });
    }
    
    // If user is not authenticated after loading, redirect to signup
    // BUT give a grace period for session to establish (2 seconds)
    if (!user) {
      const timer = setTimeout(() => {
        if (!user) {
          navigate("/signup", { replace: true });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, authLoading, user, navigate]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Mark onboarding as complete
      if (currentBusinessId) {
        await supabase
          .from("businesses")
          .update({ onboarding_completed: true })
          .eq("id", currentBusinessId);
      }

      toast({
        title: "Welcome aboard!",
        description: "Your account is ready to use",
      });

      navigate("/app/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl">
                {STEPS[currentStep - 1].title}
              </CardTitle>
              <CardDescription>
                {STEPS[currentStep - 1].description}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Welcome to your dashboard!</h3>
              <p className="text-muted-foreground">
                Let's get your account set up in just a few steps. This will only take a few minutes.
              </p>
              <ul className="space-y-2">
                {STEPS.slice(1).map((step) => (
                  <li key={step.id} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>{step.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose Your Plan</h3>
              <p className="text-muted-foreground">
                {subscriptionState.subscribed
                  ? "You're already subscribed! You can skip this step."
                  : "Select a plan that fits your business needs."}
              </p>
              {subscriptionState.subscribed && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="font-medium">Current Plan: {subscriptionState.tier}</p>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionState.seatCount} seat(s)
                  </p>
                </div>
              )}
              {!subscriptionState.subscribed && (
                <Button onClick={() => navigate("/pricing")}>
                  View Plans
                </Button>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Connect WhatsApp Business</h3>
              <p className="text-muted-foreground">
                Connect your WhatsApp Business account to start messaging customers.
              </p>
              <Button onClick={() => navigate("/settings?tab=whatsapp-accounts")}>
                Connect WhatsApp
              </Button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Connect Email</h3>
              <p className="text-muted-foreground">
                Set up email integration to manage customer communications.
              </p>
              <Button onClick={() => navigate("/settings?tab=email")}>
                Connect Email
              </Button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">You're All Set!</h3>
              <p className="text-muted-foreground">
                Your account is ready. Start managing your customer conversations now.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {currentStep > 1 && currentStep < STEPS.length && (
              <Button variant="outline" onClick={handleSkip}>
                Skip
              </Button>
            )}
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} className="ml-auto">
                Next
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading} className="ml-auto">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Go to Dashboard"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
