import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSubscription } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");

      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        console.log('Verifying payment session:', sessionId);
        const { data, error } = await supabase.functions.invoke('verify-payment-session', {
          body: { session_id: sessionId }
        });

        if (error) throw error;

        console.log('Payment verification:', data);

        if (data.success && data.subscriptionActive) {
          // Refresh subscription state
          await checkSubscription();
          toast({
            title: "Payment Successful",
            description: `Your ${data.tier} subscription is now active!`,
          });
        } else if (data.status === 'processing') {
          // Poll again after a delay
          setTimeout(verifyPayment, 3000);
          return;
        } else {
          toast({
            title: "Payment Issue",
            description: "Your payment is being processed. Please check back shortly.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        toast({
          title: "Verification Error",
          description: "Could not verify payment status. Please contact support.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, checkSubscription]);

  const handleContinue = () => {
    // Payment successful, redirect to onboarding
    navigate("/app/onboarding");
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
              Continue to Dashboard
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
