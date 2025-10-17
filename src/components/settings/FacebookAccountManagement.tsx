import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, ExternalLink, AlertCircle } from "lucide-react";

export function FacebookAccountManagement() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // TODO: Implement Facebook OAuth flow
    setTimeout(() => setIsConnecting(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          To connect Facebook Messenger, you'll need a Facebook Business Page and access to the Facebook Developer Console.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Connect Facebook Page
          </CardTitle>
          <CardDescription>
            Link your Facebook Business Page to receive and send messages through Messenger
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Facebook Page</Label>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect with Facebook"}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Setup Instructions:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Create a Facebook App in the Developer Console</li>
              <li>Add the Messenger product to your app</li>
              <li>Connect your Facebook Business Page</li>
              <li>Generate a Page Access Token</li>
              <li>Configure webhook URL for incoming messages</li>
            </ol>
            <Button variant="link" className="px-0 mt-2" asChild>
              <a href="https://developers.facebook.com/docs/messenger-platform" target="_blank" rel="noopener noreferrer">
                View Facebook Messenger Documentation <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Pages</CardTitle>
          <CardDescription>
            Manage your connected Facebook Business Pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No Facebook pages connected yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
