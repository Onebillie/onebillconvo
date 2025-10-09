import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CreateSuperAdmin() {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [password, setPassword] = useState("");

  const handleCreateSuperAdmin = async () => {
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-superadmin", {
        body: {
          email: "hello@alacartesaas.com",
          password: password
        }
      });

      if (error) throw error;

      console.log("SuperAdmin creation response:", data);
      
      const message = data?.status === "updated"
        ? "Password updated! You can now log in."
        : "SuperAdmin account created! You can now log in with your password.";
      
      toast.success(message);
      setCreated(true);
    } catch (error: any) {
      console.error("Error creating superadmin:", error);
      toast.error(`Failed to create superadmin: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create SuperAdmin Account</CardTitle>
          <CardDescription>
            {!created 
              ? "Set password and assign superadmin role to hello@alacartesaas.com"
              : "Setup complete! You can now log in to the admin portal."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {created ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-left">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                  ✓ SuperAdmin Setup Complete
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mb-1">
                  Email: <strong>hello@alacartesaas.com</strong>
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Role: <strong>superadmin</strong> ✓
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                You can now log in to the admin portal with your password.
              </p>
              <Button
                onClick={() => window.location.href = "/admin/login"}
                className="w-full"
                size="lg"
              >
                Go to Admin Login
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleCreateSuperAdmin}
                disabled={loading || !password}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create SuperAdmin Account"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
