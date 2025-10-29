import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, Image as ImageIcon, Mail, Phone, MessageCircle, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import wwwGlobeIcon from "@/assets/www-globe-icon.png";
import { VoiceRecorder } from "./VoiceRecorder";
import { EmojiPicker } from "./EmojiPicker";
import { cn } from "@/lib/utils";
import { Customer } from "@/types/chat";
import { populateTemplateWithContactData } from "@/lib/templateUtils";
import { STRIPE_PRODUCTS, type SubscriptionTier } from "@/lib/stripeConfig";
import { LimitReachedModal } from "@/components/modals/LimitReachedModal";

interface MessageInputProps {
  conversationId: string;
  customerId: string;
  customerPhone: string;
  customerEmail?: string;
  lastContactMethod?: "whatsapp" | "email" | "sms" | "facebook" | "instagram" | "embed";
  onMessageSent: () => void;
  onOptimisticMessage?: (message: any) => void;
  customer?: Customer;
  initialMessage?: string;
}

export const MessageInput = ({
  conversationId,
  customerId,
  customerPhone,
  customerEmail,
  lastContactMethod = "whatsapp",
  onMessageSent,
  onOptimisticMessage,
  customer,
  initialMessage,
}: MessageInputProps) => {
  const storageKey = `message-draft-${conversationId}`;
  const [newMessage, setNewMessage] = useState(() => {
    // Try to restore from sessionStorage first, then use initialMessage
    const saved = sessionStorage.getItem(storageKey);
    return saved || initialMessage || "";
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [voiceNote, setVoiceNote] = useState<{ blob: Blob; duration: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendVia, setSendVia] = useState<"whatsapp" | "email" | "sms" | "facebook" | "instagram" | "embed">(lastContactMethod || "whatsapp");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [currentUsage, setCurrentUsage] = useState(0);
  const [isEmbedActive, setIsEmbedActive] = useState(false);
  const [messageLimit, setMessageLimit] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const sendingRef = useRef(false);

  // Auto-save draft and dispatch event
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const trimmed = newMessage.trim();
      if (trimmed) {
        sessionStorage.setItem(storageKey, newMessage);
        window.dispatchEvent(new CustomEvent('draft-changed', { 
          detail: { conversationId, hasDraft: true } 
        }));
      } else {
        sessionStorage.removeItem(storageKey);
        window.dispatchEvent(new CustomEvent('draft-changed', { 
          detail: { conversationId, hasDraft: false } 
        }));
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [newMessage, storageKey, conversationId]);

  // Load draft and reset state on conversation change
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    setNewMessage(saved || initialMessage || "");
    // Clear attachments and voice notes when switching conversations
    setAttachments([]);
    setVoiceNote(null);
    // Reset channel based on customer's last contact method
    setSendVia(lastContactMethod || "whatsapp");
  }, [conversationId, storageKey, initialMessage, lastContactMethod]);

  // Track embed widget session status via presence
  useEffect(() => {
    if (lastContactMethod !== "embed") {
      setIsEmbedActive(false);
      return;
    }

    const channel = supabase.channel(`embed-presence-${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const hasActiveClients = Object.keys(state).length > 0;
        setIsEmbedActive(hasActiveClients);
      })
      .on('presence', { event: 'join' }, () => {
        setIsEmbedActive(true);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        const hasActiveClients = Object.keys(state).length > 0;
        setIsEmbedActive(hasActiveClients);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, lastContactMethod]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecording = (audioBlob: Blob, duration: number) => {
    setVoiceNote({ blob: audioBlob, duration });
  };

  const sendMessage = async () => {
    // GUARD: Prevent duplicate sends
    if (sendingRef.current || isSending) {
      console.log('Message already sending, ignoring duplicate request');
      return;
    }
    
    if (!newMessage.trim() && attachments.length === 0 && !voiceNote) return;

    sendingRef.current = true;
    setIsSending(true);

    // Initialize attachment URLs array (used for optimistic update)
    let attachmentUrls: any[] = [];

    // Check message limits for WhatsApp sending (only if sending via WhatsApp)
    if (sendVia === "whatsapp") {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (businessData?.business_id) {
        const { data: business } = await supabase
          .from('businesses')
          .select('message_count_current_period, subscription_tier, credit_balance')
          .eq('id', businessData.business_id)
          .single();

        if (business) {
          const tier = business.subscription_tier || 'free';
          const messageLimit = STRIPE_PRODUCTS[tier as SubscriptionTier]?.limits.whatsappSending || 0;
          const currentCount = business.message_count_current_period || 0;
          const creditBalance = business.credit_balance || 0;

          // Check if user has exceeded limits
          if (currentCount >= messageLimit && creditBalance === 0) {
            setCurrentUsage(currentCount);
            setMessageLimit(messageLimit);
            setShowLimitModal(true);
            sendingRef.current = false;
            setIsSending(false);
            return;
          }
        }
      }
    }

    setUploading(true);
    try {
      // Populate template variables with contact data if customer is provided
      let processedMessage = newMessage;
      if (customer) {
        processedMessage = populateTemplateWithContactData(newMessage, customer);
      }

      // Optimistic update immediately for better UX (especially on mobile PWAs)
      const tempId = `temp-${Date.now()}`;
      const optimisticMessageEarly = {
        id: tempId,
        content: processedMessage,
        direction: 'outbound' as const,
        created_at: new Date().toISOString(),
        customer_id: customerId,
        conversation_id: conversationId,
        is_read: true,
        platform: sendVia,
        status: 'sending',
        message_attachments: [] as any[],
      };
      onOptimisticMessage?.(optimisticMessageEarly);

      if (sendVia === "email" && customerEmail) {
        // Get business_id and settings
        const { data: { user } } = await supabase.auth.getUser();
        const { data: businessData } = await supabase
          .from('business_users')
          .select('business_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        // Fetch email subject from business settings
        const { data: settings } = await supabase
          .from('business_settings')
          .select('email_subject_template, company_name')
          .single();

        let emailSubject = settings?.email_subject_template || "Message from {{company_name}}";
        const companyName = settings?.company_name || "Support";
        emailSubject = emailSubject.replace(/\{\{company_name\}\}/g, companyName);
        if (customer?.name) {
          emailSubject = emailSubject.replace(/\{\{customer_name\}\}/g, customer.name);
        }

        // First, insert message as pending for bundling
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            customer_id: customerId,
            content: processedMessage,
            direction: 'outbound',
            platform: 'email',
            channel: 'email',
            status: 'pending',
            is_read: true,
            business_id: businessData?.business_id
          });

        if (insertError) throw insertError;

        // Send via email using SMTP (will check for bundling)
        const { error } = await supabase.functions.invoke("email-send-smtp", {
          body: {
            to: customerEmail,
            subject: emailSubject,
            html: processedMessage,
            text: processedMessage,
            conversation_id: conversationId,
            customer_id: customerId,
          },
        });

        if (error) throw error;
      } else if (sendVia === "sms") {
        // Send via SMS
        const { error } = await supabase.functions.invoke("sms-send", {
          body: {
            customer_id: customerId,
            content: processedMessage,
            conversation_id: conversationId,
          },
        });

        if (error) throw error;
      } else if (sendVia === "facebook") {
        // Send via Facebook Messenger
        const { error } = await supabase.functions.invoke("facebook-send", {
          body: {
            customerId,
            message: processedMessage,
            conversationId,
          },
        });

        if (error) throw error;
      } else if (sendVia === "instagram") {
        // Send via Instagram DM
        const { error } = await supabase.functions.invoke("instagram-send", {
          body: {
            customerId,
            message: processedMessage,
            conversationId,
          },
        });

        if (error) throw error;
      } else if (sendVia === "embed") {
        // Send via embed widget (internal messaging)
        // Get business_id for the message
        const { data: { user } } = await supabase.auth.getUser();
        const { data: businessData } = await supabase
          .from('business_users')
          .select('business_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            customer_id: customerId,
            content: processedMessage,
            direction: 'outbound',
            platform: 'embed',
            status: 'delivered',
            is_read: true,
            business_id: businessData?.business_id
          });

        if (insertError) throw insertError;
      } else {
        // Send via WhatsApp with PERSIST-FIRST strategy
        
        // Get business_id for the message
        const { data: { user } } = await supabase.auth.getUser();
        const { data: businessData } = await supabase
          .from('business_users')
          .select('business_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        // STEP 1: Create pending message in DB FIRST (never lose messages)
        const { data: pendingMsg, error: pendingError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            customer_id: customerId,
            content: processedMessage,
            direction: 'outbound',
            platform: 'whatsapp',
            status: 'pending',
            delivery_status: 'pending',
            is_read: true,
            business_id: businessData?.business_id
          })
          .select()
          .single();

        if (pendingError) {
          throw new Error('Failed to create pending message: ' + pendingError.message);
        }

        console.log('Created pending message:', pendingMsg.id);

        // Upload voice note if exists
        if (voiceNote) {
          const fileName = `voice-${Date.now()}.webm`;
          const filePath = `${conversationId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("customer_bills")
            .upload(filePath, voiceNote.blob);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("customer_bills").getPublicUrl(filePath);

          attachmentUrls.push({
            url: publicUrl,
            filename: fileName,
            type: 'audio/webm',
            duration: voiceNote.duration,
          });
        }

        // Upload attachments if any
        if (attachments.length > 0) {
          for (const file of attachments) {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `customers/${customerId}/media/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("customer_bills")
              .upload(filePath, file, {
                upsert: false
              });

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = supabase.storage.from("customer_bills").getPublicUrl(filePath);

            attachmentUrls.push({
              url: publicUrl,
              filename: file.name,
              type: file.type,
            });
          }
        }

        // STEP 2: Send via WhatsApp API with pending message ID
        const { data, error } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            to: customerPhone,
            message: processedMessage,
            attachments: attachmentUrls,
            conversation_id: conversationId,
            message_id: pendingMsg.id, // Pass the pending message ID
          },
        });

        if (error) {
          console.error('Error sending WhatsApp message:', error);
          // Try to parse detailed error from function response
          let errorTitle = "Failed to send WhatsApp message";
          let errorDetails = error.message || "Please try again";
          
          try {
            if (error.context?.body) {
              const errorBody = typeof error.context.body === 'string' 
                ? JSON.parse(error.context.body) 
                : error.context.body;
              
              if (errorBody.title) errorTitle = errorBody.title;
              if (errorBody.details) {
                // Check if details is an object with error.message
                if (typeof errorBody.details === 'object' && errorBody.details.error?.message) {
                  errorDetails = errorBody.details.error.message;
                } else if (typeof errorBody.details === 'string') {
                  errorDetails = errorBody.details;
                } else {
                  errorDetails = JSON.stringify(errorBody.details);
                }
              } else if (errorBody.error) {
                errorDetails = errorBody.error;
              }
              
              console.error('WhatsApp API error details:', errorBody);
            }
          } catch (parseError) {
            console.error('Could not parse error details:', parseError);
          }
          
          toast({
            title: errorTitle,
            description: errorDetails,
            variant: "destructive",
          });
          return;
        }
      }

      // Clear draft and UI after initiating send (final status will sync via realtime)
      setNewMessage("");
      setAttachments([]);
      setVoiceNote(null);
      sessionStorage.removeItem(storageKey); // Clear saved draft
      // Dispatch draft-changed event to update UI
      window.dispatchEvent(new CustomEvent('draft-changed', { 
        detail: { conversationId, hasDraft: false } 
      }));
      onMessageSent();
      
      toast({
        title: "Message sent",
        description: `Your message has been sent via ${sendVia}.`,
      });
    } catch (error: any) {
      console.error("Send message error:", error);
      
      // Try to parse detailed error from function response
      let errorTitle = "Error";
      let errorDescription = "Failed to send message";
      
      try {
        // Check if error has context body (from Supabase function invoke)
        if (error.context?.body) {
          const parsed = JSON.parse(error.context.body);
          errorTitle = parsed.title || parsed.code || "Error";
          errorDescription = parsed.details?.error?.message || parsed.error || parsed.details || error.message;
        } else if (error.message) {
          errorDescription = error.message;
        }
      } catch (parseError) {
        // Fallback to original error
        errorDescription = error.message || "Failed to send message";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      sendingRef.current = false;
      setIsSending(false);
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border-t border-border">
      {/* Voice note preview */}
      {voiceNote && (
        <div className="mb-2 p-2 bg-muted rounded flex items-center justify-between">
          <span className="text-sm">Voice note ({voiceNote.duration}s)</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setVoiceNote(null)}
            className="h-6 w-6"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="relative bg-muted rounded p-2 flex items-center space-x-2 text-xs"
            >
              {file.type.startsWith("image/") ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Channel selector */}
        <div className="flex border rounded-md overflow-hidden">
          <button
            onClick={() => setSendVia("whatsapp")}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              sendVia === "whatsapp"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            title="WhatsApp"
          >
            <span className="text-xs font-bold">W</span>
          </button>
          {customerEmail && (
            <button
              onClick={() => setSendVia("email")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-l",
                sendVia === "email"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              title="Email"
            >
              <Mail className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={async () => {
              // Check if SMS is configured before allowing selection
              const { data: { user } } = await supabase.auth.getUser();
              const { data: businessData } = await supabase
                .from('business_users')
                .select('business_id')
                .eq('user_id', user?.id)
                .maybeSingle();
              
              if (businessData?.business_id) {
                const { data: smsAccounts } = await supabase
                  .from('sms_accounts')
                  .select('id')
                  .eq('business_id', businessData.business_id)
                  .eq('is_active', true)
                  .limit(1);
                
                if (!smsAccounts || smsAccounts.length === 0) {
                  toast({
                    title: "SMS Not Configured",
                    description: "Please configure your SMS account in Settings → Channels first.",
                    variant: "destructive",
                  });
                  return;
                }
              }
              setSendVia("sms");
            }}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-l",
              sendVia === "sms"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            title="SMS"
          >
            <Phone className="h-4 w-4" />
          </button>
          {customer?.facebook_psid && (
            <button
              onClick={() => setSendVia("facebook")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-l",
                sendVia === "facebook"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              title="Facebook Messenger"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
          {customer?.instagram_id && (
            <button
              onClick={() => setSendVia("instagram")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-l",
                sendVia === "instagram"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              title="Instagram DM"
            >
              <Instagram className="h-4 w-4" />
            </button>
          )}
          {/* Show embed/widget option if the last contact was via embed */}
          {lastContactMethod === "embed" && (
            <button
              onClick={() => setSendVia("embed")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-l",
                sendVia === "embed"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                !isEmbedActive && "opacity-50 cursor-not-allowed"
              )}
              title={isEmbedActive ? "Website Widget (Active)" : "Website Widget (Offline)"}
              disabled={!isEmbedActive}
            >
              <img src={wwwGlobeIcon} alt="WWW" className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,application/pdf,.doc,.docx,audio/*,video/*"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sendVia === "email"}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        
        <EmojiPicker 
          onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
          disabled={uploading}
        />
        
        {sendVia === "whatsapp" && (
          <VoiceRecorder 
            onRecordingComplete={handleVoiceRecording}
            disabled={uploading}
          />
        )}
        
        <Input
          placeholder={
            sendVia === "email" ? "Type email message..." :
            sendVia === "sms" ? "Type SMS message..." :
            sendVia === "facebook" ? "Type Facebook message..." :
            sendVia === "instagram" ? "Type Instagram message..." :
            sendVia === "embed" ? "Type widget message..." :
            "Type WhatsApp message..."
          }
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !uploading && !isSending && sendMessage()}
          className="flex-1 min-w-[200px]"
          disabled={uploading || isSending}
        />
        <Button 
          onClick={sendMessage} 
          disabled={uploading || isSending || (!newMessage.trim() && attachments.length === 0 && !voiceNote)}
          className="ml-auto"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <LimitReachedModal 
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        currentUsage={currentUsage}
        messageLimit={messageLimit}
      />
    </div>
  );
};
