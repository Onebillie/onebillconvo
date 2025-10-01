import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import { Template } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TemplateSelectorProps {
  templates: Template[];
  customerPhone: string;
  onTemplateSent: () => void;
}

export const TemplateSelector = ({
  templates,
  customerPhone,
  onTemplateSent,
}: TemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const sendTemplate = async (template: Template) => {
    setSending(template.id);
    try {
      const bodyComponent = template.components.find((c) => c.type === "BODY");
      const message = bodyComponent?.text || "";

      const { error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: customerPhone,
          message,
          templateName: template.name,
        },
      });

      if (error) throw error;

      toast({
        title: "Template sent",
        description: `Sent "${template.name}" template successfully.`,
      });

      setOpen(false);
      onTemplateSent();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send template",
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>WhatsApp Message Templates</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(100vh-12rem)] mt-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{template.name}</span>
                      <Badge
                        variant={
                          template.status === "APPROVED" ? "default" : "secondary"
                        }
                      >
                        {template.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{template.language}</Badge>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      {template.components.map(
                        (component, idx) =>
                          component.type === "BODY" &&
                          component.text && (
                            <div key={idx}>
                              <p className="text-sm bg-muted p-2 rounded mb-2">
                                {component.text}
                              </p>
                              <Button
                                onClick={() => sendTemplate(template)}
                                disabled={
                                  sending === template.id ||
                                  template.status !== "APPROVED"
                                }
                                size="sm"
                                className="w-full"
                              >
                                {sending === template.id ? "Sending..." : "Send Template"}
                              </Button>
                            </div>
                          )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
