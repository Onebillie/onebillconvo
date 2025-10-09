import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AIToggleProps {
  conversationId: string;
}

export const AIToggle = ({ conversationId }: AIToggleProps) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAISetting();
  }, [conversationId]);

  const fetchAISetting = async () => {
    const { data } = await supabase
      .from("conversation_ai_settings")
      .select("ai_enabled")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (data) {
      setAiEnabled(data.ai_enabled);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("conversation_ai_settings")
        .upsert({
          conversation_id: conversationId,
          ai_enabled: checked,
        });

      if (error) throw error;
      
      setAiEnabled(checked);
      toast({
        title: checked ? "AI Enabled" : "AI Disabled",
        description: checked
          ? "AI suggestions will be shown for this conversation"
          : "AI suggestions are disabled for this conversation",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI setting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-primary" />
      <Switch
        id="ai-toggle"
        checked={aiEnabled}
        onCheckedChange={handleToggle}
        disabled={loading}
        className="scale-75"
      />
      <Label htmlFor="ai-toggle" className="text-xs cursor-pointer">
        AI
      </Label>
    </div>
  );
};
