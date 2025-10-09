import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CreateSuperAdmin() {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreateSuperAdmin = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-superadmin", {
        body: {
          email: "hello@alacartesaas.com"
          // No password - will trigger password reset email
        }
      });

      if (error) throw error;

      console.log("SuperAdmin creation response:", data);
      
      toast.success("Success! Check hello@alacartesaas.com for password reset email");
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
            This will create hello@alacartesaas.com with superadmin privileges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {created ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                ✅ SuperAdmin account created successfully!
              </p>
              <p className="text-sm">
                Check <strong>hello@alacartesaas.com</strong> for the password reset email.
              </p>
              <Button
                onClick={() => window.location.href = "/admin/login"}
                className="w-full"
              >
                Go to Admin Login
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleCreateSuperAdmin}
              disabled={loading}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
