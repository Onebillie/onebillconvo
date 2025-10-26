import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TaskSettings } from "./TaskSettings";
import { CheckSquare } from "lucide-react";

export const TasksAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
      <AccordionItem value="tasks" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Task Configuration</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Configure default task settings, notifications, and automation rules.
          </div>
          <TaskSettings />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};