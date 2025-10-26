import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AIApprovalQueue } from "@/components/chat/AIApprovalQueue";
import { Shield } from "lucide-react";

export const AIApprovalAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
      <AccordionItem value="approval" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Approval Queue</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Review and approve AI-generated responses before they are sent to customers.
          </div>
          <AIApprovalQueue />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};