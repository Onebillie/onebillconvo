import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, Calendar } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  alternate_emails?: string[];
  created_at: string;
}

interface Conversation {
  id: string;
  customer_id: string;
  created_at: string;
  last_message_at: string;
}

// Full row type used for fresh fetches during merge
interface DbConversation {
  id: string;
  customer_id: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
  whatsapp_account_id: string | null;
}

interface MergeConversationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateCustomers: Customer[];
  conversations: Conversation[];
  onMergeComplete: (canonicalConversationId?: string) => void;
}

export const MergeConversationsDialog = ({
  open,
  onOpenChange,
  duplicateCustomers,
  conversations,
  onMergeComplete,
}: MergeConversationsDialogProps) => {
  const [primaryCustomerId, setPrimaryCustomerId] = useState<string>("");
  const [defaultEmail, setDefaultEmail] = useState<string>("");
  const [merging, setMerging] = useState(false);

  // Collect all unique emails whenever customers change
  const allUniqueEmails = Array.from(
    new Set(
      duplicateCustomers.flatMap((c) => [
        c.email,
        ...(c.alternate_emails || []),
      ].filter(Boolean) as string[])
    )
  );

  const handleMerge = async () => {
    if (!primaryCustomerId) {
      toast({
        title: "Selection Required",
        description: "Please select the primary contact to keep",
        variant: "destructive",
      });
      return;
    }

    if (!defaultEmail) {
      toast({
        title: "Email Required",
        description: "Please select the default email address",
        variant: "destructive",
      });
      return;
    }

    setMerging(true);

    try {
      const duplicateIds = duplicateCustomers
        .filter(c => c.id !== primaryCustomerId)
        .map(c => c.id);

      console.log('Calling admin-merge-customers:', {
        primary_customer_id: primaryCustomerId,
        duplicate_customer_ids: duplicateIds,
        default_email: defaultEmail,
      });

      const { data, error } = await supabase.functions.invoke('admin-merge-customers', {
        body: {
          primary_customer_id: primaryCustomerId,
          duplicate_customer_ids: duplicateIds,
          default_email: defaultEmail,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Merge failed');

      console.log('Merge successful:', data);
      
      toast({
        title: "Contacts Merged",
        description: `Successfully merged ${duplicateIds.length} duplicate contact(s)`,
      });
      
      // Pass the canonical conversation ID to parent so it can be selected
      onMergeComplete(data.canonical_conversation_id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error merging contacts:", error);
      toast({
        title: "Merge Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Duplicate Contacts</DialogTitle>
          <DialogDescription>
            Multiple contacts found with the same email or phone number. Select which contact
            to keep as the primary record. All conversations will be merged into the selected contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={primaryCustomerId} onValueChange={setPrimaryCustomerId}>
            {duplicateCustomers.map((customer) => {
              const customerConvs = conversations.filter(
                (c) => c.customer_id === customer.id
              );
              
              return (
                <div
                  key={customer.id}
                  className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent"
                >
                  <RadioGroupItem value={customer.id} id={customer.id} className="mt-1" />
                  <Label
                    htmlFor={customer.id}
                    className="flex-1 cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-base">{customer.name}</span>
                      <Badge variant="secondary">{customerConvs.length} conversations</Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.alternate_emails && customer.alternate_emails.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span className="text-xs">
                            Alternate: {customer.alternate_emails.join(", ")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">
                          Created {new Date(customer.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {allUniqueEmails.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="default-email" className="text-sm font-medium">
                Default Email Address
              </Label>
              <Select value={defaultEmail} onValueChange={setDefaultEmail}>
                <SelectTrigger id="default-email">
                  <SelectValue placeholder="Select the primary email address" />
                </SelectTrigger>
                <SelectContent>
                  {allUniqueEmails.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This will be the main email for the merged contact. All others will be stored as alternates.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">What happens during merge:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>All conversations will be transferred to the selected contact</li>
              <li>If multiple active conversations exist, their messages are merged into one by timestamp and duplicates are removed</li>
              <li>All email addresses will be stored as alternate emails</li>
              <li>Duplicate contacts will be deleted</li>
              <li>Conversation timestamps will be preserved</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={merging}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={!primaryCustomerId || !defaultEmail || merging}>
            {merging ? "Merging..." : "Merge Contacts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};