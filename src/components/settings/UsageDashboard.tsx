import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getMessageLimit } from "@/lib/stripeConfig";
import { useNavigate } from "react-router-dom";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const UsageDashboard = () => {
  const { subscriptionState } = useAuth();
  const navigate = useNavigate();
  const [messageCount, setMessageCount] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const limit = getMessageLimit(subscriptionState.tier);

  useEffect(() => {
    fetchUsage();
    
    const channel = supabase
      .channel('usage-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'businesses' }, 
        fetchUsage
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('message_count_current_period, credit_balance')
        .single();
        
      if (error) throw error;
      
      if (data) {
        setMessageCount(data.message_count_current_period || 0);
        setCreditBalance(data.credit_balance || 0);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const percentUsed = limit === 999999 ? 0 : Math.min((messageCount / limit) * 100, 100);
  const isNearLimit = percentUsed > 80;
  const isAtLimit = percentUsed >= 100;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Message Usage This Period</CardTitle>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Messages Sent</span>
              <span className="text-2xl font-bold">
                {messageCount.toLocaleString()} 
                <span className="text-sm font-normal text-muted-foreground">
                  {limit === 999999 ? ' / Unlimited' : ` / ${limit.toLocaleString()}`}
                </span>
              </span>
            </div>
            
            {limit !== 999999 && (
              <>
                <Progress 
                  value={percentUsed} 
                  className={isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-orange-200' : ''} 
                />
                
                {isAtLimit && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You've reached your message limit. Upgrade to continue sending messages.
                    </AlertDescription>
                  </Alert>
                )}
                
                {isNearLimit && !isAtLimit && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      ⚠️ You're approaching your message limit ({Math.round(percentUsed)}% used). Consider upgrading your plan.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-muted-foreground">Credit Balance</span>
              <span className="text-xl font-bold">{creditBalance.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Credits can be used for AI responses and additional message capacity
            </p>
          </div>

          {(isNearLimit || isAtLimit) && (
            <div className="flex gap-2 pt-4">
              <Button onClick={() => navigate('/pricing')} variant="default" className="flex-1">
                Upgrade Plan
              </Button>
              <Button onClick={() => navigate('/settings')} variant="outline" className="flex-1">
                Buy Credits
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
