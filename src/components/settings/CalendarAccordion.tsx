import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CalendarSettings } from "./CalendarSettings";
import { Calendar } from "lucide-react";

export const CalendarAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={["calendar"]} className="w-full space-y-4">
      <AccordionItem value="calendar" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Calendar Integration</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Sync tasks and events with external calendar applications.
          </div>
          <CalendarSettings />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};