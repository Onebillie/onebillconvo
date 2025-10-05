import { Bell } from "lucide-react";
import { Button } from "./button";
import { useNavigate } from "react-router-dom";

interface NotificationBannerProps {
  unreadCount: number;
}

export function NotificationBanner({ unreadCount }: NotificationBannerProps) {
  const navigate = useNavigate();

  if (unreadCount === 0) return null;

  return (
    <>
      {/* Top Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 animate-pulse" />
              <span className="font-medium">
                You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="bg-white text-orange-600 hover:bg-gray-100"
            >
              View Messages
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Badge - Always Visible */}
      <div 
        className="fixed bottom-6 right-6 z-50 cursor-pointer animate-bounce"
        onClick={() => navigate('/dashboard')}
      >
        <div className="relative">
          <div className="bg-destructive text-destructive-foreground rounded-full w-16 h-16 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
            <Bell className="w-8 h-8" />
          </div>
          <div className="absolute -top-2 -right-2 bg-background border-2 border-destructive text-destructive rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
            {unreadCount}
          </div>
        </div>
      </div>
    </>
  );
}
