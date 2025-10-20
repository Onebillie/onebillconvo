import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"auth" | "forgot" | "reset" | "magic-link">("auth");
  const { signIn, signUp, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect away from /auth
  useEffect(() => {
    if (!authLoading && profile && mode === "auth") {
      navigate("/app/dashboard", { replace: true });
    }
  }, [authLoading, profile, mode, navigate]);

  // Detect password recovery redirects and show "set new password" form
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setMode("reset");
      // Let Supabase process the hash first, then clean it up
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 0);
    }
    
    // Check for auth errors in URL (expired tokens, etc.)
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    if (error) {
      let errorMessage = errorDescription || error;
      
      if (error === 'access_denied' && errorDescription?.includes('expired')) {
        errorMessage = "Email verification link has expired. Please request a new verification email by trying to sign in, or contact support for assistance.";
      }
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        // Provide more helpful error messages
        let errorMessage = error.message;
        
        if (error.message === "Email not confirmed") {
          errorMessage = "Please check your email and click the confirmation link to verify your account. If the link expired, contact support.";
        } else if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.includes("Email link is invalid or has expired")) {
          errorMessage = "Email verification link has expired. Please request a new verification email or contact support.";
        }
        
        toast({
          title: "Error signing in",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Check if user is superadmin
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: isSuperadmin } = await supabase
            .rpc('has_role', { 
              _user_id: user.id, 
              _role: 'superadmin' 
            });

          if (isSuperadmin) {
            // Start admin session for superadmin
            try {
              const fp = await FingerprintJS.load();
              const result = await fp.get();
              const deviceFingerprint = result.visitorId;

              const { error: sessionError } = await supabase
                .from('admin_sessions')
                .insert({
                  user_id: user.id,
                  device_fingerprint: deviceFingerprint,
                  device_name: navigator.userAgent,
                  is_trusted: true,
                  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                });

              if (sessionError) {
                console.error('Error creating admin session:', sessionError);
              }

              // Send security alert
              await supabase.functions.invoke('admin-login-alert', {
                body: { userId: user.id, deviceFingerprint }
              });

              toast({
                title: "SuperAdmin Access",
                description: "Redirecting to admin dashboard...",
              });

              navigate('/admin', { replace: true });
              setLoading(false);
              return;
            } catch (adminError) {
              console.error('Error setting up admin session:', adminError);
              toast({
                title: "Warning",
                description: "Logged in but failed to initialize admin session",
                variant: "destructive",
              });
            }
          }
        }
      }
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account created! Please check your email to confirm.",
      });
    }

    setLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox to continue password reset." });
      setMode("auth");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "You are now signed in." });
      navigate("/app/dashboard");
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/app/dashboard`,
        },
      });

      if (error) throw error;

      toast({ 
        title: "Magic link sent!", 
        description: "Check your email and click the link to sign in." 
      });
      setMode("auth");
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send magic link", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-2">
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Customer Service Platform</CardTitle>
          <CardDescription>Sign in to manage your customer conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "auth" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
              <div className="text-center space-y-2">
                <div className="flex gap-2 justify-center">
                  <Button type="button" variant="link" className="px-0 text-sm" onClick={() => setMode("forgot")}>
                    Forgot password?
                  </Button>
                  <span className="text-muted-foreground">•</span>
                  <Button type="button" variant="link" className="px-0 text-sm" onClick={() => setMode("magic-link")}>
                    Use magic link
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary hover:underline font-medium">
                    Sign up here
                  </Link>
                </div>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("auth")}>Back</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </div>
            </form>
          )}

          {mode === "magic-link" && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("auth")}>Back</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Sending..." : "Send magic link"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                We'll send you an email with a link to sign in instantly
              </p>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("auth")}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
