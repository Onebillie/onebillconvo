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
    <div className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] shadow-lg">
      <div className="container mx-auto px-2 py-2 md:px-4 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Bell className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
            <span className="text-xs md:text-sm font-medium">
              {unreadCount} unread
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/app/dashboard')}
            className="bg-white text-orange-600 hover:bg-gray-100 text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
          >
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
