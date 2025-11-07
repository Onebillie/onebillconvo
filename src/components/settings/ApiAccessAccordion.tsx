import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ApiAccessManagement } from "./ApiAccessManagement";
import { EmbedCodeDisplay } from "./EmbedCodeDisplay";
import { WebhookConfiguration } from "./WebhookConfiguration";
import { Key, Webhook } from "lucide-react";

export const ApiAccessAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
      <AccordionItem value="api" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">API Access</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Manage API keys for external integrations and programmatic access.
          </div>
          <ApiAccessManagement />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="embed" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Embed Code</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <EmbedCodeDisplay />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="webhooks" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Customer Lifecycle Webhooks</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Configure webhooks to receive real-time notifications when customers are created or updated.
          </div>
          <WebhookConfiguration />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};