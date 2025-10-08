import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wand2, Upload, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailConfig {
  email_address: string;
  inbound_method: 'imap' | 'pop3';
  imap_host: string;
  imap_port: number;
  imap_username: string;
  imap_use_ssl: boolean;
  pop3_host: string;
  pop3_port: number;
  pop3_username: string;
  pop3_use_ssl: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_use_ssl: boolean;
}

interface EmailAutoconfigureProps {
  onApplyConfig: (config: Partial<EmailConfig>) => void;
}

export function EmailAutoconfigure({ onApplyConfig }: EmailAutoconfigureProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const parseVbsScript = (content: string): Partial<EmailConfig> | null => {
    try {
      // Extract values from VBS script
      const incServerMatch = content.match(/strIncServerAddress\s*=\s*"([^"]+)"/);
      const outServerMatch = content.match(/strOutServerAddress\s*=\s*"([^"]+)"/);
      const accountMatch = content.match(/strAccount\s*=\s*"([^"]+)"/);
      const imapPortMatch = content.match(/strServerMailPort\s*=\s*"([^"]+)"/);
      const smtpPortMatch = content.match(/strServerSmtpPort\s*=\s*"([^"]+)"/);
      const secureMatch = content.match(/strSecureConnection\s*=\s*"([^"]+)"/);

      if (!incServerMatch || !accountMatch) {
        return null;
      }

      const popHost = incServerMatch[1];
      const smtpHost = outServerMatch?.[1] || popHost;
      const email = accountMatch[1];
      
      // Convert hex port to decimal
      const popPort = imapPortMatch ? parseInt(imapPortMatch[1], 16) : 995;
      const smtpPort = smtpPortMatch ? parseInt(smtpPortMatch[1], 16) : 465;
      const useSsl = secureMatch ? secureMatch[1] !== "00000000" : true;

      return {
        email_address: email,
        inbound_method: 'pop3' as const,
        pop3_host: popHost,
        pop3_port: popPort,
        pop3_username: email,
        pop3_use_ssl: useSsl,
        imap_host: popHost,
        imap_port: 993,
        imap_username: email,
        imap_use_ssl: useSsl,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_username: email,
        smtp_use_ssl: useSsl,
      };
    } catch (error) {
      console.error('Error parsing VBS script:', error);
      return null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      
      // Try to parse as VBS script
      if (file.name.endsWith('.vbs')) {
        const config = parseVbsScript(content);
        if (config) {
          onApplyConfig(config);
          toast({
            title: "Configuration imported",
            description: "Email settings have been loaded from the VBS file",
          });
          setOpen(false);
          return;
        }
      }

      toast({
        title: "Parse error",
        description: "Could not parse the configuration file",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const applyCpanelPreset = (email: string) => {
    // Extract domain from email
    const domain = email.split('@')[1];
    if (!domain) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address first",
        variant: "destructive",
      });
      return;
    }

    const config: Partial<EmailConfig> = {
      email_address: email,
      inbound_method: 'pop3',
      pop3_host: `mail.${domain}`,
      pop3_port: 995,
      pop3_username: email,
      pop3_use_ssl: true,
      imap_host: `mail.${domain}`,
      imap_port: 993,
      imap_username: email,
      imap_use_ssl: true,
      smtp_host: `mail.${domain}`,
      smtp_port: 465,
      smtp_username: email,
      smtp_use_ssl: true,
    };

    onApplyConfig(config);
    toast({
      title: "Configuration applied",
      description: "Standard cPanel settings have been applied",
    });
    setOpen(false);
  };

  const applyGmailPreset = (email: string) => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your Gmail address first",
        variant: "destructive",
      });
      return;
    }

    const config: Partial<EmailConfig> = {
      email_address: email,
      inbound_method: 'pop3',
      pop3_host: "pop.gmail.com",
      pop3_port: 995,
      pop3_username: email,
      pop3_use_ssl: true,
      imap_host: "imap.gmail.com",
      imap_port: 993,
      imap_username: email,
      imap_use_ssl: true,
      smtp_host: "smtp.gmail.com",
      smtp_port: 465,
      smtp_username: email,
      smtp_use_ssl: true,
    };

    onApplyConfig(config);
    toast({
      title: "Gmail configuration applied",
      description: "Remember to use an App Password, not your regular Gmail password",
    });
    setOpen(false);
  };

  const applyOutlookPreset = (email: string) => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your Outlook/Hotmail address first",
        variant: "destructive",
      });
      return;
    }

    const config: Partial<EmailConfig> = {
      email_address: email,
      inbound_method: 'pop3',
      pop3_host: "outlook.office365.com",
      pop3_port: 995,
      pop3_username: email,
      pop3_use_ssl: true,
      imap_host: "outlook.office365.com",
      imap_port: 993,
      imap_username: email,
      imap_use_ssl: true,
      smtp_host: "smtp.office365.com",
      smtp_port: 587,
      smtp_username: email,
      smtp_use_ssl: false, // Outlook uses STARTTLS on port 587
    };

    onApplyConfig(config);
    toast({
      title: "Outlook configuration applied",
      description: "Outlook settings have been configured",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="w-4 h-4 mr-2" />
          Autoconfigure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email Autoconfigure</DialogTitle>
          <DialogDescription>
            Quickly setup your email account using presets or import configuration files
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Server className="h-4 w-4" />
          <AlertDescription>
            <strong>For cPanel/WHM users:</strong> Enter your email address in the form first, then click "Apply cPanel Preset" to auto-fill settings.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Quick Presets</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const email = prompt("Enter your email address:");
                  if (email) applyCpanelPreset(email);
                }}
                className="justify-start"
              >
                <Server className="w-4 h-4 mr-2" />
                cPanel/WHM Standard (mail.yourdomain.com)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const email = prompt("Enter your Gmail address:");
                  if (email) applyGmailPreset(email);
                }}
                className="justify-start"
              >
                <Server className="w-4 h-4 mr-2" />
                Gmail (imap.gmail.com)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const email = prompt("Enter your Outlook/Hotmail address:");
                  if (email) applyOutlookPreset(email);
                }}
                className="justify-start"
              >
                <Server className="w-4 h-4 mr-2" />
                Outlook/Office 365
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Import Configuration File</h3>
            <label htmlFor="config-file" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload .vbs configuration file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports cPanel email setup scripts
                </p>
              </div>
              <input
                id="config-file"
                type="file"
                accept=".vbs,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Note:</strong> After applying a preset, you'll still need to enter your password manually.
              For Gmail and some other providers, you may need to generate an app-specific password.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
