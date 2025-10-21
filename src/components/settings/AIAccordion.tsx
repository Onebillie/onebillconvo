import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AIAssistantSettings } from "./AIAssistantSettings";
import { Bot } from "lucide-react";

export const AIAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={["ai"]} className="w-full space-y-4">
      <AccordionItem value="ai" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Assistant Configuration</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Configure AI-powered automated responses, training data, and knowledge base.
          </div>
          <AIAssistantSettings />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};