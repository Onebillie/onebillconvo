import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, Image as ImageIcon, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { VoiceRecorder } from "./VoiceRecorder";
import { EmojiPicker } from "./EmojiPicker";
import { cn } from "@/lib/utils";
import { Customer } from "@/types/chat";
import { populateTemplateWithContactData } from "@/lib/templateUtils";

interface MessageInputProps {
  conversationId: string;
  customerId: string;
  customerPhone: string;
  customerEmail?: string;
  lastContactMethod?: "whatsapp" | "email";
  onMessageSent: () => void;
  customer?: Customer;
}

export const MessageInput = ({
  conversationId,
  customerId,
  customerPhone,
  customerEmail,
  lastContactMethod = "whatsapp",
  onMessageSent,
  customer,
}: MessageInputProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [voiceNote, setVoiceNote] = useState<{ blob: Blob; duration: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sendVia, setSendVia] = useState<"whatsapp" | "email">(lastContactMethod);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!newMessage.trim() && attachments.length === 0 && !voiceNote) return;

    setUploading(true);
    try {
      // Populate template variables with contact data if customer is provided
      let processedMessage = newMessage;
      if (customer) {
        processedMessage = populateTemplateWithContactData(newMessage, customer);
      }

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
      } else {
        // Send via WhatsApp
        let attachmentUrls: any[] = [];

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

          // Upload attachments if any (store in customer-specific folder)
          if (attachments.length > 0) {
            for (const file of attachments) {
              const fileExt = file.name.split(".").pop();
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

        // Send message via WhatsApp API
        const { error } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            to: customerPhone,
            message: processedMessage,
            attachments: attachmentUrls,
          },
        });

        if (error) throw error;
      }

      setNewMessage("");
      setAttachments([]);
      setVoiceNote(null);
      onMessageSent();
      
      toast({
        title: "Message sent",
        description: `Your message has been sent via ${sendVia}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
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
        {customerEmail && (
          <div className="flex border rounded-md overflow-hidden" >
            <button
              onClick={() => setSendVia("whatsapp")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                sendVia === "whatsapp"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span className="text-xs font-bold">W</span>
            </button>
            <button
              onClick={() => setSendVia("email")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-l",
                sendVia === "email"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Mail className="h-4 w-4" />
            </button>
          </div>
        )}
        
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
          placeholder={sendVia === "email" ? "Type email message..." : "Type WhatsApp message..."}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !uploading && sendMessage()}
          className="flex-1 min-w-[200px]"
          disabled={uploading}
        />
        <Button 
          onClick={sendMessage} 
          disabled={uploading || (!newMessage.trim() && attachments.length === 0 && !voiceNote)}
          className="ml-auto"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
