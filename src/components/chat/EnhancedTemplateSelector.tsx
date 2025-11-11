import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Mail, MessageSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  platform: 'whatsapp' | 'email' | 'text';
  is_active: boolean;
  variables?: any;
}

interface EnhancedTemplateSelectorProps {
  conversationId: string;
  customerId: string;
  customerPhone?: string;
  customerEmail?: string;
  onTemplateSent: () => void;
  onOptimisticMessage?: (message: any) => void;
}

export const EnhancedTemplateSelector = ({
  conversationId,
  customerId,
  customerPhone,
  customerEmail,
  onTemplateSent,
  onOptimisticMessage,
}: EnhancedTemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch templates when popover opens
  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("is_active", true)
      .order("usage_count", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
      setTemplates([]);
    } else {
      setTemplates((data || []) as Template[]);
    }
    setLoading(false);
  };

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const sendTemplate = async (template: Template) => {
    setSending(template.id);
    try {
      const tempId = `temp-${Date.now()}`;
      let appliedContent = template.content || '';

      if (template.platform === 'whatsapp') {
        if (!customerPhone) {
          throw new Error("Customer phone number not available");
        }
        // Detect variables in template content like {{1}}, {{2}}, ...
        const variableMatches = (template.content || '').match(/\{\{(\d+)\}\}/g);
        const hasVariables = variableMatches && variableMatches.length > 0;

      const payload: any = {
        to: customerPhone,
        conversation_id: conversationId,
        templateName: (template.variables as any)?.meta_template_name || template.name,
        templateLanguage: (template.variables as any)?.template_language || 'en',
      };

        let values: string[] = [];
        if (hasVariables && variableMatches) {
          const indices = Array.from(new Set(variableMatches.map((v) => parseInt(v.replace(/\{|\}/g, ''), 10)))).sort((a,b)=>a-b);
          values = [];
          for (const idx of indices) {
            const val = window.prompt(`Enter value for {{${idx}}}`, '');
            if (!val) {
              toast({
                title: 'Template variables required',
                description: `You must provide a value for {{${idx}}} to send this template.`,
                variant: 'destructive',
              });
              setSending(null);
              return;
            }
            values.push(val);
          }
          payload.templateVariables = values;

          // Apply variables locally for optimistic preview
          appliedContent = indices.reduce((acc, idx, i) => acc.replace(new RegExp(`\\{\\{${idx}\\}\\}`, 'g'), values[i] || ''), appliedContent);
        }

        // Optimistic message
        onOptimisticMessage?.({
          id: tempId,
          content: appliedContent,
          direction: 'outbound',
          created_at: new Date().toISOString(),
          customer_id: customerId,
          conversation_id: conversationId,
          is_read: true,
          platform: 'whatsapp',
          status: 'sending',
          message_attachments: [],
        });

        const { error } = await supabase.functions.invoke("whatsapp-send", {
          body: payload,
        });
        if (error) throw error;
      } else if (template.platform === 'email') {
        if (!customerEmail) {
          throw new Error("Customer email not available");
        }

        // Optimistic message for email
        onOptimisticMessage?.({
          id: tempId,
          content: appliedContent,
          subject: template.name,
          direction: 'outbound',
          created_at: new Date().toISOString(),
          customer_id: customerId,
          conversation_id: conversationId,
          is_read: true,
          platform: 'email',
          status: 'sending',
          message_attachments: [],
        });

        // Get business_id
        const { data: { user } } = await supabase.auth.getUser();
        const { data: businessData } = await supabase
          .from('business_users')
          .select('business_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        // Insert pending message for bundling
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          customer_id: customerId,
          content: template.content,
          direction: 'outbound',
          platform: 'email',
          channel: 'email',
          status: 'pending',
          is_read: true,
          business_id: businessData?.business_id
        });

        const { error } = await supabase.functions.invoke("email-send-smtp", {
          body: {
            to: customerEmail,
            subject: template.name,
            html: template.content,
            text: template.content,
            conversation_id: conversationId,
            customer_id: customerId,
          },
        });
        if (error) throw error;
      } else {
        // Plain text - insert as regular message (also optimistic)
        onOptimisticMessage?.({
          id: tempId,
          content: appliedContent,
          direction: 'outbound',
          created_at: new Date().toISOString(),
          customer_id: customerId,
          conversation_id: conversationId,
          is_read: true,
          platform: 'text',
          status: 'sending',
          message_attachments: [],
        });

        // Get business_id
        const { data: { user } } = await supabase.auth.getUser();
        const { data: businessData } = await supabase
          .from('business_users')
          .select('business_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        const { error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            customer_id: customerId,
            content: template.content,
            direction: 'outbound',
            platform: 'text',
            channel: 'text',
            status: 'sent',
            is_read: true,
            business_id: businessData?.business_id
          });
        if (error) throw error;
      }

      // Increment usage count
      await supabase
        .from("message_templates")
        .update({ usage_count: (template as any).usage_count + 1 })
        .eq("id", template.id);

      toast({
        title: "Template sent",
        description: `"${template.name}" sent successfully`,
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

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp':
        return <MessageSquare className="w-3 h-3" />;
      case 'email':
        return <Mail className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'whatsapp':
        return 'bg-green-500 text-white';
      case 'email':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        fetchTemplates();
      } else {
        setSearchQuery("");
      }
    }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <FileText className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 bg-background border border-border shadow-lg z-50" 
        align="end"
        sideOffset={8}
      >
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No templates match your search" : "No templates found"}
            </div>
          ) : (
            <div className="p-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => sendTemplate(template)}
                  disabled={sending === template.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors mb-2 disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{template.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge 
                        variant="secondary" 
                        className={`${getPlatformColor(template.platform)} text-[10px] px-1.5 py-0.5 h-5 flex items-center gap-1`}
                      >
                        {getPlatformIcon(template.platform)}
                        {template.platform.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.content}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};