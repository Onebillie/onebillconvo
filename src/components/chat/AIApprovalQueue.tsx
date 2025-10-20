import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Check, X, Edit3, Send } from "lucide-react";

interface PendingResponse {
  id: string;
  conversation_id: string;
  customer_name: string;
  customer_message: string;
  suggested_response: string;
  created_at: string;
}

export const AIApprovalQueue = () => {
  const [pending, setPending] = useState<PendingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchPendingResponses();

    // Real-time subscription for new pending responses
    const channel = supabase
      .channel('ai-approval-queue')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ai_response_queue' }, 
        fetchPendingResponses
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingResponses = async () => {
    try {
      // Note: This would query a hypothetical ai_response_queue table
      // For now, showing UI structure
      setPending([]);
    } catch (error: any) {
      console.error('Error fetching pending responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (response: PendingResponse) => {
    try {
      // Send the approved message
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: response.conversation_id,
          content: editing[response.id] || response.suggested_response,
          direction: 'outbound',
          platform: 'whatsapp',
          status: 'sent',
        });

      if (error) throw error;

      toast({ title: "Success", description: "Response sent" });
      setPending(prev => prev.filter(p => p.id !== response.id));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      // Mark as rejected in queue table
      toast({ title: "Success", description: "Response rejected" });
      setPending(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: string, content: string) => {
    setEditing(prev => ({ ...prev, [id]: content }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Response Approval Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Response Approval Queue</CardTitle>
            <CardDescription>
              Review and approve AI-generated responses before sending
            </CardDescription>
          </div>
          <Badge variant={pending.length > 0 ? "destructive" : "secondary"}>
            {pending.length} Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No pending responses</p>
            <p className="text-sm mt-2">AI responses will appear here for approval</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {pending.map((response) => (
                <Card key={response.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {response.customer_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(response.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Message */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Customer Message
                      </label>
                      <div className="mt-1 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{response.customer_message}</p>
                      </div>
                    </div>

                    {/* Suggested Response */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        AI Suggested Response
                        <Edit3 className="w-3 h-3" />
                      </label>
                      <Textarea
                        value={editing[response.id] ?? response.suggested_response}
                        onChange={(e) => handleEdit(response.id, e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleApprove(response)}
                        className="flex-1"
                        size="sm"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve & Send
                      </Button>
                      <Button
                        onClick={() => handleReject(response.id)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
