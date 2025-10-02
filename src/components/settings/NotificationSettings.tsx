import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const NotificationSettings = () => {
  const { isSupported, permission, subscribeToPush, unsubscribeFromPush } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Browser Notifications</CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isEnabled = permission === 'granted';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Browser Notifications</CardTitle>
        <CardDescription>
          Get notified instantly when customers send messages via WhatsApp or email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Push Notifications
            </p>
            <p className="text-sm text-muted-foreground">
              Status: {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not enabled'}
            </p>
          </div>
          {isEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={unsubscribeFromPush}
            >
              <BellOff className="h-4 w-4 mr-2" />
              Disable
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={subscribeToPush}
              disabled={permission === 'denied'}
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          )}
        </div>
        {permission === 'denied' && (
          <p className="text-sm text-destructive">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
