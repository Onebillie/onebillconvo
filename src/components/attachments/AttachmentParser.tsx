import { useEffect, useState } from "react";
import { Bot, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ParseResult {
  id: string;
  parse_status: string;
  document_type?: string | null;
  classification_confidence?: number;
  extracted_fields?: any;
  parse_error?: string | null;
  ai_provider?: string;
}

interface AttachmentParserProps {
  attachmentId: string;
  messageId: string;
  onReparse?: () => void;
}

export const AttachmentParser = ({ 
  attachmentId, 
  messageId, 
  onReparse 
}: AttachmentParserProps) => {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reparsing, setReparsing] = useState(false);

  useEffect(() => {
    fetchParseResult();
    subscribeToUpdates();
  }, [attachmentId]);

  const fetchParseResult = async () => {
    const { data, error } = await supabase
      .from('attachment_parse_results')
      .select('*')
      .eq('attachment_id', attachmentId)
      .maybeSingle();

    if (!error && data) {
      setParseResult(data);
    }
    setLoading(false);
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`parse-result-${attachmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attachment_parse_results',
          filter: `attachment_id=eq.${attachmentId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setParseResult(payload.new as ParseResult);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReparse = async () => {
    setReparsing(true);
    try {
      const { error } = await supabase.functions.invoke('parse-attachment', {
        body: {
          attachmentId,
          messageId,
          forceReparse: true
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Re-parsing attachment...');
      onReparse?.();
    } catch (error) {
      console.error('Re-parse error:', error);
      toast.error('Failed to re-parse attachment');
    } finally {
      setReparsing(false);
    }
  };

  if (loading || !parseResult) {
    return null;
  }

  const getStatusIcon = () => {
    switch (parseResult.parse_status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getTooltipContent = () => {
    switch (parseResult.parse_status) {
      case 'pending':
        return "Queued for AI parsing...";
      case 'processing':
        return "AI is parsing attachment...";
      case 'completed':
        return (
          <div className="space-y-1">
            <p className="font-medium">Successfully parsed!</p>
            <div className="text-xs">
              <div>Type: {parseResult.document_type?.replace(/_/g, ' ').toUpperCase()}</div>
              {parseResult.classification_confidence && (
                <div>Confidence: {(parseResult.classification_confidence * 100).toFixed(0)}%</div>
              )}
              {parseResult.ai_provider && (
                <div className="text-muted-foreground mt-1">
                  Provider: {parseResult.ai_provider === 'openai' ? 'OpenAI' : 'Lovable AI'}
                </div>
              )}
            </div>
          </div>
        );
      case 'failed':
        return (
          <div className="space-y-1">
            <p className="font-medium text-destructive">Failed to parse</p>
            {parseResult.parse_error && (
              <p className="text-xs">{parseResult.parse_error}</p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={handleReparse}
              disabled={reparsing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${reparsing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/50 border border-border shrink-0 relative">
            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="absolute -top-0.5 -right-0.5">
              {getStatusIcon()}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
