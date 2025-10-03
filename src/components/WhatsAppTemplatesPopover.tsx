import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  platform: string;
  is_active: boolean;
  metadata?: any;
}

interface Props {
  customerPhone: string;
  onTemplateSent: () => void;
}

export const WhatsAppTemplatesPopover = ({ customerPhone, onTemplateSent }: Props) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("platform", "whatsapp")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error("Error loading templates:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTemplate = async (template: Template) => {
    setSending(template.id);
    try {
      const { error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: customerPhone,
          message: template.content,
          templateName: template.metadata?.meta_template_name || template.name,
          templateLanguage: template.metadata?.template_language || "en_US",
        },
      });

      if (error) throw error;

      // increment usage count
      await supabase
        .from("message_templates")
        .update({ usage_count: (template as any).usage_count + 1 })
        .eq("id", template.id);

      toast({
        title: "Template sent",
        description: `Sent "${template.name}" successfully.`,
      });

      setOpen(false);
      onTemplateSent();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send template",
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
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No WhatsApp templates available
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{template.name}</span>
                      <Badge variant="outline" className="capitalize">
                        {template.category}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm bg-muted p-2 rounded mb-2">
                        {template.content}
                      </p>
                      <Button
                        onClick={() => sendTemplate(template)}
                        disabled={sending === template.id}
                        size="sm"
                        className="w-full"
                      >
                        {sending === template.id ? "Sending..." : "Send Template"}
                      </Button>
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
