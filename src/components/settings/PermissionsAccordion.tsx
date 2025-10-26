import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PermissionManager } from "./PermissionManager";
import { Shield } from "lucide-react";

export const PermissionsAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
      <AccordionItem value="permissions" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Access Control</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Control what each team member can access and manage through granular permissions.
          </div>
          <PermissionManager />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};