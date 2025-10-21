import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InMailInbox } from "@/components/inmail/InMailInbox";
import { Inbox } from "lucide-react";

export const InMailAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={["inmail"]} className="w-full space-y-4">
      <AccordionItem value="inmail" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Internal Messaging</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Communicate with your team members through internal messages.
          </div>
          <InMailInbox />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};