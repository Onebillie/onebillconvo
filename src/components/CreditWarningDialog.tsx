import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface CreditWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditsRemaining: number;
  onPurchaseCredits: () => void;
}

export function CreditWarningDialog({ 
  open, 
  onOpenChange, 
  creditsRemaining,
  onPurchaseCredits 
}: CreditWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Low Credit Balance
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have {creditsRemaining} message credits remaining. Purchase more credits to avoid service interruption.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => {
            onOpenChange(false);
            onPurchaseCredits();
          }}>
            Purchase Credits
          </AlertDialogAction>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Remind Me Later
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
