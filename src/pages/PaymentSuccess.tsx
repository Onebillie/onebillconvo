import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSubscription } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      // Give Stripe webhook time to process
      setTimeout(async () => {
        await checkSubscription();
        setLoading(false);
      }, 2000);
    } else {
      setLoading(false);
    }
  }, [searchParams, checkSubscription]);

  const handleContinue = () => {
    // Retrieve signup data if exists
    const signupData = sessionStorage.getItem("signupData");
    if (signupData) {
      // User came from signup flow, go back to complete account creation
      navigate("/signup");
    } else {
      // Go to onboarding
      navigate("/app/onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <CardTitle>Processing Payment...</CardTitle>
              <CardDescription>Please wait while we confirm your payment</CardDescription>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600 dark:text-green-500" />
              </div>
              <CardTitle>Payment Successful!</CardTitle>
              <CardDescription>Your subscription is now active</CardDescription>
            </div>
          )}
        </CardHeader>
        {!loading && (
          <CardContent>
            <Button onClick={handleContinue} className="w-full">
              Continue to Account Setup
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
