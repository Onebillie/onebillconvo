import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BusinessSettings } from "./BusinessSettings";
import { NotificationSettings } from "./NotificationSettings";
import { Building2, Bell, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { MarketingTemplateBuilder } from "@/components/marketing/MarketingTemplateBuilder";
import { TemplateGallery } from "@/components/marketing/TemplateGallery";

export const BusinessAccordion = () => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  return (
    <>
      <Accordion type="multiple" defaultValue={["company", "pwa"]} className="w-full space-y-4">
        <AccordionItem value="company" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Company Information</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground mb-4">
              Manage your business profile, contact details, and branding settings.
            </div>
            <BusinessSettings />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="email-templates" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Email Creator</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Professional Emails</CardTitle>
                <CardDescription>
                  Use the same template builder for both marketing campaigns and transactional emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setShowGallery(true)} variant="outline">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Browse Templates
                  </Button>
                  <Button onClick={() => setShowBuilder(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Create Email
                  </Button>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-sm">
                  <p className="font-semibold mb-2">Two Ways to Use:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Marketing:</strong> Create templates for campaigns and newsletters</li>
                    <li>• <strong>Transactional:</strong> Design emails for confirmations, receipts, notifications</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Browser Notifications</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground mb-4">
              Configure desktop and mobile push notification preferences.
            </div>
            <NotificationSettings />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <MarketingTemplateBuilder
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        onSave={() => setShowBuilder(false)}
      />

      <TemplateGallery
        open={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </>
  );
};