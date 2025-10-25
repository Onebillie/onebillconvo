import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Phone, TrendingUp, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STRIPE_PRODUCTS, VOICE_OVERAGE_PRICING } from "@/lib/stripeConfig";
import { useNavigate } from "react-router-dom";
import { VoiceCreditBundleDialog } from "./VoiceCreditBundleDialog";

export function VoiceUsageDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [voiceData, setVoiceData] = useState({
    creditBalance: 0,
    minutesUsed: 0,
    includedMinutes: 0,
    tier: 'free' as keyof typeof STRIPE_PRODUCTS,
    inboundUsed: 0,
    outboundUsed: 0,
    totalCostCents: 0,
  });
  const [showCreditDialog, setShowCreditDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVoiceUsage();
    }
  }, [user]);

  const fetchVoiceUsage = async () => {
    try {
      // Get business data
      const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id, businesses(voice_credit_balance, voice_minutes_used_period, subscription_tier)')
        .eq('user_id', user?.id)
        .single();

      if (businessUser?.businesses) {
        const tier = businessUser.businesses.subscription_tier || 'free';
        const tierLimits = STRIPE_PRODUCTS[tier as keyof typeof STRIPE_PRODUCTS]?.limits;

        // Get current period usage
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { data: usage } = await supabase
          .from('voice_call_usage')
          .select('*')
          .eq('business_id', businessUser.business_id)
          .gte('period_start', periodStart.toISOString())
          .lte('period_end', periodEnd.toISOString());

        const totals = usage?.reduce((acc, record) => ({
          inbound: acc.inbound + (record.inbound_minutes_local || 0) + (record.inbound_minutes_tollfree || 0),
          outbound: acc.outbound + (record.outbound_minutes_local || 0) + (record.outbound_minutes_tollfree || 0),
          cost: acc.cost + (record.total_cost_cents || 0),
        }), { inbound: 0, outbound: 0, cost: 0 }) || { inbound: 0, outbound: 0, cost: 0 };

        setVoiceData({
          creditBalance: businessUser.businesses.voice_credit_balance || 0,
          minutesUsed: businessUser.businesses.voice_minutes_used_period || 0,
          includedMinutes: (tierLimits?.voiceInboundMinutes || 0) + (tierLimits?.voiceOutboundMinutes || 0),
          tier: tier as keyof typeof STRIPE_PRODUCTS,
          inboundUsed: totals.inbound,
          outboundUsed: totals.outbound,
          totalCostCents: totals.cost,
        });
      }
    } catch (error) {
      console.error('Error fetching voice usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const percentageUsed = voiceData.includedMinutes > 0 
    ? Math.round((voiceData.minutesUsed / voiceData.includedMinutes) * 100) 
    : 0;

  const isNearLimit = percentageUsed >= 80;
  const remainingMinutes = Math.max(0, voiceData.includedMinutes - voiceData.minutesUsed);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Voice Calling Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Voice Calling Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Minutes Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plan Minutes</span>
              <span className="font-medium">
                {voiceData.minutesUsed} / {voiceData.includedMinutes} min
              </span>
            </div>
            <Progress value={percentageUsed} className="h-2" />
            {isNearLimit && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                You've used {percentageUsed}% of your included minutes
              </p>
            )}
          </div>

          {/* Voice Credit Balance */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Voice Credits</span>
            </div>
            <Badge variant={voiceData.creditBalance > 50 ? "default" : "destructive"}>
              {voiceData.creditBalance} min
            </Badge>
          </div>

          {/* Usage Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">This Period</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Inbound</p>
                <p className="text-lg font-semibold">{Math.round(voiceData.inboundUsed)} min</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Outbound</p>
                <p className="text-lg font-semibold">{Math.round(voiceData.outboundUsed)} min</p>
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          {voiceData.totalCostCents > 0 && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Overage Charges</span>
              </div>
              <span className="font-semibold">
                ${(voiceData.totalCostCents / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isNearLimit && (
              <Button
                onClick={() => navigate('/pricing')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
            <Button
              onClick={() => setShowCreditDialog(true)}
              variant={voiceData.creditBalance < 50 ? "default" : "outline"}
              size="sm"
              className="flex-1"
            >
              Buy Credits
            </Button>
          </div>
        </CardContent>
      </Card>

      <VoiceCreditBundleDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
      />
    </>
  );
}
