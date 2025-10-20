import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Zap, CreditCard, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

const THRESHOLD_OPTIONS = [
  { value: 50, label: "50 credits" },
  { value: 100, label: "100 credits" },
  { value: 200, label: "200 credits" },
  { value: 500, label: "500 credits" },
];

const BUNDLE_OPTIONS = [
  { value: "small", label: "Small (500 credits - $10)", credits: 500, price: 10 },
  { value: "medium", label: "Medium (1,500 credits - $25)", credits: 1500, price: 25 },
  { value: "large", label: "Large (5,000 credits - $75)", credits: 5000, price: 75 },
];

export function AutoTopUpSettings() {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [thresholdCredits, setThresholdCredits] = useState(100);
  const [bundleSize, setBundleSize] = useState<"small" | "medium" | "large">("small");
  const [lastTopupAt, setLastTopupAt] = useState<string | null>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

  useEffect(() => {
    loadSettings();
    checkPaymentMethod();
  }, [currentBusinessId]);

  const loadSettings = async () => {
    if (!currentBusinessId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("auto_topup_settings")
        .select("*")
        .eq("business_id", currentBusinessId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEnabled(data.enabled);
        setThresholdCredits(data.threshold_credits);
        setBundleSize(data.bundle_size as "small" | "medium" | "large");
        setLastTopupAt(data.last_topup_at);
      }
    } catch (error: any) {
      console.error("Error loading auto topup settings:", error);
      toast({
        title: "Error",
        description: "Failed to load auto top-up settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentMethod = async () => {
    if (!currentBusinessId) return;

    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("stripe_customer_id")
        .eq("id", currentBusinessId)
        .single();

      if (error) throw error;
      
      // This is a simplified check - ideally we'd verify with Stripe
      setHasPaymentMethod(!!data?.stripe_customer_id);
    } catch (error) {
      console.error("Error checking payment method:", error);
    }
  };

  const saveSettings = async () => {
    if (!currentBusinessId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("auto_topup_settings")
        .upsert({
          business_id: currentBusinessId,
          enabled,
          threshold_credits: thresholdCredits,
          bundle_size: bundleSize,
        }, {
          onConflict: "business_id"
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Auto top-up settings updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving auto topup settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Auto Top-Up
          </CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const selectedBundle = BUNDLE_OPTIONS.find(b => b.value === bundleSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Auto Top-Up
        </CardTitle>
        <CardDescription>
          Automatically purchase message credits when your balance runs low
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasPaymentMethod && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please add a payment method before enabling auto top-up. You can add one in the Billing section.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-topup-enabled">Enable Auto Top-Up</Label>
            <p className="text-sm text-muted-foreground">
              Automatically purchase credits when balance is low
            </p>
          </div>
          <Switch
            id="auto-topup-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!hasPaymentMethod}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="threshold">Trigger Threshold</Label>
              <Select
                value={thresholdCredits.toString()}
                onValueChange={(value) => setThresholdCredits(parseInt(value))}
              >
                <SelectTrigger id="threshold">
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  {THRESHOLD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto top-up will trigger when your balance drops below this amount
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundle">Bundle Size</Label>
              <Select value={bundleSize} onValueChange={(value) => setBundleSize(value as "small" | "medium" | "large")}>
                <SelectTrigger id="bundle">
                  <SelectValue placeholder="Select bundle size" />
                </SelectTrigger>
                <SelectContent>
                  {BUNDLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This bundle will be automatically purchased when threshold is reached
              </p>
            </div>

            {selectedBundle && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <CreditCard className="h-4 w-4" />
                  Auto Top-Up Summary
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>When balance drops below <strong>{thresholdCredits} credits</strong></p>
                  <p>Automatically purchase <strong>{selectedBundle.credits} credits</strong></p>
                  <p>Amount charged: <strong>${selectedBundle.price} USD</strong></p>
                </div>
              </div>
            )}

            {lastTopupAt && (
              <div className="text-sm text-muted-foreground">
                Last auto top-up: {format(new Date(lastTopupAt), "PPp")}
              </div>
            )}
          </>
        )}

        <Button onClick={saveSettings} disabled={saving || !hasPaymentMethod}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
