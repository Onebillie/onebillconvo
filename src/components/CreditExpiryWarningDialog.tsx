import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditExpiryWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditsExpiring: number;
  expiryDate: Date;
  daysRemaining: number;
  onPurchaseMore: () => void;
  onUseCredits: () => void;
}

export function CreditExpiryWarningDialog({ 
  open, 
  onOpenChange, 
  creditsExpiring,
  expiryDate,
  daysRemaining,
  onPurchaseMore,
  onUseCredits
}: CreditExpiryWarningDialogProps) {
  const urgencyLevel = daysRemaining <= 7 ? 'critical' : daysRemaining <= 14 ? 'warning' : 'info';
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className={`flex items-center gap-2 ${
            urgencyLevel === 'critical' ? 'text-destructive' : 
            urgencyLevel === 'warning' ? 'text-amber-600' : 
            'text-primary'
          }`}>
            <AlertTriangle className="w-5 h-5" />
            Credits Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  {creditsExpiring.toLocaleString()} credits expiring
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {expiryDate.toLocaleDateString()} ({daysRemaining} days remaining)
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {urgencyLevel === 'critical' && (
                <p className="text-destructive font-medium">
                  ⚠️ These credits will expire very soon! Use them or lose them.
                </p>
              )}
              <p>
                These message credits will expire on {expiryDate.toLocaleDateString()}. 
                {daysRemaining > 1 ? ` You have ${daysRemaining} days ` : ' You have 1 day '}
                to use them before they're lost.
              </p>
              <p className="text-muted-foreground">
                Consider using these credits now or purchasing more to ensure uninterrupted service.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={() => {
              onOpenChange(false);
              onUseCredits();
            }}
            variant="default"
            className="w-full sm:w-auto"
          >
            Send Messages Now
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onPurchaseMore();
            }}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Purchase More Credits
          </Button>
          {daysRemaining > 7 && (
            <AlertDialogAction onClick={() => onOpenChange(false)}>
              Remind Me Later
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
