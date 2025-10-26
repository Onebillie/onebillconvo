import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StatusManagement } from "./StatusManagement";
import { Tag } from "lucide-react";

export const StatusesAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
      <AccordionItem value="statuses" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Conversation Statuses</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Create and manage status tags to organize and track conversation states.
          </div>
          <StatusManagement />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};