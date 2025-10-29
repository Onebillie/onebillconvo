import { useState, useEffect } from 'react';
import { useInMail } from '@/hooks/useInMail';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';

interface InMailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyTo?: any;
  conversationId?: string;
  taskId?: string;
}

export const InMailComposer = ({
  open,
  onOpenChange,
  replyTo,
  conversationId,
  taskId,
}: InMailComposerProps) => {
  const { currentBusinessId } = useAuth();
  const { sendMessage } = useInMail();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    recipient: '',
    subject: '',
    content: '',
    priority: 'normal',
  });

  useEffect(() => {
    if (open && currentBusinessId) {
      fetchTeamMembers();
    }

    if (replyTo) {
      setFormData({
        recipient: replyTo.sender_id,
        subject: `Re: ${replyTo.subject}`,
        content: '',
        priority: 'normal',
      });
    } else if (conversationId) {
      setFormData({
        recipient: '',
        subject: `Regarding conversation`,
        content: '',
        priority: 'normal',
      });
    }
  }, [open, replyTo, conversationId, currentBusinessId]);

  const fetchTeamMembers = async () => {
    if (!currentBusinessId) return;

    // First get business user IDs
    const { data: businessUsers } = await supabase
      .from('business_users')
      .select('user_id')
      .eq('business_id', currentBusinessId);

    if (!businessUsers || businessUsers.length === 0) {
      setTeamMembers([]);
      return;
    }

    const userIds = businessUsers.map(bu => bu.user_id);

    // Then get profiles for those users
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    setTeamMembers(data || []);
  };

  const handleVoiceNote = async (audioBlob: Blob, duration: number) => {
    if (!formData.recipientId || !currentBusinessId) return;

    const formDataToSend = new FormData();
    formDataToSend.append('audio', audioBlob, 'voice-note.webm');
    formDataToSend.append('recipientId', formData.recipientId);
    formDataToSend.append('subject', formData.subject || 'Voice Note');
    formDataToSend.append('businessId', currentBusinessId);
    formDataToSend.append('duration', duration.toString());
    if (conversationId) formDataToSend.append('conversationId', conversationId);
    if (taskId) formDataToSend.append('taskId', taskId);

    try {
      const { error } = await supabase.functions.invoke('inmail-upload-voice-note', {
        body: formDataToSend,
      });

      if (error) throw error;

      toast({ title: 'Voice note sent' });
      setRecordingVoiceNote(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Voice note error:', error);
      toast({ title: 'Failed to send voice note', variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    await sendMessage(
      formData.recipient,
      formData.subject,
      formData.content,
      formData.priority,
      conversationId,
      taskId
    );
    onOpenChange(false);
    setFormData({
      recipient: '',
      subject: '',
      content: '',
      priority: 'normal',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Send an internal message to a team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient">To</Label>
            <Select
              value={formData.recipient}
              onValueChange={(value) =>
                setFormData({ ...formData, recipient: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Message subject"
            />
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Type your message..."
              rows={8}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!formData.recipient || !formData.subject || !formData.content}
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
