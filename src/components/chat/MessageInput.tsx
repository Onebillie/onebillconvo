import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MessageInputProps {
  conversationId: string;
  customerPhone: string;
  onMessageSent: () => void;
}

export const MessageInput = ({
  conversationId,
  customerPhone,
  onMessageSent,
}: MessageInputProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    setUploading(true);
    try {
      let attachmentUrls: any[] = [];

      // Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${conversationId}/${fileName}`;

          const { error: uploadError, data } = await supabase.storage
            .from("customer_bills")
            .upload(filePath, file);

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
          message: newMessage,
          attachments: attachmentUrls,
        },
      });

      if (error) throw error;

      setNewMessage("");
      setAttachments([]);
      onMessageSent();
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
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

      <div className="flex space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,application/pdf,.doc,.docx"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <Input
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !uploading && sendMessage()}
          className="flex-1"
          disabled={uploading}
        />
        <Button onClick={sendMessage} disabled={uploading || (!newMessage.trim() && attachments.length === 0)}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
