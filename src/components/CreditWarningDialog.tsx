import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreditWarning {
  warning: 'low' | 'critical' | null;
  used: number;
  limit: number;
  percentUsed: string;
  renewDate: string;
}

export const CreditWarningDialog = () => {
  const [warning, setWarning] = useState<CreditWarning | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    const checkWarning = async () => {
      if (!session) return;

      try {
        const { data, error } = await supabase.functions.invoke('check-credit-warning', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;

        if (data?.warning) {
          setWarning(data);
          setOpen(true);
        }
      } catch (error) {
        console.error('Error checking credit warning:', error);
      }
    };

    // Check immediately
    checkWarning();

    // Check every 5 minutes
    const interval = setInterval(checkWarning, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  if (!warning?.warning) return null;

  const isCritical = warning.warning === 'critical';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${isCritical ? 'text-destructive' : 'text-amber-500'}`} />
            <DialogTitle>
              {isCritical ? 'Critical: Message Credits Low' : 'Warning: Message Credits Running Low'}
            </DialogTitle>
          </div>
          <DialogDescription>
            You've used <strong>{warning.used} of {warning.limit}</strong> messages ({warning.percentUsed}%) in your current billing period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="font-semibold mb-2">What happens when you run out?</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• You won't be able to send new messages</li>
              <li>• Credits reset on: {new Date(warning.renewDate).toLocaleDateString()}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Options to continue messaging:</h4>
            <div className="grid gap-2">
              <Button
                variant="default"
                className="justify-start"
                onClick={() => {
                  setOpen(false);
                  navigate('/app/settings?tab=subscription');
                }}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade Plan for More Messages
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setOpen(false);
                  navigate('/app/settings?tab=subscription');
                }}
              >
                <Package className="mr-2 h-4 w-4" />
                Buy Credit Bundle for Top-Up
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
