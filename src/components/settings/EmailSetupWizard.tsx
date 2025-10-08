import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Mail, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailConfig {
  name: string;
  email_address: string;
  inbound_method: 'imap' | 'pop3';
  imap_host?: string;
  imap_port?: number;
  imap_username?: string;
  imap_password?: string;
  imap_use_ssl?: boolean;
  pop3_host?: string;
  pop3_port?: number;
  pop3_username?: string;
  pop3_password?: string;
  pop3_use_ssl?: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_use_ssl: boolean;
}

interface EmailSetupWizardProps {
  onComplete: (config: Partial<EmailConfig>) => void;
}

const emailProviders = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '📧',
    config: {
      inbound_method: 'imap' as const,
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      imap_use_ssl: true,
      pop3_host: 'pop.gmail.com',
      pop3_port: 995,
      pop3_use_ssl: true,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 465,
      smtp_use_ssl: true,
    },
    instructions: 'You need to create an App Password in your Google Account settings. Go to Security > 2-Step Verification > App Passwords.',
  },
  {
    id: 'outlook',
    name: 'Outlook / Office 365',
    icon: '🔵',
    config: {
      inbound_method: 'imap' as const,
      imap_host: 'outlook.office365.com',
      imap_port: 993,
      imap_use_ssl: true,
      pop3_host: 'outlook.office365.com',
      pop3_port: 995,
      pop3_use_ssl: true,
      smtp_host: 'smtp.office365.com',
      smtp_port: 587,
      smtp_use_ssl: false, // Uses STARTTLS
    },
    instructions: 'Use your regular Outlook password or create an App Password if you have 2FA enabled.',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    icon: '🟣',
    config: {
      inbound_method: 'imap' as const,
      imap_host: 'imap.mail.yahoo.com',
      imap_port: 993,
      imap_use_ssl: true,
      pop3_host: 'pop.mail.yahoo.com',
      pop3_port: 995,
      pop3_use_ssl: true,
      smtp_host: 'smtp.mail.yahoo.com',
      smtp_port: 465,
      smtp_use_ssl: true,
    },
    instructions: 'You need to generate an App Password in your Yahoo Account settings under Account Security.',
  },
  {
    id: 'cpanel',
    name: 'cPanel / Custom Domain',
    icon: '🌐',
    config: {
      inbound_method: 'imap' as const,
      imap_port: 993,
      imap_use_ssl: true,
      pop3_port: 995,
      pop3_use_ssl: true,
      smtp_port: 465,
      smtp_use_ssl: true,
    },
    instructions: 'Server addresses typically use mail.yourdomain.com format. Contact your hosting provider for exact details.',
  },
];

export function EmailSetupWizard({ onComplete }: EmailSetupWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState<string>('');
  const [config, setConfig] = useState<Partial<EmailConfig>>({
    inbound_method: 'imap',
  });
  const { toast } = useToast();

  const selectedProvider = emailProviders.find(p => p.id === provider);

  const handleProviderSelect = (providerId: string) => {
    const providerData = emailProviders.find(p => p.id === providerId);
    if (!providerData) return;

    setProvider(providerId);
    
    // Apply provider config
    const baseConfig = { ...providerData.config };
    
    // For custom domain, we need the domain from email
    if (providerId === 'cpanel' && config.email_address) {
      const domain = config.email_address.split('@')[1];
      if (domain) {
        baseConfig.imap_host = `mail.${domain}`;
        baseConfig.pop3_host = `mail.${domain}`;
        baseConfig.smtp_host = `mail.${domain}`;
      }
    }
    
    setConfig(prev => ({
      ...prev,
      ...baseConfig,
      smtp_username: config.email_address,
      imap_username: config.email_address,
      pop3_username: config.email_address,
    }));
    
    setStep(2);
  };

  const handleEmailChange = (email: string) => {
    setConfig(prev => ({
      ...prev,
      email_address: email,
      smtp_username: email,
      imap_username: email,
      pop3_username: email,
    }));

    // Update hosts for custom domain
    if (provider === 'cpanel' && email.includes('@')) {
      const domain = email.split('@')[1];
      if (domain) {
        setConfig(prev => ({
          ...prev,
          imap_host: `mail.${domain}`,
          pop3_host: `mail.${domain}`,
          smtp_host: `mail.${domain}`,
        }));
      }
    }
  };

  const handleComplete = () => {
    if (!config.email_address || !config.smtp_password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Set password for all methods
    if (config.inbound_method === 'imap') {
      config.imap_password = config.smtp_password;
    } else {
      config.pop3_password = config.smtp_password;
    }

    onComplete(config);
    setOpen(false);
    resetWizard();
    
    toast({
      title: "Email account configured",
      description: "Your email account has been set up successfully",
    });
  };

  const resetWizard = () => {
    setStep(1);
    setProvider('');
    setConfig({ inbound_method: 'imap' });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetWizard();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full">
          <Mail className="w-5 h-5 mr-2" />
          Add Email Account Wizard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Account Setup Wizard</DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Choose Provider' : step === 2 ? 'Enter Details' : 'Review & Complete'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Provider Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emailProviders.map((p) => (
                <Card
                  key={p.id}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleProviderSelect(p.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{p.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Click to configure</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Credentials */}
        {step === 2 && selectedProvider && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{selectedProvider.instructions}</AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  placeholder="e.g., My Gmail Account"
                  value={config.name || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={config.email_address || ''}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password">
                  {selectedProvider.id === 'gmail' || selectedProvider.id === 'yahoo' 
                    ? 'App Password' 
                    : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={config.smtp_password || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, smtp_password: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="inbound-method">Inbound Method</Label>
                <Select
                  value={config.inbound_method}
                  onValueChange={(value: 'imap' | 'pop3') => 
                    setConfig(prev => ({ ...prev, inbound_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imap">IMAP (Recommended)</SelectItem>
                    <SelectItem value="pop3">POP3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => setStep(3)}
                disabled={!config.email_address || !config.smtp_password}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Complete */}
        {step === 3 && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Review your settings before completing setup
              </AlertDescription>
            </Alert>

            <Card className="p-4 space-y-3">
              <div>
                <Label className="text-muted-foreground">Provider</Label>
                <p className="font-medium">{selectedProvider?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email Address</Label>
                <p className="font-medium">{config.email_address}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Inbound Method</Label>
                <p className="font-medium uppercase">{config.inbound_method}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Inbound Server</Label>
                <p className="font-medium text-sm">
                  {config.inbound_method === 'imap' 
                    ? `${config.imap_host}:${config.imap_port}` 
                    : `${config.pop3_host}:${config.pop3_port}`}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Outbound Server</Label>
                <p className="font-medium text-sm">{config.smtp_host}:{config.smtp_port}</p>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button className="flex-1" onClick={handleComplete}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
