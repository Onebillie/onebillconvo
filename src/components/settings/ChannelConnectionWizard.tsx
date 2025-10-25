import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Check, Mail, MessageSquare, Phone, Facebook, Instagram, Globe, Users, Tags, FileText, Bot, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    configurationComplete: {
      team: false,
      statuses: false,
      templates: false,
      ai: false,
    },
  });

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load wizard progress:", e);
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

  const markConfigComplete = (config: keyof typeof progress.configurationComplete) => {
    saveProgress({
      ...progress,
      configurationComplete: {
        ...progress.configurationComplete,
        [config]: true,
      },
    });
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
                Connect your business email to send and receive messages
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
                    <CardTitle>Step-by-Step Guide</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">1. Get Your Email Server Settings</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Find your email provider's SMTP and IMAP settings:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Gmail: smtp.gmail.com (port 587) / imap.gmail.com (port 993)</li>
                        <li>• Outlook: smtp-mail.outlook.com (port 587) / outlook.office365.com (port 993)</li>
                        <li>• Other providers: Check your email provider's support documentation</li>
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">2. Create an App Password (Recommended)</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        For Gmail and Outlook, create an app-specific password instead of using your main password:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• <strong>Gmail:</strong> <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google App Passwords</a></li>
                        <li>• <strong>Outlook:</strong> Account Security → App Passwords</li>
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">3. Configure in AlacarteChat</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Go to Settings → Channels → Email to add your email account with the credentials above.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={progress.channelSetupComplete.email}
                    onCheckedChange={() => markChannelComplete("email")}
                  />
                  <Label className="cursor-pointer" onClick={() => markChannelComplete("email")}>
                    I've configured my email account
                  </Label>
                </div>
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
                Connect WhatsApp Business API for professional messaging
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
                    <CardTitle>What You'll Need</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <p className="text-sm">Meta Business Account (create at <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">business.facebook.com</a>)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <p className="text-sm">WhatsApp Business API access</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1" />
                      <p className="text-sm">Phone number for WhatsApp Business</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Step-by-Step Guide</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">1. Create Meta Business Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Visit <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta Business Suite</a> and create an account if you don't have one.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">2. Set Up WhatsApp Business API</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta for Developers</a>:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Create a new app and select "Business" type</li>
                        <li>• Add WhatsApp product to your app</li>
                        <li>• Complete the business verification process</li>
                        <li>• Add a phone number for WhatsApp</li>
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">3. Get Your API Credentials</h4>
                      <p className="text-sm text-muted-foreground mb-2">From your WhatsApp Business App, copy:</p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• <strong>Access Token</strong> (from API Setup section)</li>
                        <li>• <strong>Phone Number ID</strong> (from your phone number settings)</li>
                        <li>• <strong>Business Account ID</strong> (from app settings)</li>
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">4. Configure Webhook</h4>
                      <p className="text-sm text-muted-foreground">
                        In Settings → Channels → WhatsApp, you'll find your webhook URL to add in Meta's webhook settings.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <AlertDescription>
                    💡 <strong>Tip:</strong> WhatsApp Business API requires business verification. This process can take 1-2 weeks.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={progress.channelSetupComplete.whatsapp}
                    onCheckedChange={() => markChannelComplete("whatsapp")}
                  />
                  <Label className="cursor-pointer" onClick={() => markChannelComplete("whatsapp")}>
                    I've configured WhatsApp Business API
                  </Label>
                </div>
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
                    <p className="text-sm text-muted-foreground">
                      Create a Twilio account at <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com</a>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Get your Account SID and Auth Token</li>
                      <li>• Purchase a phone number</li>
                      <li>• Configure in Settings → Channels → SMS</li>
                    </ul>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={progress.channelSetupComplete.sms}
                        onCheckedChange={() => markChannelComplete("sms")}
                      />
                      <Label className="cursor-pointer" onClick={() => markChannelComplete("sms")}>
                        SMS configured
                      </Label>
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
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Connect your Facebook Page</li>
                      <li>• Grant Messenger permissions</li>
                      <li>• Configure in Settings → Channels → Facebook</li>
                    </ul>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={progress.channelSetupComplete.facebook}
                        onCheckedChange={() => markChannelComplete("facebook")}
                      />
                      <Label className="cursor-pointer" onClick={() => markChannelComplete("facebook")}>
                        Facebook configured
                      </Label>
                    </div>
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
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Convert to Instagram Business Account</li>
                      <li>• Connect to Facebook Page</li>
                      <li>• Configure in Settings → Channels → Instagram</li>
                    </ul>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={progress.channelSetupComplete.instagram}
                        onCheckedChange={() => markChannelComplete("instagram")}
                      />
                      <Label className="cursor-pointer" onClick={() => markChannelComplete("instagram")}>
                        Instagram configured
                      </Label>
                    </div>
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
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Customize your widget appearance</li>
                      <li>• Get embed code</li>
                      <li>• Add to your website's HTML</li>
                      <li>• Configure in Settings → Channels → Website Chat Widget</li>
                    </ul>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={progress.channelSetupComplete.website}
                        onCheckedChange={() => markChannelComplete("website")}
                      />
                      <Label className="cursor-pointer" onClick={() => markChannelComplete("website")}>
                        Website widget configured
                      </Label>
                    </div>
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
                Configure your team, statuses, and templates
              </p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle>Team Members</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add team members and assign roles to collaborate effectively.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Go to Settings → Staff & Teams</li>
                  <li>• Invite team members via email</li>
                  <li>• Assign roles (Admin, Agent, Viewer)</li>
                  <li>• Set up teams for organized workflows</li>
                </ul>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={progress.configurationComplete.team}
                    onCheckedChange={() => markConfigComplete("team")}
                  />
                  <Label className="cursor-pointer" onClick={() => markConfigComplete("team")}>
                    Team members configured
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tags className="w-5 h-5 text-primary" />
                  <CardTitle>Conversation Statuses</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create custom statuses to organize and track conversations.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Go to Settings → Statuses</li>
                  <li>• Create statuses (e.g., New, In Progress, Resolved)</li>
                  <li>• Assign colors for easy identification</li>
                  <li>• Set up auto-task creation rules</li>
                </ul>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={progress.configurationComplete.statuses}
                    onCheckedChange={() => markConfigComplete("statuses")}
                  />
                  <Label className="cursor-pointer" onClick={() => markConfigComplete("statuses")}>
                    Statuses configured
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle>Message Templates</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create quick replies and templates for common responses.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Go to Settings → Quick Replies</li>
                  <li>• Create templates for FAQs</li>
                  <li>• Use placeholders for personalization</li>
                  <li>• Set up WhatsApp message templates (if applicable)</li>
                </ul>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={progress.configurationComplete.templates}
                    onCheckedChange={() => markConfigComplete("templates")}
                  />
                  <Label className="cursor-pointer" onClick={() => markConfigComplete("templates")}>
                    Templates configured
                  </Label>
                </div>
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
                <Button onClick={nextStep}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
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
