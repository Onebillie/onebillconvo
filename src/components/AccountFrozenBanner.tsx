import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export const AccountFrozenBanner = () => {
  const { subscriptionState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [outstandingInvoice, setOutstandingInvoice] = useState<any>(null);

  useEffect(() => {
    if (subscriptionState.isFrozen) {
      fetchOutstandingInvoice();
    }
  }, [subscriptionState.isFrozen]);

  const fetchOutstandingInvoice = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-outstanding-invoice");
      
      if (error) throw error;
      
      if (data?.hasOutstanding) {
        setOutstandingInvoice(data);
      }
    } catch (error: any) {
      console.error("Error fetching outstanding invoice:", error);
    }
  };

  if (!subscriptionState.isFrozen) return null;

  const handleUpdatePayment = async () => {
    setLoading(true);
    try {
      // If we have a direct invoice URL, use that
      if (outstandingInvoice?.invoiceUrl) {
        window.open(outstandingInvoice.invoiceUrl, "_blank");
        setLoading(false);
        return;
      }

      // Otherwise, open customer portal
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background border-b">
      <Alert variant="destructive" className="max-w-4xl mx-auto">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">Account Suspended</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
          <div className="space-y-1">
            <p>
              Your account has been suspended due to a payment issue.
              {outstandingInvoice && (
                <>
                  {" "}Amount due: <strong>{formatCurrency(outstandingInvoice.amountDue, outstandingInvoice.currency)}</strong>
                  {outstandingInvoice.dueDate && (
                    <> (Due: {formatDate(outstandingInvoice.dueDate)})</>
                  )}
                </>
              )}
            </p>
            <p className="text-sm">
              Please update your payment method to restore access.
            </p>
          </div>
          <Button
            onClick={handleUpdatePayment}
            disabled={loading}
            variant="outline"
            className="shrink-0"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {outstandingInvoice ? "Pay Now" : "Update Payment"}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
