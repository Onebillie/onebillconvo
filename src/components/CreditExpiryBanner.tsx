import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreditBundleDialog } from "./CreditBundleDialog";
import { CreditExpiryWarningDialog } from "./CreditExpiryWarningDialog";

export function CreditExpiryBanner() {
  const { user } = useAuth();
  const [creditBalance, setCreditBalance] = useState(0);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchCreditInfo = async () => {
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (businessData?.business_id) {
        const { data: business } = await supabase
          .from('businesses')
          .select('credit_balance, credit_expiry_date')
          .eq('id', businessData.business_id)
          .single();

        if (business) {
          setCreditBalance(business.credit_balance || 0);
          setExpiryDate(business.credit_expiry_date ? new Date(business.credit_expiry_date) : null);
        }
      }
    };

    fetchCreditInfo();

    // Realtime subscription for credit updates
    const channel = supabase
      .channel('credit-expiry-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
        },
        () => {
          fetchCreditInfo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!expiryDate || creditBalance === 0) return null;

  const now = new Date();
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Only show banner if credits expire within 30 days
  if (daysRemaining > 30 || daysRemaining < 0) return null;

  const urgencyLevel = daysRemaining <= 7 ? 'critical' : daysRemaining <= 14 ? 'warning' : 'info';

  return (
    <>
      <Alert
        className={`mb-4 ${
          urgencyLevel === 'critical'
            ? "bg-destructive/10 border-destructive animate-pulse"
            : urgencyLevel === 'warning'
            ? "bg-amber-500/10 border-amber-500"
            : "bg-blue-500/10 border-blue-500"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4" />
            <span>
              {urgencyLevel === 'critical' ? (
                <strong className="text-destructive">⚠️ {creditBalance.toLocaleString()} credits expire in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}!</strong>
              ) : (
                <><strong>{creditBalance.toLocaleString()} credits</strong> expire on {expiryDate.toLocaleDateString()} ({daysRemaining} days)</>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowWarningDialog(true)}
            >
              Details
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreditDialog(true)}
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Buy More
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <CreditBundleDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
      />

      <CreditExpiryWarningDialog
        open={showWarningDialog}
        onOpenChange={setShowWarningDialog}
        creditsExpiring={creditBalance}
        expiryDate={expiryDate}
        daysRemaining={daysRemaining}
        onPurchaseMore={() => {
          setShowWarningDialog(false);
          setShowCreditDialog(true);
        }}
        onUseCredits={() => {
          setShowWarningDialog(false);
        }}
      />
    </>
  );
}
