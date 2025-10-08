import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ManualImapTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultHost?: string;
  defaultPort?: number;
  defaultUsername?: string;
  defaultUseSsl?: boolean;
  onSuccess?: (config: { hostname: string; port: number; username: string; useTls: boolean }) => void;
}

export function ManualImapTestDialog({
  open,
  onOpenChange,
  defaultHost = "",
  defaultPort = 993,
  defaultUsername = "",
  defaultUseSsl = true,
  onSuccess
}: ManualImapTestDialogProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [successfulConfig, setSuccessfulConfig] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    hostname: defaultHost,
    port: defaultPort,
    username: defaultUsername,
    password: "",
    mode: defaultUseSsl ? "993-tls" : "143-starttls"
  });

  const runManualTest = async () => {
    setIsTesting(true);
    setTestResults([]);
    setSuccessfulConfig(null);

    try {
      // Parse the mode
      const useTls = formData.mode === "993-tls";
      const port = formData.mode === "993-tls" ? 993 : 143;

      const { data, error } = await supabase.functions.invoke('manual-imap-test', {
        body: {
          hostname: formData.hostname,
          port,
          username: formData.username,
          password: formData.password,
          useTls
        }
      });

      if (error) throw error;

      setTestResults(data.all_results || []);
      
      if (data.ok && data.working_config) {
        setSuccessfulConfig(data.working_config);
        toast({
          title: "Test successful!",
          description: `Working configuration found: ${data.working_variant}`,
        });
      } else {
        toast({
          title: "All tests failed",
          description: data.message || "Check the results below for details",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Test failed",
        description: error.message || "An error occurred during testing",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApplyConfig = () => {
    if (successfulConfig && onSuccess) {
      onSuccess(successfulConfig);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual IMAP Connection Test</DialogTitle>
          <DialogDescription>
            Test IMAP connection with custom settings. This will try multiple authentication methods and configurations.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Tip:</strong> Try the exact settings from your iPhone mail app. If using full email as username fails,
            the test will automatically try just the local-part (before @).
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-hostname">IMAP Host</Label>
            <Input
              id="manual-hostname"
              value={formData.hostname}
              onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
              placeholder="mail.yourdomain.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-mode">Connection Mode</Label>
            <Select value={formData.mode} onValueChange={(value) => setFormData({ ...formData, mode: value })}>
              <SelectTrigger id="manual-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="993-tls">Port 993 (TLS/SSL)</SelectItem>
                <SelectItem value="143-starttls">Port 143 (STARTTLS)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-username">Username</Label>
            <Input
              id="manual-username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="your@email.com or just 'your'"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-password">Password</Label>
            <Input
              id="manual-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Your email password or app-specific password"
            />
          </div>

          <Button 
            onClick={runManualTest} 
            disabled={isTesting || !formData.hostname || !formData.username || !formData.password}
            className="w-full"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Run Test"
            )}
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold">Test Results</h3>
            {testResults.map((result, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium">{result.variant}</span>
                </div>
                <div className="text-sm space-y-1 ml-6">
                  <div>Host: {result.config.hostname}:{result.config.port}</div>
                  <div>Username: {result.config.username}</div>
                  <div>TLS: {result.config.useTls ? "Yes" : "STARTTLS"}</div>
                  {result.auth_mechanisms && (
                    <div>Server AUTH: {result.auth_mechanisms.join(", ")}</div>
                  )}
                  {result.error && (
                    <div className="text-red-600 mt-1">Error: {result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {successfulConfig && (
            <Button onClick={handleApplyConfig}>
              Apply This Configuration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
