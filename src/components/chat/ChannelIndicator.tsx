import { Mail, MessageCircle, Phone, Instagram, Globe } from "lucide-react";
import wwwGlobeIcon from "@/assets/www-globe-icon.png";

interface ChannelIndicatorProps {
  channel: "whatsapp" | "email" | "sms" | "facebook" | "instagram" | "embed";
  isActive?: boolean;
}

export const ChannelIndicator = ({ channel, isActive = true }: ChannelIndicatorProps) => {
  switch (channel) {
    case "email":
      return (
        <div className="min-w-7 h-7 px-2 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
          @
        </div>
      );
    case "sms":
      return (
        <div className="min-w-7 h-7 px-2 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
          <Phone className="h-3 w-3" />
        </div>
      );
    case "facebook":
      return (
        <div className="min-w-7 h-7 px-2 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          <MessageCircle className="h-3 w-3" />
        </div>
      );
    case "instagram":
      return (
        <div className="min-w-7 h-7 px-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
          <Instagram className="h-3 w-3" />
        </div>
      );
    case "embed":
      return (
        <div className={`min-w-7 h-7 px-2 rounded-full flex items-center justify-center ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}>
          <img src={wwwGlobeIcon} alt="WWW" className="h-4 w-4 invert" />
        </div>
      );
    default: // whatsapp
      return (
        <div className="min-w-7 h-7 px-2 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
          W
        </div>
      );
  }
};
