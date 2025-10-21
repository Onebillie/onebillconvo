import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TeamManagement } from "./TeamManagement";
import { Users } from "lucide-react";

export const TeamsAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={["teams"]} className="w-full space-y-4">
      <AccordionItem value="teams" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Teams & Departments</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Organize your staff into teams for better collaboration and workflow management.
          </div>
          <TeamManagement />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};