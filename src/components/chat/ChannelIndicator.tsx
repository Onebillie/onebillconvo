import { MessageCircle, Phone, Instagram } from "lucide-react";
import chatbotOnlineIcon from "@/assets/chatbot-online-icon.png";
import chatbotOfflineIcon from "@/assets/chatbot-offline-icon.png";

interface ChannelIndicatorProps {
  channel: "whatsapp" | "email" | "sms" | "facebook" | "instagram" | "embed" | string;
  isActive?: boolean;
}

export const ChannelIndicator = ({ channel, isActive = true }: ChannelIndicatorProps) => {
  // Map of known channels - using semantic design tokens
  const knownChannels: Record<string, JSX.Element> = {
    email: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-xs font-bold" aria-label="Email channel">
        @
      </div>
    ),
    sms: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold" aria-label="SMS channel">
        <Phone className="h-3 w-3" />
      </div>
    ),
    facebook: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold" aria-label="Facebook channel">
        <MessageCircle className="h-3 w-3" />
      </div>
    ),
    instagram: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-gradient-rainbow flex items-center justify-center text-primary-foreground text-xs font-bold" aria-label="Instagram channel">
        <Instagram className="h-3 w-3" />
      </div>
    ),
    embed: (
      <div className="min-w-7 h-7 flex items-center justify-center" aria-label={isActive ? "Chat widget online" : "Chat widget offline"}>
        <img 
          src={isActive ? chatbotOnlineIcon : chatbotOfflineIcon} 
          alt={isActive ? "Online" : "Offline"} 
          className="h-7 w-7 object-contain" 
        />
      </div>
    ),
    whatsapp: (
      <div className="min-w-7 h-7 px-2 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold" aria-label="WhatsApp channel">
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
