import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface UsageMeterProps {
  used: number;
  limit: number;
  label: string;
  showWarning?: boolean;
}

export const UsageMeter = ({ used, limit, label, showWarning = true }: UsageMeterProps) => {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isOverLimit = used >= limit;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <span className={isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className={`h-2 ${isOverLimit ? 'bg-destructive/20' : ''}`}
      />
      
      {showWarning && isNearLimit && !isOverLimit && (
        <Alert variant="default" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            You're approaching your message limit. Consider upgrading your plan.
          </AlertDescription>
        </Alert>
      )}
      
      {isOverLimit && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Message limit reached. Upgrade your plan to continue sending messages.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
