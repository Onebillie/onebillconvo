import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight } from 'lucide-react';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentAssignee?: string;
  onTransferComplete?: () => void;
}

const TRANSFER_REASONS = [
  'Better suited for this team member',
  'Workload balancing',
  'Specialist knowledge required',
  'Department change',
  'Custom reason',
];

export const TransferDialog = ({
  open,
  onOpenChange,
  conversationId,
  currentAssignee,
  onTransferComplete,
}: TransferDialogProps) => {
  const { user, currentBusinessId } = useAuth();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [sendInMail, setSendInMail] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentBusinessId) {
      fetchTeamMembers();
    }
  }, [open, currentBusinessId]);

  const fetchTeamMembers = async () => {
    if (!currentBusinessId) return;

    const { data } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        avatar_url,
        department,
        business_users!inner(business_id)
      `)
      .eq('business_users.business_id', currentBusinessId)
      .eq('is_active', true)
      .neq('id', user?.id);

    setTeamMembers(data || []);
  };

  const handleTransfer = async () => {
    if (!selectedMember || !reason) return;

    setLoading(true);

    try {
      // Update conversation assignment
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          assigned_to: selectedMember,
          transferred_from: currentAssignee || user?.id,
          transferred_at: new Date().toISOString(),
          transfer_reason: reason === 'Custom reason' ? notes : reason,
        })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      // Log the transfer
      const { error: logError } = await supabase
        .from('conversation_transfers')
        .insert([{
          conversation_id: conversationId,
          from_user_id: currentAssignee || user?.id,
          to_user_id: selectedMember,
          reason: reason === 'Custom reason' ? 'Custom' : reason,
          notes: notes || null,
        }]);

      if (logError) throw logError;

      // Create notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: selectedMember,
          type: 'conversation',
          title: 'Conversation Transferred',
          message: `A conversation has been transferred to you${notes ? ': ' + notes : ''}`,
          link_url: `/app/dashboard?conversation=${conversationId}`,
          related_conversation_id: conversationId,
        }]);

      if (notifError) throw notifError;

      // Send In-Mail if requested
      if (sendInMail) {
        const { error: mailError } = await supabase
          .from('internal_messages')
          .insert([{
            business_id: currentBusinessId,
            sender_id: user?.id,
            recipient_id: selectedMember,
            subject: 'Conversation Transfer',
            content: `A conversation has been transferred to you.\n\nReason: ${reason}\n\n${notes ? 'Notes: ' + notes : ''}`,
            priority: 'high',
            related_conversation_id: conversationId,
          }]);

        if (mailError) throw mailError;
      }

      toast({
        title: 'Success',
        description: 'Conversation transferred successfully',
      });

      onOpenChange(false);
      onTransferComplete?.();
    } catch (error) {
      console.error('Transfer error:', error);
      toast({
        title: 'Error',
        description: 'Failed to transfer conversation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transfer Conversation
            <ArrowRight className="w-4 h-4" />
          </DialogTitle>
          <DialogDescription>
            Transfer this conversation to another team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="member">Transfer To</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>
                          {member.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.full_name}</span>
                      {member.department && (
                        <Badge variant="secondary" className="text-xs">
                          {member.department}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason">Transfer Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {TRANSFER_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(reason === 'Custom reason' || notes) && (
            <div>
              <Label htmlFor="notes">
                {reason === 'Custom reason' ? 'Custom Reason' : 'Additional Notes'}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide additional context..."
                rows={3}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="sendInMail"
              checked={sendInMail}
              onCheckedChange={(checked) => setSendInMail(checked as boolean)}
            />
            <Label htmlFor="sendInMail" className="cursor-pointer">
              Send In-Mail notification to recipient
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedMember || !reason || loading}
          >
            {loading ? 'Transferring...' : 'Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
