import { useState, useEffect } from 'react';
import { Users, PhoneForwarded } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CallTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callSid: string;
  onSuccess?: () => void;
}

export const CallTransferDialog = ({
  open,
  onOpenChange,
  callSid,
  onSuccess,
}: CallTransferDialogProps) => {
  const { currentBusinessId } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferType, setTransferType] = useState<'warm' | 'cold'>('cold');
  const [notes, setNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (open && currentBusinessId) {
      fetchStaffAndDepartments();
    }
  }, [open, currentBusinessId]);

  const fetchStaffAndDepartments = async () => {
    // Fetch staff members
    const { data: businessUsers } = await supabase
      .from('business_users')
      .select('user_id')
      .eq('business_id', currentBusinessId);

    if (businessUsers) {
      const userIds = businessUsers.map(u => u.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, department_id')
        .in('id', userIds);

      if (profiles) {
        setStaff(profiles);
      }
    }

    // Fetch departments
    const { data: depts } = await supabase
      .from('departments')
      .select('id, name')
      .eq('business_id', currentBusinessId);

    if (depts) {
      setDepartments(depts);
    }
  };

  const handleTransfer = async () => {
    if (!transferTarget) {
      toast({
        title: 'Error',
        description: 'Please select a transfer target',
        variant: 'destructive',
      });
      return;
    }

    setTransferring(true);

    try {
      const { error } = await supabase.functions.invoke('twilio-call-transfer', {
        body: {
          callSid,
          targetStaffUserId: transferTarget,
          transferType,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Call Transferred',
        description: 'The call has been transferred successfully',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Transfer error:', error);
      toast({
        title: 'Transfer Failed',
        description: 'Could not transfer the call',
        variant: 'destructive',
      });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneForwarded className="h-5 w-5" />
            Transfer Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Transfer To *</Label>
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member or department" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Staff Members
                </div>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
                {departments.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Departments
                    </div>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={`dept:${dept.id}`}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {dept.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Transfer Type</Label>
            <RadioGroup value={transferType} onValueChange={(v: any) => setTransferType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cold" id="cold" />
                <Label htmlFor="cold" className="font-normal">
                  Cold Transfer (immediate handoff)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="warm" id="warm" />
                <Label htmlFor="warm" className="font-normal">
                  Warm Transfer (brief the recipient first)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for the receiving staff member..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={transferring}>
            {transferring ? 'Transferring...' : 'Transfer Call'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
