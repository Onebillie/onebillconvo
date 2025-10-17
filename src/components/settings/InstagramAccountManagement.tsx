import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Instagram, ExternalLink, AlertCircle } from "lucide-react";

export function InstagramAccountManagement() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // TODO: Implement Instagram OAuth flow
    setTimeout(() => setIsConnecting(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Instagram messaging requires an Instagram Business or Creator account linked to a Facebook Business Page.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-600" />
            Connect Instagram Account
          </CardTitle>
          <CardDescription>
            Link your Instagram Business account to receive and send direct messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect with Instagram"}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Setup Instructions:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Convert your Instagram account to a Business or Creator account</li>
              <li>Link it to a Facebook Business Page</li>
              <li>Create a Facebook App in the Developer Console</li>
              <li>Add Instagram Messaging to your app</li>
              <li>Generate an access token</li>
              <li>Configure webhook URL for incoming messages</li>
            </ol>
            <Button variant="link" className="px-0 mt-2" asChild>
              <a href="https://developers.facebook.com/docs/messenger-platform/instagram" target="_blank" rel="noopener noreferrer">
                View Instagram Messaging Documentation <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected Instagram Business accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No Instagram accounts connected yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
