import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Info } from "lucide-react";

export function FacebookAccountManagement() {
  // Facebook Messenger integration coming Q1 2026
  // UI completely disabled until full implementation complete
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          Facebook Messenger
        </CardTitle>
        <CardDescription>
          Manage Facebook Business Page messaging
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Facebook Messenger integration is coming in Q1 2026. This feature is currently in development and will be available soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
