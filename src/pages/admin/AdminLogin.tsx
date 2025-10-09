import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { startAdminSession } = useAuth();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast({
          title: "Login failed",
          description: authError.message,
          variant: "destructive",
        });
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
        toast({
          title: "Superadmin Setup Required",
          description: "Your account needs superadmin access. Please visit /admin/create-superadmin to complete setup.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/create-superadmin')}>
              Complete Setup
            </Button>
          ),
        });
        setLoading(false);
        return;
      }

      // Start admin session via AuthContext (updates state)
      try {
        await startAdminSession();
      } catch (e) {
        console.warn("Admin session start warning:", e);
      }

      // Send security alert
      await supabase.functions.invoke('admin-login-alert', {
        body: {
          userId: authData.user.id,
          email: authData.user.email,
          timestamp: new Date().toISOString(),
        }
      }).catch(err => console.error("Failed to send login alert:", err));

      toast({
        title: "Admin Access Granted",
        description: "Security alert sent to admin email",
      });

      navigate('/admin');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <div className="mb-4 p-3 bg-red-950/10 border border-red-900/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-600">
              <p className="font-medium">Security Notice</p>
              <p className="text-xs mt-1 text-red-600/80">
                All admin logins are monitored and logged. An email alert will be sent on successful login.
              </p>
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
