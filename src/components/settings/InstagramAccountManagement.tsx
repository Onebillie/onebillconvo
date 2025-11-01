import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Instagram, Info } from "lucide-react";

export function InstagramAccountManagement() {
  // Instagram DM integration coming Q1 2026
  // UI completely disabled until full implementation complete
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-600" />
          Instagram Direct Messages
        </CardTitle>
        <CardDescription>
          Manage Instagram Business account messaging
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Instagram DM integration is coming in Q1 2026. This feature is currently in development and will be available soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
