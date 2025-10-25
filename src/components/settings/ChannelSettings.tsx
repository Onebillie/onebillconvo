import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WhatsAppAccountManagement } from "./WhatsAppAccountManagement";
import { WhatsAppTemplateManagement } from "./WhatsAppTemplateManagement";
import { EmailAccountManagement } from "./EmailAccountManagement";
import { EmailTemplateSettings } from "./EmailTemplateSettings";
import { SmsAccountManagement } from "./SmsAccountManagement";
import { FacebookAccountManagement } from "./FacebookAccountManagement";
import { InstagramAccountManagement } from "./InstagramAccountManagement";
import { TemplateManagement } from "./TemplateManagement";
import { EmbedTokenManagement } from "./EmbedTokenManagement";
import { EmbedAISettings } from "./EmbedAISettings";
import { ChannelConnectionWizard } from "./ChannelConnectionWizard";
import { Globe, MessageSquare, Mail, Phone, Facebook, Instagram, FileText, Sparkles } from "lucide-react";

interface ChannelSettingsProps {
  businessId?: string;
}

export const ChannelSettings = ({ businessId }: ChannelSettingsProps) => {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Wizard Launch Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle>Need Help Getting Started?</CardTitle>
              </div>
              <CardDescription>
                Our Channel Connection Wizard will guide you through setting up all your communication channels,
                team members, and automation in just a few simple steps.
              </CardDescription>
            </div>
            <Button onClick={() => setWizardOpen(true)} className="shrink-0">
              <Sparkles className="w-4 h-4 mr-2" />
              Launch Wizard
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="widget" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Website Chat Widget</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground mb-4">
              Embed a live chat widget on your website to communicate with visitors in real-time.
            </div>
            <Tabs defaultValue="tokens" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tokens">Embed Tokens & Code</TabsTrigger>
                <TabsTrigger value="ai">AI Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="tokens" className="space-y-4 pt-4">
                <EmbedTokenManagement />
              </TabsContent>
              <TabsContent value="ai" className="space-y-4 pt-4">
                {businessId && <EmbedAISettings businessId={businessId} />}
              </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="whatsapp" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">WhatsApp</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <WhatsAppAccountManagement />
            <WhatsAppTemplateManagement />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="email" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Email</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <EmailAccountManagement />
            <EmailTemplateSettings />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sms" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">SMS</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <SmsAccountManagement />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="facebook" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Facebook Messenger</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <FacebookAccountManagement />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="instagram" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Instagram</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <InstagramAccountManagement />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="templates" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Message Templates</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <TemplateManagement />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Wizard Dialog */}
      <ChannelConnectionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        businessId={businessId}
      />
    </div>
  );
};
