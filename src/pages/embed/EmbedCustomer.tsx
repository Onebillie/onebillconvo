import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, Customer, Message } from "@/types/chat";
import { ContactList } from "@/components/chat/ContactList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmbedCustomer() {
  const { customerId } = useParams<{ customerId: string }>();
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('apiKey');
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Fetch customer data and conversations
  useEffect(() => {
    if (!apiKey) {
      setError('API key is required. Add ?apiKey=YOUR_KEY to the URL');
      setLoading(false);
      return;
    }

    if (!customerId) {
      setError('Customer ID is required in the URL');
      setLoading(false);
      return;
    }

    fetchCustomerData();
  }, [apiKey, customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabaseUrl = 'https://jrtlrnfdqfkjlkpfirzr.supabase.co';
      const url = new URL(`${supabaseUrl}/functions/v1/embed-fetch-customer-data`);
      url.searchParams.append('customer_id', customerId!);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-api-key': apiKey!,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch customer data');
      }

      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Failed to fetch customer data');

      setCustomer(data.customer);
      setBusinessId(data.business?.id || null);
      
      // Map conversations to include customer data
      const conversationsWithCustomer = (data.conversations || []).map((conv: any) => ({
        ...conv,
        customer: data.customer
      }));
      
      setConversations(conversationsWithCustomer);

      // Auto-select first conversation if available
      if (conversationsWithCustomer.length > 0) {
        setSelectedConversation(conversationsWithCustomer[0]);
      }

    } catch (err: any) {
      console.error('Error fetching customer data:', err);
      setError(err.message || 'Failed to load customer data');
      toast({
        title: "Error",
        description: err.message || 'Failed to load customer data',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);

      // Use service role through edge function for consistent access
      const { data, error } = await supabase.functions.invoke(
        'embed-fetch-messages',
        {
          headers: { 'x-api-key': apiKey! },
          body: { conversation_id: conversationId }
        }
      );

      if (error) throw error;
      
      setMessages(data.messages || []);

    } catch (err: any) {
      console.error('Error fetching messages:', err);
      toast({
        title: "Error",
        description: 'Failed to load messages',
        variant: "destructive"
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedConversation || !businessId) return;

    try {
      // Send message through edge function
      const { data, error } = await supabase.functions.invoke(
        'embed-send-message',
        {
          headers: { 'x-api-key': apiKey! },
          body: {
            conversation_id: selectedConversation.id,
            content,
            business_id: businessId,
            customer_id: customerId
          }
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message sent successfully"
      });

      // Refresh messages
      fetchMessages(selectedConversation.id);

    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({
        title: "Error",
        description: err.message || 'Failed to send message',
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 p-6 max-w-md">
          <h2 className="text-xl font-semibold text-destructive">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">{customer?.name || 'Customer'}</h2>
          <p className="text-sm text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <ContactList
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
            />
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">
                {selectedConversation.customer?.name || 'Conversation'}
              </h3>
              {selectedConversation.status && (
                <p className="text-sm text-muted-foreground">
                  Status: {selectedConversation.status}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <MessageList
                  messages={messages}
                />
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-border">
              <MessageInput
                conversationId={selectedConversation.id}
                customerId={customerId}
                onMessageSent={handleSendMessage}
                embedMode={true}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
