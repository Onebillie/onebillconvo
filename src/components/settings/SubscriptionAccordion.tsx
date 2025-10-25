import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SubscriptionSettings } from "./SubscriptionSettings";
import { UsageDashboard } from "./UsageDashboard";
import { VoiceUsageDashboard } from "./VoiceUsageDashboard";
import { AutoTopUpSettings } from "./AutoTopUpSettings";
import { BillingHistory } from "./BillingHistory";
import { CreditCard, BarChart3, Zap, Receipt, Phone } from "lucide-react";

export const SubscriptionAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={["subscription", "usage", "voice-usage"]} className="w-full space-y-4">
      <AccordionItem value="usage" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Usage Dashboard</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <UsageDashboard />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="voice-usage" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Voice Calling Usage</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <VoiceUsageDashboard />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="subscription" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Current Subscription</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <SubscriptionSettings />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="autotopup" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Auto Top-Up</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <AutoTopUpSettings />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="billing" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Billing History</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <BillingHistory />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};