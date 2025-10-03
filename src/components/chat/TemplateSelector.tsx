import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  platform: string;
  is_active: boolean;
  metadata: any;
}

interface TemplateSelectorProps {
  customerPhone: string;
  onTemplateSent: () => void;
}

export const TemplateSelector = ({
  customerPhone,
  onTemplateSent,
}: TemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("platform", "whatsapp")
        .eq("is_active", true) // ✅ only show approved/active
        .order("name", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTemplate = async (template: Template) => {
    setSending(template.id);
    try {
      const message =
        template.content ||
        template.metadata?.components?.find((c: any) => c.type === "BODY")?.text ||
        "";

      const { error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: customerPhone,
          message,
          templateName: template.metadata?.meta_template_name || template.name,
          templateLanguage: template.metadata?.template_language || "en_US",
        },
      });

      if (error) throw error;

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

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <DialogTitle>Select WhatsApp Template</DialogTitle>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-14rem)] mt-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{template.name}</span>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {template.content}
                    </p>
                    <Button
                      onClick={() => sendTemplate(template)}
                      disabled={sending === template.id}
                      size="sm"
                      className="mt-3 w-full"
                    >
                      {sending === template.id ? "Sending..." : "Send"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};