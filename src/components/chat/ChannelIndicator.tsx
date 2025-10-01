import { Mail } from "lucide-react";

interface ChannelIndicatorProps {
  channel: "whatsapp" | "email";
}

export const ChannelIndicator = ({ channel }: ChannelIndicatorProps) => {
  if (channel === "email") {
    return (
      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
        @
      </div>
    );
  }
  
  return (
    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
      W
    </div>
  );
};
