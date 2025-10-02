import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  currentContent: string;
  onSuccess: () => void;
}

export const EditMessageDialog = ({ 
  open, 
  onOpenChange, 
  messageId, 
  currentContent,
  onSuccess 
}: EditMessageDialogProps) => {
  const [content, setContent] = useState(currentContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: content.trim() })
        .eq('id', messageId);

      if (error) throw error;

      toast.success("Message updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating message:', error);
      toast.error("Failed to update message");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message content..."
            rows={6}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
