import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export const AccountFrozenBanner = () => {
  const { subscriptionState } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!subscriptionState.isFrozen) return null;

  const handleUpdatePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open payment portal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background border-b">
      <Alert variant="destructive" className="max-w-4xl mx-auto">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">Account Suspended</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4 mt-2">
          <span>
            Your account has been suspended due to a payment issue. Please update your payment
            method to restore access.
          </span>
          <Button
            onClick={handleUpdatePayment}
            disabled={loading}
            variant="outline"
            className="shrink-0"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Update Payment
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
