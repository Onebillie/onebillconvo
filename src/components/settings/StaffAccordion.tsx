import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StaffManagement } from "./StaffManagement";
import { Users, UserPlus } from "lucide-react";

export const StaffAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
      <AccordionItem value="staff" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Team Members</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Manage your staff members, roles, and permissions. Add new team members and control their access levels.
          </div>
          <StaffManagement />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};