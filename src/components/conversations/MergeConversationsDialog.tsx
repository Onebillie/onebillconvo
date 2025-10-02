import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface MergeConversationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateCustomers: Customer[];
  conversations: Conversation[];
  onMergeComplete: () => void;
}

export const MergeConversationsDialog = ({
  open,
  onOpenChange,
  duplicateCustomers,
  conversations,
  onMergeComplete,
}: MergeConversationsDialogProps) => {
  const [primaryCustomerId, setPrimaryCustomerId] = useState<string>("");
  const [merging, setMerging] = useState(false);

  const handleMerge = async () => {
    if (!primaryCustomerId) {
      toast({
        title: "Selection Required",
        description: "Please select the primary contact to keep",
        variant: "destructive",
      });
      return;
    }

    setMerging(true);

    try {
      const primaryCustomer = duplicateCustomers.find((c) => c.id === primaryCustomerId);
      const otherCustomers = duplicateCustomers.filter((c) => c.id !== primaryCustomerId);

      // Collect all unique emails from all customers
      const allEmails = new Set<string>();
      duplicateCustomers.forEach((customer) => {
        if (customer.email) allEmails.add(customer.email);
        if (customer.alternate_emails) {
          customer.alternate_emails.forEach((email) => allEmails.add(email));
        }
      });

      // Remove the primary email from the set
      if (primaryCustomer?.email) {
        allEmails.delete(primaryCustomer.email);
      }

      // Update primary customer with all alternate emails
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          alternate_emails: Array.from(allEmails),
        })
        .eq("id", primaryCustomerId);

      if (updateError) throw updateError;

      // Move all conversations from other customers to the primary customer
      for (const customer of otherCustomers) {
        const customerConversations = conversations.filter(
          (conv) => conv.customer_id === customer.id
        );

        if (customerConversations.length > 0) {
          const { error: convError } = await supabase
            .from("conversations")
            .update({ customer_id: primaryCustomerId })
            .in(
              "id",
              customerConversations.map((c) => c.id)
            );

          if (convError) throw convError;
        }

        // Delete the duplicate customer
        const { error: deleteError } = await supabase
          .from("customers")
          .delete()
          .eq("id", customer.id);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Contacts Merged",
        description: `Successfully merged ${otherCustomers.length} duplicate contact(s)`,
      });

      onMergeComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error merging contacts:", error);
      toast({
        title: "Merge Failed",
        description: error.message,
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

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">What happens during merge:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>All conversations will be transferred to the selected contact</li>
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
          <Button onClick={handleMerge} disabled={!primaryCustomerId || merging}>
            {merging ? "Merging..." : "Merge Contacts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};