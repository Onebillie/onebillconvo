import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export const RefreshButton = ({ onRefresh, disabled }: RefreshButtonProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing || disabled) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={disabled || isRefreshing}
      className="h-8 w-8 flex-shrink-0"
      title="Refresh conversation"
    >
      <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
    </Button>
  );
};
