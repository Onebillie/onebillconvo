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

/**
 * Helper getters to tolerate the two possible shapes:
 * 1) Meta API template: { id, name, language, status, category, components: [...] }
 * 2) Local DB template (message_templates): { id, name, content, is_active, category, metadata: { template_language, components, meta_template_name } }
 */
const getComponents = (t: any): any[] => {
  if (Array.isArray(t?.components)) return t.components;
  if (Array.isArray(t?.metadata?.components)) return t.metadata.components;
  return [];
};

const getBodyText = (t: any): string => {
  const comps = getComponents(t);
  const body = comps.find((c: any) => c?.type === "BODY");
  // Fall back to content if present (local copy)
  return (body?.text as string) || (t?.content as string) || "";
};

const getLanguage = (t: any): string => {
  return (t?.language as string) || (t?.metadata?.template_language as string) || "en_US";
};

const getTemplateNameForSend = (t: any): string => {
  return (t?.metadata?.meta_template_name as string) || (t?.name as string);
};

const isApproved = (t: any): boolean => {
  // Meta object carries status === "APPROVED"
  if (typeof t?.status === "string") return t.status === "APPROVED";
  // Local DB row uses is_active boolean
  if (typeof t?.is_active === "boolean") return !!t.is_active;
  return false;
};

const getCategory = (t: any): string => {
  return (t?.category as string) || (t?.metadata?.category as string) || "general";
};

const getLanguageBadge = (t: any): string => {
  // Prefer explicit template language code if present
  const lang = getLanguage(t);
  // If nothing else, show platform or plain 'en_US'
  return lang || (t?.platform as string) || "en_US";
};

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
      const message = getBodyText(template);
      const templateName = getTemplateNameForSend(template);
      const templateLanguage = getLanguage(template);

      const { error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: customerPhone,
          message,
          templateName,
          templateLanguage,
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
        description: error?.message || "Failed to send template",
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
          {!templates || templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                const approved = isApproved(template);
                const bodyText = getBodyText(template);
                const langBadge = getLanguageBadge(template);
                const category = getCategory(template);

                return (
                  <Card key={template.id} className="cursor-pointer hover:bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{template.name}</span>
                        <Badge variant={approved ? "default" : "secondary"}>
                          {approved ? "APPROVED" : "INACTIVE"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{langBadge}</Badge>
                          {category && <Badge variant="outline">{category}</Badge>}
                        </div>
                        <div>
                          <p className="text-sm bg-muted p-2 rounded mb-2">
                            {bodyText || "No preview available"}
                          </p>
                          <Button
                            onClick={() => sendTemplate(template)}
                            disabled={sending === template.id || !approved}
                            size="sm"
                            className="w-full"
                          >
                            {sending === template.id ? "Sending..." : "Send Template"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};