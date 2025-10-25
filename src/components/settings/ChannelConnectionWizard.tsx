import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Check, Mail, MessageSquare, Phone, Facebook, Instagram, Globe, Users, Tags, FileText, Bot, Sparkles, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface WizardProgress {
  currentStep: number;
  selectedChannels: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    facebook: boolean;
    instagram: boolean;
    website: boolean;
  };
  completedSteps: number[];
  channelSetupComplete: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    facebook: boolean;
    instagram: boolean;
    website: boolean;
  };
  channelVerified: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    facebook: boolean;
    instagram: boolean;
    website: boolean;
  };
  configurationComplete: {
    team: boolean;
    statuses: boolean;
    templates: boolean;
    ai: boolean;
  };
}

interface ChannelConnectionWizardProps {
  open: boolean;
  onClose: () => void;
  businessId?: string;
}

const STORAGE_KEY = "channel_wizard_progress";

export function ChannelConnectionWizard({ open, onClose, businessId }: ChannelConnectionWizardProps) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<WizardProgress>({
    currentStep: 0,
    selectedChannels: {
      email: false,
      whatsapp: false,
      sms: false,
      facebook: false,
      instagram: false,
      website: false,
    },
    completedSteps: [],
    channelSetupComplete: {
      email: false,
      whatsapp: false,
      sms: false,
      facebook: false,
      instagram: false,
      website: false,
    },
    channelVerified: {
      email: false,
      whatsapp: false,
      sms: false,
      facebook: false,
      instagram: false,
      website: false,
    },
    configurationComplete: {
      team: false,
      statuses: false,
      templates: false,
      ai: false,
    },
  });

  // Connection testing states
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  
  // Credential forms state
  const [emailCreds, setEmailCreds] = useState({ email: "", smtpHost: "", smtpPort: "587", smtpPassword: "", imapHost: "", imapPort: "993" });
  const [whatsappCreds, setWhatsappCreds] = useState({ accessToken: "", phoneId: "", businessAccountId: "" });
  const [smsCreds, setSmsCreds] = useState({ accountSid: "", authToken: "", phoneNumber: "" });
  
  // Team & workflow forms state
  const [teamMemberEmail, setTeamMemberEmail] = useState("");
  const [teamMemberName, setTeamMemberName] = useState("");
  const [teamMemberRole, setTeamMemberRole] = useState<"admin" | "agent" | "viewer">("agent");
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#3b82f6");
  const [templateShortcut, setTemplateShortcut] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Lists for created items
  const [createdTeamMembers, setCreatedTeamMembers] = useState<Array<{ email: string; name: string; role: string }>>([]);
  const [createdStatuses, setCreatedStatuses] = useState<Array<{ name: string; color: string }>>([]);
  const [createdTemplates, setCreatedTemplates] = useState<Array<{ shortcut: string; content: string }>>([]);

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const loadedProgress = JSON.parse(saved);
        
        // Ensure backward compatibility - add missing fields
        const migratedProgress: WizardProgress = {
          ...loadedProgress,
          channelVerified: loadedProgress.channelVerified || {
            email: false,
            whatsapp: false,
            sms: false,
            facebook: false,
            instagram: false,
            website: false,
          },
        };
        
        setProgress(migratedProgress);
      } catch (e) {
        console.error("Failed to load wizard progress:", e);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save progress
  const saveProgress = (newProgress: WizardProgress) => {
    setProgress(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
  };

  const totalSteps = 8;
  const progressPercentage = ((progress.currentStep + 1) / totalSteps) * 100;

  const goToStep = (step: number) => {
    const newProgress = { ...progress, currentStep: step };
    if (!progress.completedSteps.includes(progress.currentStep)) {
      newProgress.completedSteps = [...progress.completedSteps, progress.currentStep];
    }
    saveProgress(newProgress);
  };

  const nextStep = () => {
    if (progress.currentStep < totalSteps - 1) {
      goToStep(progress.currentStep + 1);
    }
  };

  const prevStep = () => {
    if (progress.currentStep > 0) {
      goToStep(progress.currentStep - 1);
    }
  };

  const toggleChannel = (channel: keyof typeof progress.selectedChannels) => {
    saveProgress({
      ...progress,
      selectedChannels: {
        ...progress.selectedChannels,
        [channel]: !progress.selectedChannels[channel],
      },
    });
  };

  const markChannelComplete = (channel: keyof typeof progress.channelSetupComplete) => {
    saveProgress({
      ...progress,
      channelSetupComplete: {
        ...progress.channelSetupComplete,
        [channel]: true,
      },
    });
  };

  const markChannelVerified = (channel: keyof typeof progress.channelVerified) => {
    saveProgress({
      ...progress,
      channelVerified: {
        ...progress.channelVerified,
        [channel]: true,
      },
    });
  };

  // Test connection functions
  const testEmailConnection = async () => {
    setTesting("email");
    try {
      const { data, error } = await supabase.functions.invoke("smtp-test", {
        body: {
          host: emailCreds.smtpHost,
          port: parseInt(emailCreds.smtpPort),
          user: emailCreds.email,
          password: emailCreds.smtpPassword,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResults({ ...testResults, email: { success: true, message: "Email connection successful!" } });
        markChannelVerified("email");
        toast({
          title: "✅ Email Connected!",
          description: "Your email account is working properly.",
        });
      } else {
        throw new Error(data?.error || "Connection failed");
      }
    } catch (error: any) {
      setTestResults({ ...testResults, email: { success: false, message: error.message } });
      toast({
        title: "❌ Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const testWhatsAppConnection = async () => {
    setTesting("whatsapp");
    try {
      // Verify WhatsApp credentials by trying to fetch account info
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${whatsappCreds.businessAccountId}`,
        {
          headers: {
            Authorization: `Bearer ${whatsappCreds.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Invalid WhatsApp credentials");

      setTestResults({ ...testResults, whatsapp: { success: true, message: "WhatsApp connection successful!" } });
      markChannelVerified("whatsapp");
      toast({
        title: "✅ WhatsApp Connected!",
        description: "Your WhatsApp Business account is working properly.",
      });
    } catch (error: any) {
      setTestResults({ ...testResults, whatsapp: { success: false, message: error.message } });
      toast({
        title: "❌ Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const testSmsConnection = async () => {
    setTesting("sms");
    try {
      // Basic validation for Twilio credentials
      if (!smsCreds.accountSid.startsWith("AC") || smsCreds.accountSid.length !== 34) {
        throw new Error("Invalid Account SID format");
      }
      
      setTestResults({ ...testResults, sms: { success: true, message: "SMS credentials validated!" } });
      markChannelVerified("sms");
      toast({
        title: "✅ SMS Configured!",
        description: "Your Twilio credentials look good. Test sending a message to confirm.",
      });
    } catch (error: any) {
      setTestResults({ ...testResults, sms: { success: false, message: error.message } });
      toast({
        title: "❌ Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  // For channels that can't be easily tested, we'll mark as configured when user confirms
  const markChannelConfigured = (channel: keyof typeof progress.channelVerified) => {
    markChannelVerified(channel);
    toast({
      title: `✅ ${channel.charAt(0).toUpperCase() + channel.slice(1)} Configured!`,
      description: `You can now proceed to the next step.`,
    });
  };

  const markConfigComplete = (config: keyof typeof progress.configurationComplete) => {
    saveProgress({
      ...progress,
      configurationComplete: {
        ...progress.configurationComplete,
        [config]: true,
      },
    });
  };

  // Team member invitation
  const addTeamMember = async () => {
    if (!teamMemberEmail || !businessId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.auth.admin.inviteUserByEmail(teamMemberEmail, {
        data: {
          full_name: teamMemberName || teamMemberEmail,
          business_id: businessId,
          business_role: teamMemberRole,
        },
      });

      if (error) throw error;

      setCreatedTeamMembers([...createdTeamMembers, { 
        email: teamMemberEmail, 
        name: teamMemberName || teamMemberEmail, 
        role: teamMemberRole 
      }]);
      setTeamMemberEmail("");
      setTeamMemberName("");
      setTeamMemberRole("agent");
      
      toast({
        title: "Team member invited!",
        description: `${teamMemberEmail} will receive an invitation email.`,
      });
      
      if (createdTeamMembers.length === 0) {
        markConfigComplete("team");
      }
    } catch (error: any) {
      toast({
        title: "Failed to invite team member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Status creation
  const addStatus = async () => {
    if (!statusName || !businessId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.from("conversation_status_tags").insert({
        business_id: businessId,
        name: statusName,
        color: statusColor,
        description: `Created via setup wizard`,
      });

      if (error) throw error;

      setCreatedStatuses([...createdStatuses, { name: statusName, color: statusColor }]);
      setStatusName("");
      setStatusColor("#3b82f6");
      
      toast({
        title: "Status created!",
        description: `${statusName} is now available for conversations.`,
      });
      
      if (createdStatuses.length === 0) {
        markConfigComplete("statuses");
      }
    } catch (error: any) {
      toast({
        title: "Failed to create status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Template creation
  const addTemplate = async () => {
    if (!templateShortcut || !templateContent || !businessId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.from("canned_responses").insert([{
        title: templateShortcut,
        content: templateContent,
        shortcut: templateShortcut,
        business_id: businessId,
      }]);

      if (error) throw error;

      setCreatedTemplates([...createdTemplates, { shortcut: templateShortcut, content: templateContent }]);
      setTemplateShortcut("");
      setTemplateContent("");
      
      toast({
        title: "Template created!",
        description: `Use /${templateShortcut} to quickly insert this response.`,
      });
      
      if (createdTemplates.length === 0) {
        markConfigComplete("templates");
      }
    } catch (error: any) {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetWizard = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProgress({
      currentStep: 0,
      selectedChannels: {
        email: false,
        whatsapp: false,
        sms: false,
        facebook: false,
        instagram: false,
        website: false,
      },
      completedSteps: [],
      channelSetupComplete: {
        email: false,
        whatsapp: false,
        sms: false,
        facebook: false,
        instagram: false,
        website: false,
      },
      channelVerified: {
        email: false,
        whatsapp: false,
        sms: false,
        facebook: false,
        instagram: false,
        website: false,
      },
      configurationComplete: {
        team: false,
        statuses: false,
        templates: false,
        ai: false,
      },
    });
    onClose();
    toast({
      title: "Wizard Reset",
      description: "Your progress has been cleared. You can start fresh anytime!",
    });
  };

  const completeWizard = () => {
    toast({
      title: "Setup Complete! 🎉",
      description: "Your AlacarteChat is ready to use. You can always come back to adjust settings.",
    });
    resetWizard();
  };

  const renderStep = () => {
    switch (progress.currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome to AlacarteChat Setup!</h2>
                <p className="text-muted-foreground">
                  Let's get your business communication up and running in just a few steps.
                  Don't worry - you can save your progress and come back anytime!
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>What We'll Set Up Together</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Communication Channels</p>
                    <p className="text-sm text-muted-foreground">Email, WhatsApp, SMS, Social Media & more</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Team Configuration</p>
                    <p className="text-sm text-muted-foreground">Add team members and set permissions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Workflow Setup</p>
                    <p className="text-sm text-muted-foreground">Statuses, templates, and automation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">AI Assistant</p>
                    <p className="text-sm text-muted-foreground">Train your AI chatbot to help customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                💡 <strong>Tip:</strong> This wizard will guide you through each step with clear instructions.
                Your progress is automatically saved!
              </AlertDescription>
            </Alert>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose Your Channels</h2>
              <p className="text-muted-foreground">
                Select which communication channels you want to connect. You can always add more later!
              </p>
            </div>

            <div className="grid gap-4">
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => toggleChannel("email")}>
                <CardContent className="flex items-start gap-4 p-4">
                  <Checkbox checked={progress.selectedChannels.email} onCheckedChange={() => toggleChannel("email")} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Email</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect your business email for customer communication
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => toggleChannel("whatsapp")}>
                <CardContent className="flex items-start gap-4 p-4">
                  <Checkbox checked={progress.selectedChannels.whatsapp} onCheckedChange={() => toggleChannel("whatsapp")} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">WhatsApp Business</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect WhatsApp Business API for messaging
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => toggleChannel("sms")}>
                <CardContent className="flex items-start gap-4 p-4">
                  <Checkbox checked={progress.selectedChannels.sms} onCheckedChange={() => toggleChannel("sms")} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">SMS</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send and receive text messages via Twilio
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => toggleChannel("facebook")}>
                <CardContent className="flex items-start gap-4 p-4">
                  <Checkbox checked={progress.selectedChannels.facebook} onCheckedChange={() => toggleChannel("facebook")} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Facebook className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Facebook Messenger</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect your Facebook Page for Messenger chat
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => toggleChannel("instagram")}>
                <CardContent className="flex items-start gap-4 p-4">
                  <Checkbox checked={progress.selectedChannels.instagram} onCheckedChange={() => toggleChannel("instagram")} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Instagram className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Instagram Direct</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Manage Instagram DMs from your dashboard
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => toggleChannel("website")}>
                <CardContent className="flex items-start gap-4 p-4">
                  <Checkbox checked={progress.selectedChannels.website} onCheckedChange={() => toggleChannel("website")} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Website Chat Widget</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add a live chat widget to your website
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Email Setup</h2>
              <p className="text-muted-foreground">
                Enter your email credentials and test the connection
              </p>
            </div>

            {!progress.selectedChannels.email ? (
              <Alert>
                <AlertDescription>
                  You didn't select Email in the previous step. Click "Previous" to add it, or "Next" to skip.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>What You'll Need</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <p className="text-sm">Your business email address</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <p className="text-sm">SMTP server settings (for sending emails)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <p className="text-sm">IMAP/POP3 server settings (for receiving emails)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <p className="text-sm">App-specific password (recommended for Gmail/Outlook)</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Setup Guide</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Gmail:</strong> smtp.gmail.com (587) / imap.gmail.com (993)</p>
                    <p><strong>Outlook:</strong> smtp-mail.outlook.com (587) / outlook.office365.com (993)</p>
                    <p className="pt-2">
                      <strong>App Password:</strong> <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google</a> | <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft</a>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Enter Email Credentials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={emailCreds.email}
                        onChange={(e) => setEmailCreds({ ...emailCreds, email: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Your business email address</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>SMTP Host</Label>
                        <Input
                          placeholder="smtp.gmail.com"
                          value={emailCreds.smtpHost}
                          onChange={(e) => setEmailCreds({ ...emailCreds, smtpHost: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Gmail: smtp.gmail.com | <a href="https://support.google.com/mail/answer/7126229" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Help</a>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Port</Label>
                        <Input
                          type="number"
                          placeholder="587"
                          value={emailCreds.smtpPort}
                          onChange={(e) => setEmailCreds({ ...emailCreds, smtpPort: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Usually 587 or 465</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>IMAP Host</Label>
                        <Input
                          placeholder="imap.gmail.com"
                          value={emailCreds.imapHost}
                          onChange={(e) => setEmailCreds({ ...emailCreds, imapHost: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Gmail: imap.gmail.com | <a href="https://support.google.com/mail/answer/7126229" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Help</a>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>IMAP Port</Label>
                        <Input
                          type="number"
                          placeholder="993"
                          value={emailCreds.imapPort}
                          onChange={(e) => setEmailCreds({ ...emailCreds, imapPort: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Usually 993</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Password / App Password (Recommended)</Label>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={emailCreds.smtpPassword}
                        onChange={(e) => setEmailCreds({ ...emailCreds, smtpPassword: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        🔐 <strong>Get App Password:</strong> <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Gmail</a> | <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Outlook</a>
                      </p>
                    </div>

                    <Button 
                      onClick={testEmailConnection} 
                      disabled={testing === "email" || !emailCreds.email || !emailCreds.smtpHost || !emailCreds.smtpPassword}
                      className="w-full"
                    >
                      {testing === "email" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        "Test Email Connection"
                      )}
                    </Button>

                    {testResults.email && (
                      <Alert variant={testResults.email.success ? "default" : "destructive"}>
                        <div className="flex items-center gap-2">
                          {testResults.email.success ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          <AlertDescription>{testResults.email.message}</AlertDescription>
                        </div>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {progress.channelVerified.email && (
                  <Alert>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription>
                      ✅ <strong>Email verified!</strong> You can now proceed to the next step.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">WhatsApp Business Setup</h2>
              <p className="text-muted-foreground">
                Enter your WhatsApp Business API credentials and verify the connection
              </p>
            </div>

            {!progress.selectedChannels.whatsapp ? (
              <Alert>
                <AlertDescription>
                  You didn't select WhatsApp in the previous step. Click "Previous" to add it, or "Next" to skip.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Setup Guide</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">1. Create Meta Business Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Visit <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta Business Suite</a> and create an account
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">2. Set Up WhatsApp Business API</h4>
                      <p className="text-sm text-muted-foreground">
                        Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta for Developers</a> and:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Create a new Business app</li>
                        <li>• Add WhatsApp product</li>
                        <li>• Complete business verification</li>
                        <li>• Add a phone number</li>
                      </ul>
                    </div>

                    <Alert>
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Note:</strong> Business verification can take 1-2 weeks
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Enter WhatsApp Credentials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input
                        type="password"
                        placeholder="Your WhatsApp API Access Token"
                        value={whatsappCreds.accessToken}
                        onChange={(e) => setWhatsappCreds({ ...whatsappCreds, accessToken: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        📍 <strong>Get it here:</strong> <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Meta Developer Portal</a> → Your App → WhatsApp → API Setup → Temporary Access Token
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number ID</Label>
                      <Input
                        placeholder="Phone Number ID"
                        value={whatsappCreds.phoneId}
                        onChange={(e) => setWhatsappCreds({ ...whatsappCreds, phoneId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        📍 <strong>Get it here:</strong> <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Meta Developer Portal</a> → Your App → WhatsApp → API Setup → Phone Number ID (shown above the token)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Business Account ID</Label>
                      <Input
                        placeholder="Business Account ID"
                        value={whatsappCreds.businessAccountId}
                        onChange={(e) => setWhatsappCreds({ ...whatsappCreds, businessAccountId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        📍 <strong>Get it here:</strong> <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Meta Developer Portal</a> → Your App → WhatsApp → Configuration → Business Account ID
                      </p>
                    </div>

                    <Button 
                      onClick={testWhatsAppConnection} 
                      disabled={testing === "whatsapp" || !whatsappCreds.accessToken || !whatsappCreds.phoneId || !whatsappCreds.businessAccountId}
                      className="w-full"
                    >
                      {testing === "whatsapp" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying Connection...
                        </>
                      ) : (
                        "Test WhatsApp Connection"
                      )}
                    </Button>

                    {testResults.whatsapp && (
                      <Alert variant={testResults.whatsapp.success ? "default" : "destructive"}>
                        <div className="flex items-center gap-2">
                          {testResults.whatsapp.success ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          <AlertDescription>{testResults.whatsapp.message}</AlertDescription>
                        </div>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {progress.channelVerified.whatsapp && (
                  <Alert>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription>
                      ✅ <strong>WhatsApp verified!</strong> You can now proceed to the next step.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Other Channels Setup</h2>
              <p className="text-muted-foreground">
                Let's configure SMS, Facebook, Instagram, and Website Chat
              </p>
            </div>

            <div className="space-y-4">
              {progress.selectedChannels.sms && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      <CardTitle>SMS Setup (Twilio)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      Create a Twilio account at <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com</a>
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Account SID</Label>
                        <Input
                          placeholder="AC..."
                          value={smsCreds.accountSid}
                          onChange={(e) => setSmsCreds({ ...smsCreds, accountSid: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          📍 <strong>Get it here:</strong> <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Twilio Console</a> → Account Info → Account SID
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Auth Token</Label>
                        <Input
                          type="password"
                          placeholder="Your Twilio Auth Token"
                          value={smsCreds.authToken}
                          onChange={(e) => setSmsCreds({ ...smsCreds, authToken: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          📍 <strong>Get it here:</strong> <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Twilio Console</a> → Account Info → Auth Token (click "View" to reveal)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Twilio Phone Number</Label>
                        <Input
                          placeholder="+1234567890"
                          value={smsCreds.phoneNumber}
                          onChange={(e) => setSmsCreds({ ...smsCreds, phoneNumber: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          📍 <strong>Get it here:</strong> <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Twilio Phone Numbers</a> → Active Numbers (or <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/search" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Buy a Number</a>)
                        </p>
                      </div>

                      <Button 
                        onClick={testSmsConnection} 
                        disabled={testing === "sms" || !smsCreds.accountSid || !smsCreds.authToken}
                        className="w-full"
                      >
                        {testing === "sms" ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          "Validate SMS Credentials"
                        )}
                      </Button>

                      {testResults.sms && (
                        <Alert variant={testResults.sms.success ? "default" : "destructive"}>
                          <div className="flex items-center gap-2">
                            {testResults.sms.success ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <AlertDescription>{testResults.sms.message}</AlertDescription>
                          </div>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {progress.selectedChannels.facebook && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Facebook className="w-5 h-5 text-primary" />
                      <CardTitle>Facebook Messenger Setup</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      To connect Facebook Messenger, you'll need to:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Connect your Facebook Page</li>
                      <li>• Grant Messenger permissions</li>
                      <li>• Configure webhook settings</li>
                    </ul>
                    
                    <Alert>
                      <AlertDescription>
                        📍 <strong>Start here:</strong> <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Meta Developer Portal</a> → Create App → Business → Add Messenger Product
                        <br /><br />
                        Then go to <strong>Settings → Channels → Facebook</strong> in AlacarteChat to complete the connection.
                      </AlertDescription>
                    </Alert>

                    {!progress.channelVerified.facebook ? (
                      <Button 
                        onClick={() => markChannelConfigured("facebook")}
                        variant="outline"
                        className="w-full"
                      >
                        I've Connected Facebook Messenger
                      </Button>
                    ) : (
                      <Alert>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <AlertDescription>
                          ✅ <strong>Facebook verified!</strong>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {progress.selectedChannels.instagram && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Instagram className="w-5 h-5 text-primary" />
                      <CardTitle>Instagram Direct Setup</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      To connect Instagram Direct Messages:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Convert to Instagram Business Account</li>
                      <li>• Connect to Facebook Page</li>
                      <li>• Enable Instagram messaging</li>
                    </ul>
                    
                    <Alert>
                      <AlertDescription>
                        📍 <strong>Start here:</strong> <a href="https://www.facebook.com/pages" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Facebook Pages</a> → Settings → Instagram → Connect Account
                        <br /><br />
                        Then visit <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Meta Developer Portal</a> to add Instagram Messaging to your app.
                        <br /><br />
                        Finally, configure in <strong>Settings → Channels → Instagram</strong> in AlacarteChat.
                      </AlertDescription>
                    </Alert>

                    {!progress.channelVerified.instagram ? (
                      <Button 
                        onClick={() => markChannelConfigured("instagram")}
                        variant="outline"
                        className="w-full"
                      >
                        I've Connected Instagram
                      </Button>
                    ) : (
                      <Alert>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <AlertDescription>
                          ✅ <strong>Instagram verified!</strong>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {progress.selectedChannels.website && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      <CardTitle>Website Chat Widget</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      To add the chat widget to your website:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Customize widget appearance and behavior</li>
                      <li>• Copy the embed code snippet</li>
                      <li>• Paste it before the closing &lt;/body&gt; tag in your website's HTML</li>
                      <li>• Test the widget on your live site</li>
                    </ul>
                    
                    <Alert>
                      <AlertDescription>
                        📍 <strong>Configure here:</strong> Go to <strong>Settings → Channels → Website Chat Widget</strong> in AlacarteChat to customize appearance, get your embed code, and set up AI responses.
                      </AlertDescription>
                    </Alert>

                    {!progress.channelVerified.website ? (
                      <Button 
                        onClick={() => markChannelConfigured("website")}
                        variant="outline"
                        className="w-full"
                      >
                        I've Added the Widget to My Website
                      </Button>
                    ) : (
                      <Alert>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <AlertDescription>
                          ✅ <strong>Website widget verified!</strong>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {!progress.selectedChannels.sms && !progress.selectedChannels.facebook && 
             !progress.selectedChannels.instagram && !progress.selectedChannels.website && (
              <Alert>
                <AlertDescription>
                  You didn't select any of these channels. Click "Next" to continue with team setup!
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Team & Workflow Setup</h2>
              <p className="text-muted-foreground">
                Configure your team, statuses, and templates to get started
              </p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle>Team Members</CardTitle>
                </div>
                <CardDescription>
                  Invite team members to collaborate. They'll receive an email invitation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input
                        type="email"
                        placeholder="teammate@company.com"
                        value={teamMemberEmail}
                        onChange={(e) => setTeamMemberEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={teamMemberName}
                        onChange={(e) => setTeamMemberName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <select
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={teamMemberRole}
                      onChange={(e) => setTeamMemberRole(e.target.value as "admin" | "agent" | "viewer")}
                    >
                      <option value="viewer">Viewer - Can only view conversations</option>
                      <option value="agent">Agent - Can manage conversations</option>
                      <option value="admin">Admin - Full access to settings</option>
                    </select>
                  </div>
                  <Button 
                    onClick={addTeamMember} 
                    disabled={!teamMemberEmail || saving}
                    className="w-full"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Send Invitation
                  </Button>
                </div>

                {createdTeamMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Invited Members ({createdTeamMembers.length})</Label>
                    <div className="space-y-2">
                      {createdTeamMembers.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded bg-primary/5">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{member.name}</span>
                          <span className="text-muted-foreground">({member.email})</span>
                          <span className="ml-auto text-xs bg-primary/10 px-2 py-1 rounded">{member.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  💡 You can add more team members later in Settings → Staff & Teams
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tags className="w-5 h-5 text-primary" />
                  <CardTitle>Conversation Statuses</CardTitle>
                </div>
                <CardDescription>
                  Create statuses to organize and track conversation progress.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Status Name *</Label>
                      <Input
                        placeholder="e.g., New Lead, In Progress, Resolved"
                        value={statusName}
                        onChange={(e) => setStatusName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input
                        type="color"
                        value={statusColor}
                        onChange={(e) => setStatusColor(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={addStatus} 
                    disabled={!statusName || saving}
                    className="w-full"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Create Status
                  </Button>
                </div>

                {createdStatuses.length > 0 && (
                  <div className="space-y-2">
                    <Label>Created Statuses ({createdStatuses.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {createdStatuses.map((status, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                          style={{ backgroundColor: status.color + '20', color: status.color }}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {status.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  💡 You can manage statuses later in Settings → Statuses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle>Quick Reply Templates</CardTitle>
                </div>
                <CardDescription>
                  Create templates for frequently used responses. Use them with /shortcut.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Shortcut * (without /)</Label>
                    <Input
                      placeholder="e.g., greeting, hours, refund"
                      value={templateShortcut}
                      onChange={(e) => setTemplateShortcut(e.target.value.replace(/\//g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message Content *</Label>
                    <textarea
                      className="w-full px-3 py-2 rounded-md border border-input bg-background min-h-[100px]"
                      placeholder="Hi! Thanks for reaching out. How can I help you today?"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={addTemplate} 
                    disabled={!templateShortcut || !templateContent || saving}
                    className="w-full"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Create Template
                  </Button>
                </div>

                {createdTemplates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Created Templates ({createdTemplates.length})</Label>
                    <div className="space-y-2">
                      {createdTemplates.map((template, idx) => (
                        <div key={idx} className="p-3 rounded border bg-card">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <code className="text-sm font-medium">/{template.shortcut}</code>
                          </div>
                          <p className="text-sm text-muted-foreground">{template.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  💡 You can create more templates later in Settings → Quick Replies
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">AI Assistant Setup</h2>
              <p className="text-muted-foreground">
                Train your AI chatbot to provide automated customer support
              </p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <CardTitle>Configure AI Assistant</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Set up your AI assistant to handle customer inquiries automatically.
                </p>

                <div>
                  <h4 className="font-medium mb-2">1. Enable AI Assistant</h4>
                  <p className="text-sm text-muted-foreground">
                    Go to Settings → AI Assistant and toggle "Enable AI Responses"
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">2. Upload Training Documents</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload documents to train your AI:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Product catalogs</li>
                    <li>• FAQ documents</li>
                    <li>• Company policies</li>
                    <li>• Service information</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">3. Set AI Behavior</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Customize how your AI responds:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Tone and personality (professional, friendly, etc.)</li>
                    <li>• Response confidence threshold</li>
                    <li>• Fallback to human agent settings</li>
                    <li>• Approval workflow (manual approval before sending)</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">4. Test Your AI</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the AI suggestion feature in conversations to test responses before going live.
                  </p>
                </div>

                <Alert>
                  <AlertDescription>
                    💡 <strong>Tip:</strong> Start with AI approval mode enabled. Review AI responses before they're sent until you're confident in the AI's performance.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={progress.configurationComplete.ai}
                    onCheckedChange={() => markConfigComplete("ai")}
                  />
                  <Label className="cursor-pointer" onClick={() => markConfigComplete("ai")}>
                    AI assistant configured
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">You're All Set! 🎉</h2>
                <p className="text-muted-foreground">
                  Congratulations! You've completed the setup wizard. Your AlacarteChat is ready to use!
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Setup Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Connected Channels</h4>
                  <div className="flex flex-wrap gap-2">
                    {progress.selectedChannels.email && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm">
                        <Mail className="w-3 h-3" />
                        Email
                      </div>
                    )}
                    {progress.selectedChannels.whatsapp && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm">
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </div>
                    )}
                    {progress.selectedChannels.sms && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm">
                        <Phone className="w-3 h-3" />
                        SMS
                      </div>
                    )}
                    {progress.selectedChannels.facebook && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm">
                        <Facebook className="w-3 h-3" />
                        Facebook
                      </div>
                    )}
                    {progress.selectedChannels.instagram && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm">
                        <Instagram className="w-3 h-3" />
                        Instagram
                      </div>
                    )}
                    {progress.selectedChannels.website && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm">
                        <Globe className="w-3 h-3" />
                        Website
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Next Steps</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <span className="text-sm">Start receiving messages from your connected channels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <span className="text-sm">Fine-tune your AI assistant with real conversations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <span className="text-sm">Invite more team members as your business grows</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <span className="text-sm">Explore advanced features in Settings</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                💡 <strong>Remember:</strong> You can always access this wizard again from Settings → Channels if you need to set up additional channels!
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Channel Connection Wizard</DialogTitle>
          <DialogDescription>
            Step {progress.currentStep + 1} of {totalSteps}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Progress value={progressPercentage} className="w-full" />

          {renderStep()}

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {progress.currentStep > 0 && (
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={resetWizard}>
                Reset Wizard
              </Button>
              {progress.currentStep < totalSteps - 1 ? (
                <>
                  <Button 
                    variant="outline"
                    onClick={nextStep}
                  >
                    Skip for Now
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  {((progress.currentStep === 2 && progress.selectedChannels.email && progress.channelVerified.email) ||
                    (progress.currentStep === 3 && progress.selectedChannels.whatsapp && progress.channelVerified.whatsapp) ||
                    (progress.currentStep === 4 && (
                      (!progress.selectedChannels.sms || progress.channelVerified.sms) &&
                      (!progress.selectedChannels.facebook || progress.channelVerified.facebook) &&
                      (!progress.selectedChannels.instagram || progress.channelVerified.instagram) &&
                      (!progress.selectedChannels.website || progress.channelVerified.website)
                    )) ||
                    progress.currentStep < 2 ||
                    progress.currentStep > 4) && (
                    <Button onClick={nextStep}>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={completeWizard}>
                  Complete
                  <Check className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
