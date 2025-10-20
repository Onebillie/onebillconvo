import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PRODUCTS, SubscriptionTier } from "@/lib/stripeConfig";
import { useNavigate } from "react-router-dom";
import { BillingHistory } from "./BillingHistory";
import { CreditBundleDialog } from "@/components/CreditBundleDialog";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";

export const SubscriptionSettings = () => {
  const { subscriptionState, checkSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const navigate = useNavigate();

  const handleManageSubscription = async () => {
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
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setLoading(true);
    try {
      await checkSubscription();
      toast({
        title: "Success",
        description: "Subscription status refreshed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = STRIPE_PRODUCTS[subscriptionState.tier];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
                <Badge variant={subscriptionState.subscribed ? "default" : "secondary"}>
                  {subscriptionState.subscribed ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                ${currentPlan.price}/{currentPlan.interval} per seat
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${currentPlan.price * subscriptionState.seatCount}
              </div>
              <p className="text-sm text-muted-foreground">per {currentPlan.interval}</p>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Team Seats</p>
                <p className="text-2xl font-bold">{subscriptionState.seatCount}</p>
              </div>
            </div>

            {subscriptionState.subscriptionEnd && (
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Next Billing Date</p>
                  <p className="text-sm">
                    {new Date(subscriptionState.subscriptionEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <CreditCard className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Billing Status</p>
                <Badge variant={subscriptionState.isFrozen ? "destructive" : "default"}>
                  {subscriptionState.isFrozen ? "Payment Failed" : "Active"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleManageSubscription}
              disabled={loading || !subscriptionState.subscribed}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Subscription
                </>
              )}
            </Button>

            {!subscriptionState.subscribed && (
              <Button onClick={() => navigate("/pricing")}>
                View Plans
              </Button>
            )}

            <Button variant="outline" onClick={handleRefreshStatus} disabled={loading}>
              Refresh Status
            </Button>

            <Button variant="outline" onClick={() => setShowCreditDialog(true)}>
              Purchase Credits
            </Button>

            <Button variant="outline" onClick={() => setShowUpgradeDialog(true)}>
              Upgrade Plan
            </Button>
          </div>

          {/* Plan Features */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Plan Features</h4>
            <ul className="space-y-2">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <BillingHistory />

      <CreditBundleDialog open={showCreditDialog} onOpenChange={setShowCreditDialog} />
      <UpgradeDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog} 
        currentTier={subscriptionState.tier as SubscriptionTier} 
      />
    </div>
  );
};
