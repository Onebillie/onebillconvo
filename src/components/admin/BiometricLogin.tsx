import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";
import { authenticateWithBiometric } from "@/lib/webauthn";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BiometricLoginProps {
  email: string;
  onSuccess: () => void;
}

export function BiometricLogin({ email, onSuccess }: BiometricLoginProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const result = await authenticateWithBiometric(email);
      
      if (result.verified && result.session) {
        // Set session from the token
        await supabase.auth.setSession({
          access_token: result.session.properties.access_token,
          refresh_token: result.session.properties.refresh_token,
        });

        toast({
          title: "Login Successful",
          description: "Authenticated with biometric credential",
        });

        onSuccess();
      }
    } catch (error: any) {
      console.error("Biometric login error:", error);
      
      // User cancelled or error occurred
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Authentication Cancelled",
          description: "Biometric authentication was cancelled",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: error.message || "Failed to authenticate with biometric",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleBiometricLogin}
      disabled={loading}
    >
      <Fingerprint className="mr-2 h-4 w-4" />
      {loading ? "Authenticating..." : "Sign in with Biometric"}
    </Button>
  );
}
