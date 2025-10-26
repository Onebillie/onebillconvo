import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Smartphone, Key, Trash2, CheckCircle2 } from "lucide-react";
import {
  registerBiometric,
  checkBiometricSupport,
  listBiometricCredentials,
  deleteBiometricCredential,
} from "@/lib/webauthn";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function BiometricSetup() {
  const [loading, setLoading] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [credentials, setCredentials] = useState<any[]>([]);
  const [biometricSupport, setBiometricSupport] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkSupport();
    loadCredentials();
  }, []);

  const checkSupport = async () => {
    const support = await checkBiometricSupport();
    setBiometricSupport(support);
  };

  const loadCredentials = async () => {
    try {
      const creds = await listBiometricCredentials();
      setCredentials(creds);
    } catch (error: any) {
      console.error("Error loading credentials:", error);
    }
  };

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      toast({
        title: "Device Name Required",
        description: "Please enter a name for this device",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await registerBiometric(deviceName);
      
      toast({
        title: "Biometric Registered",
        description: "Your biometric credential has been registered successfully",
      });

      setDeviceName("");
      await loadCredentials();
    } catch (error: any) {
      console.error("Error registering biometric:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register biometric credential",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (credentialId: string) => {
    try {
      await deleteBiometricCredential(credentialId);
      
      toast({
        title: "Credential Removed",
        description: "Biometric credential has been removed",
      });

      await loadCredentials();
    } catch (error: any) {
      console.error("Error deleting credential:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to remove credential",
        variant: "destructive",
      });
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'platform') return <Fingerprint className="h-5 w-5" />;
    if (deviceType === 'cross-platform') return <Key className="h-5 w-5" />;
    return <Smartphone className="h-5 w-5" />;
  };

  if (!biometricSupport?.supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Your browser does not support biometric authentication (WebAuthn).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Biometric Authentication
        </CardTitle>
        <CardDescription>
          Set up TouchID, FaceID, Windows Hello, or security keys for fast, secure access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Registration Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deviceName">Device Name</Label>
            <Input
              id="deviceName"
              placeholder="e.g., MacBook Pro TouchID, iPhone 15, YubiKey"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button onClick={handleRegister} disabled={loading || !deviceName.trim()}>
            <Fingerprint className="mr-2 h-4 w-4" />
            {loading ? "Registering..." : "Register Biometric"}
          </Button>

          {biometricSupport.platformAuthenticator && (
            <p className="text-sm text-muted-foreground">
              <CheckCircle2 className="inline h-4 w-4 mr-1 text-green-500" />
              Platform authenticator detected (TouchID, FaceID, or Windows Hello)
            </p>
          )}
        </div>

        {/* Registered Credentials */}
        {credentials.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Registered Devices</h4>
            <div className="space-y-2">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(cred.device_type)}
                    <div>
                      <p className="font-medium">{cred.device_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last used: {cred.last_used_at ? new Date(cred.last_used_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Biometric Credential?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove "{cred.device_name}" from your account. You can register it again later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(cred.id)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
          <p className="font-medium">Security Benefits:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Phishing-resistant (tied to this domain)</li>
            <li>No password to steal or forget</li>
            <li>Device-specific credentials</li>
            <li>Fast access with just a touch or glance</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
