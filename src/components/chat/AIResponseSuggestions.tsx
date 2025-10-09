import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AIResponseSuggestionsProps {
  conversationId: string;
  latestMessage: string;
  onSelectSuggestion: (suggestion: string) => void;
  isVisible: boolean;
}

interface Suggestion {
  text: string;
  confidence: number;
}

export const AIResponseSuggestions = ({
  conversationId,
  latestMessage,
  onSelectSuggestion,
  isVisible,
}: AIResponseSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isVisible && !dismissed && latestMessage) {
      fetchSuggestions();
    }
  }, [conversationId, latestMessage, isVisible]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-suggest-response", {
        body: {
          conversation_id: conversationId,
          latest_message: latestMessage,
        },
      });

      if (error) throw error;
      
      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error: any) {
      console.error("Error fetching AI suggestions:", error);
      // Silently fail - AI suggestions are optional
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible || dismissed || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pb-2">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">AI Suggested Responses</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="h-6 w-6"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(suggestion.text);
                  onSelectSuggestion(suggestion.text);
                  toast({
                    title: "Suggestion copied",
                    description: "Paste it in the message input below",
                  });
                } catch (error) {
                  // Fallback: just pass the text
                  onSelectSuggestion(suggestion.text);
                }
              }}
              className="justify-start text-left h-auto py-2 px-3 hover:bg-primary/10 text-xs whitespace-normal"
              disabled={loading}
            >
              {suggestion.text}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
