import { MessageCircle, Phone, Instagram } from "lucide-react";
import chatbotOnlineIcon from "@/assets/chatbot-online-icon.png";
import chatbotOfflineIcon from "@/assets/chatbot-offline-icon.png";

interface ChannelIndicatorProps {
  channel: "whatsapp" | "email" | "sms" | "facebook" | "instagram" | "embed" | string;
  isActive?: boolean;
}

export const ChannelIndicator = ({ channel, isActive = true }: ChannelIndicatorProps) => {
  // Map of known channels
  const knownChannels: Record<string, JSX.Element> = {
    email: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
        @
      </div>
    ),
    sms: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
        <Phone className="h-3 w-3" />
      </div>
    ),
    facebook: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
        <MessageCircle className="h-3 w-3" />
      </div>
    ),
    instagram: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
        <Instagram className="h-3 w-3" />
      </div>
    ),
    embed: (
      <div className="min-w-7 h-7 flex items-center justify-center">
        <img 
          src={isActive ? chatbotOnlineIcon : chatbotOfflineIcon} 
          alt={isActive ? "Online" : "Offline"} 
          className="h-7 w-7 object-contain" 
        />
      </div>
    ),
    whatsapp: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
        W
      </div>
    ),
  };

  // Return known channel or fallback
  if (knownChannels[channel]) {
    return knownChannels[channel];
  }

  // Fallback for unknown channels
  return (
    <div className="min-w-7 h-7 px-2 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
      <MessageCircle className="h-3 w-3" />
    </div>
  );
};
