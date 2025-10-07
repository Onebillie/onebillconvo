import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PRODUCTS, type SubscriptionTier } from "@/lib/stripeConfig";
import { useNavigate } from "react-router-dom";
import { CreditBundleDialog } from "./CreditBundleDialog";

export function LimitReachedBanner() {
  const { user, subscriptionState } = useAuth();
  const [messageCount, setMessageCount] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchUsage = async () => {
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (businessData?.business_id) {
        const { data: business } = await supabase
          .from('businesses')
          .select('message_count_current_period, credit_balance')
          .eq('id', businessData.business_id)
          .single();

        if (business) {
          setMessageCount(business.message_count_current_period || 0);
          setCreditBalance(business.credit_balance || 0);
        }
      }
    };

    fetchUsage();

    // Realtime subscription for usage updates
    const channel = supabase
      .channel('business-usage')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
        },
        () => {
          fetchUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const currentTier = (subscriptionState.tier || 'free') as SubscriptionTier;
  const messageLimit = STRIPE_PRODUCTS[currentTier]?.limits.whatsappSending || 0;
  const percentageUsed = messageLimit > 0 ? (messageCount / messageLimit) * 100 : 0;

  // Only show if approaching or at limit (80%+) and no credits available
  if (percentageUsed < 80 || creditBalance > 0) return null;

  const isAtLimit = messageCount >= messageLimit;

  return (
    <>
      <Alert
        className={`mb-4 ${
          isAtLimit
            ? "bg-destructive/10 border-destructive"
            : "bg-amber-500/10 border-amber-500"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            {isAtLimit ? (
              <>
                <strong>Message limit reached!</strong> You've used {messageCount}/{messageLimit} messages this month.
              </>
            ) : (
              <>
                <strong>Approaching limit:</strong> {messageCount}/{messageLimit} messages used ({percentageUsed.toFixed(0)}%)
              </>
            )}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreditDialog(true)}
            >
              <Zap className="w-4 h-4 mr-1" />
              Buy Credits
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/pricing")}
            >
              Upgrade Plan
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <CreditBundleDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
      />
    </>
  );
}
