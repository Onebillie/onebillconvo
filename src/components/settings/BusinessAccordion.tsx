import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BusinessSettings } from "./BusinessSettings";
import { NotificationSettings } from "./NotificationSettings";
import { Building2, Bell, Smartphone } from "lucide-react";

export const BusinessAccordion = () => {
  return (
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
  );
};