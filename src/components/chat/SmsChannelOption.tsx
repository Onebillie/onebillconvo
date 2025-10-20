import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SmsChannelOptionProps {
  onSelect: () => void;
  disabled?: boolean;
  hasSmsAccount: boolean;
}

export function SmsChannelOption({ onSelect, disabled, hasSmsAccount }: SmsChannelOptionProps) {
  const { toast } = useToast();

  const handleClick = () => {
    if (!hasSmsAccount) {
      toast({
        title: "SMS Not Configured",
        description: "Please configure your SMS account in Settings → Channels first.",
        variant: "destructive",
      });
      return;
    }
    onSelect();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled}
      title={hasSmsAccount ? "Send via SMS" : "SMS not configured"}
      className={!hasSmsAccount ? "opacity-50" : ""}
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
}
