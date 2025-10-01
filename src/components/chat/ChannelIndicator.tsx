import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChannelIndicatorProps {
  channel: "whatsapp" | "email";
  className?: string;
}

export const ChannelIndicator = ({ channel, className = "" }: ChannelIndicatorProps) => {
  if (channel === "email") {
    return (
      <Badge variant="secondary" className={`absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center ${className}`}>
        <Mail className="h-3 w-3" />
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={`absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center ${className}`}>
      <span className="text-[10px] font-bold">W</span>
    </Badge>
  );
};
