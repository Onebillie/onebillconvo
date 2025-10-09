import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, AlertTriangle, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  generateDeviceFingerprint, 
  getDeviceName, 
  storeDeviceFingerprint,
  getStoredDeviceFingerprint 
} from "@/lib/deviceFingerprint";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingTrustedDevice, setCheckingTrustedDevice] = useState(true);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
  const navigate = useNavigate();
  const { startAdminSession } = useAuth();

  // Check for trusted device on mount
  useEffect(() => {
    checkTrustedDevice();
  }, []);

  const checkTrustedDevice = async () => {
    try {
      setCheckingTrustedDevice(true);
      
      // Get or generate device fingerprint
      let fingerprint = getStoredDeviceFingerprint();
      if (!fingerprint) {
        fingerprint = await generateDeviceFingerprint();
        storeDeviceFingerprint(fingerprint);
      }
      setDeviceFingerprint(fingerprint);

      // Check if current session exists and device is trusted
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if this device is trusted
        const { data: isTrusted } = await supabase
          .rpc('is_device_trusted', {
            _user_id: user.id,
            _device_fingerprint: fingerprint
          });

        if (isTrusted) {
          // Verify superadmin role
          const { data: isSuperadmin } = await supabase
            .rpc('has_role', { 
              _user_id: user.id, 
              _role: 'superadmin' 
            });

          if (isSuperadmin) {
            // Auto-login - device is trusted
            await startAdminSession();
            toast.success("Welcome back! Trusted device authenticated.");
            navigate('/admin');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking trusted device:', error);
    } finally {
      setCheckingTrustedDevice(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Ensure we have a device fingerprint
    let fingerprint = deviceFingerprint;
    if (!fingerprint) {
      fingerprint = await generateDeviceFingerprint();
      setDeviceFingerprint(fingerprint);
      storeDeviceFingerprint(fingerprint);
    }

    const deviceName = getDeviceName();

    try {
      // First, sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast.error(authError.message || "Login failed");
        setLoading(false);
        return;
      }

      // Check if user has superadmin role using secure RPC
      const { data: isSuperadmin, error: roleCheckError } = await supabase.rpc('has_role', {
        _user_id: authData.user.id,
        _role: 'superadmin'
      });

      if (roleCheckError || !isSuperadmin) {
        // Not a superadmin - sign them out and guide to setup
        await supabase.auth.signOut();
        toast.error("Superadmin Setup Required. Please visit /admin/create-superadmin to complete setup.", {
          action: {
            label: "Complete Setup",
            onClick: () => navigate('/admin/create-superadmin')
          }
        });
        setLoading(false);
        return;
      }

      // Start admin session with device fingerprint
      await startAdminSession();
      
      // Update admin session with device info and mark as trusted
      const { data: sessions } = await supabase
        .from('admin_sessions')
        .select('id')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        await supabase
          .from('admin_sessions')
          .update({
            device_fingerprint: fingerprint,
            device_name: deviceName,
            is_trusted: true,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          })
          .eq('id', sessions[0].id);
      }

      // Send security alert
      await supabase.functions.invoke('admin-login-alert', {
        body: {
          userId: authData.user.id,
          email: authData.user.email,
          timestamp: new Date().toISOString(),
          deviceName: deviceName,
        }
      }).catch(err => console.error("Failed to send login alert:", err));

      toast.success(`Admin access granted - Device trusted for 30 days`);
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  if (checkingTrustedDevice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950/20 via-background to-orange-950/20 p-4">
        <Card className="w-full max-w-md border-red-900/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Fingerprint className="w-12 h-12 text-red-400 animate-pulse" />
              <p className="text-sm text-muted-foreground">Checking for trusted device...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950/20 via-background to-orange-950/20 p-4">
      <Card className="w-full max-w-md border-red-900/20 shadow-2xl">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center mb-2">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">SuperAdmin Portal</CardTitle>
          <CardDescription className="text-center">
            Restricted access - System administrators only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <div className="p-3 bg-red-950/10 border border-red-900/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-600">
                <p className="font-medium">Security Notice</p>
                <p className="text-xs mt-1 text-red-600/80">
                  All admin logins are monitored and logged
                </p>
              </div>
            </div>
            <div className="p-3 bg-blue-950/10 border border-blue-900/20 rounded-lg flex items-start gap-2">
              <Fingerprint className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-600">
                <p className="font-medium">Trusted Device</p>
                <p className="text-xs mt-1 text-blue-600/80">
                  This device will be trusted for 30 days
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-red-900/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-red-900/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700" 
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign In as SuperAdmin"}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Button 
              type="button" 
              variant="link" 
              className="text-sm text-muted-foreground" 
              onClick={() => navigate("/auth")}
            >
              ← Back to regular login
            </Button>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                First time setup?
              </p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="text-xs" 
                onClick={() => navigate("/admin/create-superadmin")}
              >
                Create SuperAdmin Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
