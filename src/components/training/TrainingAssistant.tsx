import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, X, Minimize2, Maximize2, Send, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RelatedContent {
  id: string;
  title: string;
  category: string;
}

export const TrainingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [relatedContent, setRelatedContent] = useState<RelatedContent[]>([]);
  const { toast } = useToast();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      setIsMinimized(false);
      
      // If a question was provided, auto-send it
      if (e.detail?.question) {
        setInput(e.detail.question);
        // Small delay to ensure component is fully rendered
        setTimeout(() => {
          const trimmedQuestion = e.detail.question.trim();
          if (trimmedQuestion) {
            setMessages(prev => [...prev, { role: 'user', content: trimmedQuestion }]);
            setLoading(true);
            
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (!user) return;
              
              supabase
                .from('business_users')
                .select('business_id')
                .eq('user_id', user.id)
                .single()
                .then(({ data: businessData }) => {
                  supabase.functions.invoke('training-assistant', {
                    body: {
                      question: trimmedQuestion,
                      currentPage: location.pathname + location.search,
                      conversationId,
                      userId: user.id,
                      businessId: businessData?.business_id,
                    },
                  }).then(({ data, error }) => {
                    if (error) throw error;
                    setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
                    setConversationId(data.conversationId);
                    setRelatedContent(data.relatedContent || []);
                    setInput('');
                  }).catch((error) => {
                    console.error('Training assistant error:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to get response. Please try again.',
                      variant: 'destructive',
                    });
                  }).finally(() => {
                    setLoading(false);
                  });
                });
            });
          }
        }, 100);
      }
    };
    
    window.addEventListener('open-training-assistant', handleOpen);
    return () => window.removeEventListener('open-training-assistant', handleOpen);
  }, [conversationId, location.pathname, location.search, toast]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get business ID
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('training-assistant', {
        body: {
          question: userMessage,
          currentPage: location.pathname + location.search,
          conversationId,
          userId: user.id,
          businessId: businessData?.business_id,
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      setConversationId(data.conversationId);
      setRelatedContent(data.relatedContent || []);
    } catch (error: any) {
      console.error('Training assistant error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('training_analytics')
        .insert({
          question: messages[messages.length - 2]?.content || '',
          was_helpful: helpful,
          page_context: location.pathname,
          user_id: user.id,
        });

      toast({
        title: 'Thank you!',
        description: 'Your feedback helps us improve.',
      });
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <GraduationCap className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-50 shadow-2xl transition-all ${
      isMinimized ? 'h-14 w-80' : 'h-[600px] w-96'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          <h3 className="font-semibold">Training Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="h-[420px] p-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-2">Hi! I'm your training assistant.</p>
                <p className="text-sm">Ask me anything about using À La Carte Chat!</p>
                <p className="text-xs mt-2 text-muted-foreground/70">
                  I can help with setup, configuration, features, and troubleshooting.
                </p>
                <div className="mt-6 space-y-2 text-left">
                  <p className="text-xs font-medium">Example questions:</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => setInput('How do I create a WhatsApp template message?')}
                      className="block w-full text-left text-xs p-2 rounded hover:bg-accent transition-colors"
                    >
                      • How do I create a WhatsApp template message?
                    </button>
                    <button
                      onClick={() => setInput('How do I send a broadcast to a customer segment?')}
                      className="block w-full text-left text-xs p-2 rounded hover:bg-accent transition-colors"
                    >
                      • How do I send a broadcast to a customer segment?
                    </button>
                    <button
                      onClick={() => setInput('How do I set up the AI assistant?')}
                      className="block w-full text-left text-xs p-2 rounded hover:bg-accent transition-colors"
                    >
                      • How do I set up the AI assistant?
                    </button>
                    <button
                      onClick={() => setInput('How do I configure team permissions?')}
                      className="block w-full text-left text-xs p-2 rounded hover:bg-accent transition-colors"
                    >
                      • How do I configure team permissions?
                    </button>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`mb-4 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block max-w-[85%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
                
                {/* Feedback buttons for assistant messages */}
                {message.role === 'assistant' && idx === messages.length - 1 && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback(true)}
                      className="h-7"
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      Helpful
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback(false)}
                      className="h-7"
                    >
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      Not helpful
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}

            {/* Related content */}
            {relatedContent.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium mb-2">Related Guides:</p>
                <div className="space-y-1">
                  {relatedContent.map((content) => (
                    <Badge
                      key={content.id}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-secondary/80"
                    >
                      {content.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask a question..."
                className="min-h-[60px] resize-none"
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
