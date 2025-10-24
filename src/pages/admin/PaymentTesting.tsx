import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, TestTube, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PaymentTesting() {
  const { user, currentBusinessId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testUserId, setTestUserId] = useState("");
  const [messageCount, setMessageCount] = useState("");
  const [creditBalance, setCreditBalance] = useState("");
  const [isFrozen, setIsFrozen] = useState(false);

  const [testResults, setTestResults] = useState<{
    subscription?: boolean;
    credits?: boolean;
    limits?: boolean;
    frozen?: boolean;
  }>({});

  const handleSetMessageCount = async () => {
    if (!currentBusinessId || !messageCount) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ message_count_current_period: parseInt(messageCount) })
        .eq("id", currentBusinessId);

      if (error) throw error;
      toast.success(`Message count set to ${messageCount}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCredits = async () => {
    if (!currentBusinessId || !creditBalance) return;
    setLoading(true);
    try {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const { error } = await supabase
        .from("businesses")
        .update({ 
          credit_balance: parseInt(creditBalance),
          credit_expiry_date: expiryDate.toISOString()
        })
        .eq("id", currentBusinessId);

      if (error) throw error;
      toast.success(`Credit balance set to ${creditBalance}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFreeze = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ is_frozen: isFrozen })
        .eq("id", currentBusinessId);

      if (error) throw error;
      toast.success(`Account ${isFrozen ? 'frozen' : 'unfrozen'}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testSubscriptionCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      setTestResults(prev => ({ ...prev, subscription: data?.subscribed }));
      toast.success(`Subscription: ${data?.subscribed ? 'Active' : 'Inactive'}`);
    } catch (error: any) {
      toast.error(error.message);
      setTestResults(prev => ({ ...prev, subscription: false }));
    } finally {
      setLoading(false);
    }
  };

  const testCreditPurchase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-credits', {
        body: { priceId: 'price_test', credits: 500 }
      });
      
      if (error) throw error;
      setTestResults(prev => ({ ...prev, credits: true }));
      toast.success('Credit purchase initiated');
      if (data?.url) window.open(data.url, '_blank');
    } catch (error: any) {
      toast.error(error.message);
      setTestResults(prev => ({ ...prev, credits: false }));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatus = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("message_count_current_period, message_limit, credit_balance, is_frozen, subscription_tier")
        .eq("id", currentBusinessId)
        .single();

      if (error) throw error;
      
      toast.success('Status loaded - check console');
      console.log('Current Business Status:', data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Testing Utilities</h1>
        <p className="text-muted-foreground mt-2">Phase 4: End-to-End Payment Testing</p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Testing Mode:</strong> Use these utilities to test payment flows, limits, and account states.
          Changes are immediate and affect the current business account.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Step 6 & 7: Subscription & Credit Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Step 6-7: Payment Flow Tests
            </CardTitle>
            <CardDescription>Test subscription and credit purchase flows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testSubscriptionCheck} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Test Subscription Check
            </Button>
            
            <Button onClick={testCreditPurchase} disabled={loading} variant="outline" className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              Test Credit Purchase (Test Mode)
            </Button>

            {testResults.subscription !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                {testResults.subscription ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                Subscription: {testResults.subscription ? 'Active' : 'Inactive'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 8: Limit Enforcement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Step 8: Test Limit Enforcement
            </CardTitle>
            <CardDescription>Set message count to test limit warnings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Message Count</Label>
              <Input
                type="number"
                placeholder="e.g., 800 or 1000"
                value={messageCount}
                onChange={(e) => setMessageCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Set to 800 to test 80% warning, 1000 to test blocking
              </p>
            </div>
            <Button onClick={handleSetMessageCount} disabled={loading || !messageCount} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Set Message Count
            </Button>
          </CardContent>
        </Card>

        {/* Step 9: Credit Bypass */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Step 9: Test Credit Bypass
            </CardTitle>
            <CardDescription>Add credits to bypass message limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Credit Balance</Label>
              <Input
                type="number"
                placeholder="e.g., 500"
                value={creditBalance}
                onChange={(e) => setCreditBalance(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Credits allow sending when at message limit
              </p>
            </div>
            <Button onClick={handleSetCredits} disabled={loading || !creditBalance} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Set Credit Balance
            </Button>
          </CardContent>
        </Card>

        {/* Step 10: Account Freeze */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Step 10: Test Account Freeze
            </CardTitle>
            <CardDescription>Toggle account frozen state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="freeze-toggle">Account Frozen</Label>
              <Switch
                id="freeze-toggle"
                checked={isFrozen}
                onCheckedChange={setIsFrozen}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Frozen accounts cannot send messages but can receive
            </p>
            <Button onClick={handleToggleFreeze} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isFrozen ? 'Freeze Account' : 'Unfreeze Account'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Account Status</CardTitle>
          <CardDescription>View current business state</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={getCurrentStatus} disabled={loading} variant="outline">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Load Current Status (Check Console)
          </Button>
        </CardContent>
      </Card>

      {/* Testing Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Phase 4 Testing Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-mono text-muted-foreground">□</span>
              <span><strong>Step 6:</strong> Sign up new user, subscribe to Starter with test card 4242...</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-muted-foreground">□</span>
              <span><strong>Step 7:</strong> Purchase Small Bundle, verify credit_balance increases</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-muted-foreground">□</span>
              <span><strong>Step 8:</strong> Set count to 800 → verify warning, 1000 → verify blocking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-muted-foreground">□</span>
              <span><strong>Step 9:</strong> At 1000 limit with credits → verify message sends, credits decrement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-muted-foreground">□</span>
              <span><strong>Step 10:</strong> Freeze account → verify banner, sending blocked, receiving works</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
