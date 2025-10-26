import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CannedResponses } from "./CannedResponses";
import { MessageSquare } from "lucide-react";

export const QuickRepliesAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
      <AccordionItem value="replies" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Quick Replies</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Create and manage canned responses for common customer questions.
          </div>
          <CannedResponses />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};