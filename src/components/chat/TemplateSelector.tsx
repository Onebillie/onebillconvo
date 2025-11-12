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

      // Detect if template has variables like {{1}}, {{2}}, etc.
      const variableMatches = message.match(/\{\{(\d+)\}\}/g);
      const hasVariables = variableMatches && variableMatches.length > 0;

      let templateVariables: string[] = [];

      // If template has variables, collect them from the user
      if (hasVariables && variableMatches) {
        const indices = Array.from(new Set(variableMatches.map((v) => parseInt(v.replace(/\{|\}/g, ""), 10))))
          .sort((a, b) => a - b);

        for (const idx of indices) {
          const val = window.prompt(`Enter value for {{${idx}}}`, "");
          if (!val) {
            toast({
              title: "Template variables required",
              description: `You must provide a value for {{${idx}}} to send this template.`,
              variant: "destructive",
            });
            setSending(null);
            return;
          }
          templateVariables.push(val);
        }
      }

      // Render template content with variables
      let renderedContent = message;
      if (templateVariables.length > 0) {
        templateVariables.forEach((val, idx) => {
          renderedContent = renderedContent.replace(`{{${idx + 1}}}`, val);
        });
      }

      // Get conversation_id, customer_id, business_id
      const { data: { user } } = await supabase.auth.getUser();
      const normalizedPhone = customerPhone.replace(/^\+/, '').replace(/^00/, '');
      
      const { data: customer } = await supabase
        .from('customers')
        .select('id, business_id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (!customer) {
        throw new Error('Customer not found');
      }

      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', customer.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // PERSIST-FIRST: Insert pending message with rendered content
      const { data: pendingMessage, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          customer_id: customer.id,
          business_id: customer.business_id,
          content: renderedContent,
          template_name: template.name,
          template_content: renderedContent,
          template_variables: templateVariables.length > 0 ? templateVariables : null,
          direction: 'outbound',
          platform: 'whatsapp',
          status: 'pending',
          delivery_status: 'pending',
          is_read: true,
        })
        .select()
        .single();

      if (insertError || !pendingMessage) {
        throw new Error('Failed to create pending message');
      }

      // Call whatsapp-send with message_id for delivery updates only
      const { error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: customerPhone,
          templateName: template.name,
          templateLanguage: template.language || "en",
          templateVariables: templateVariables.length > 0 ? templateVariables : undefined,
          conversation_id: conversation.id,
          message_id: pendingMessage.id,
        },
      });

      if (error) throw error;

      toast({
        title: "✅ Template Sent",
        description: `Sent "${template.name}" successfully.`,
      });

      setOpen(false);
      onTemplateSent();
    } catch (error: any) {
      console.error("Error sending template:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to send WhatsApp template",
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