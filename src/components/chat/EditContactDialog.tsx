import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onUpdate: () => void;
}

export const EditContactDialog = ({
  open,
  onOpenChange,
  customer,
  onUpdate,
}: EditContactDialogProps) => {
  const [firstName, setFirstName] = useState(customer.first_name || "");
  const [lastName, setLastName] = useState(customer.last_name || "");
  const [whatsappPhone, setWhatsappPhone] = useState(customer.whatsapp_phone || "");
  const [whatsappName, setWhatsappName] = useState(customer.whatsapp_name || "");
  const [email, setEmail] = useState(customer.email || "");
  const [alternateEmails, setAlternateEmails] = useState(
    customer.alternate_emails?.join(", ") || ""
  );
  const [address, setAddress] = useState(customer.address || "");
  const [notes, setNotes] = useState(customer.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast({
        title: "Error",
        description: "First name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Parse alternate emails
      const emailsArray = alternateEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e);

      const { error } = await supabase
        .from("customers")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          name: `${firstName.trim()} ${lastName.trim()}`.trim(), // Auto-generate full name
          whatsapp_phone: whatsappPhone.trim() || null,
          whatsapp_name: whatsappName.trim() || null,
          email: email.trim() || null,
          alternate_emails: emailsArray.length > 0 ? emailsArray : null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        })
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Surname</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappPhone">WhatsApp Phone</Label>
              <Input
                id="whatsappPhone"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="WhatsApp number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappName">WhatsApp Name</Label>
              <Input
                id="whatsappName"
                value={whatsappName}
                onChange={(e) => setWhatsappName(e.target.value)}
                placeholder="Name on WhatsApp"
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address (Default for outbound)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Primary email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternateEmails">Associated Email Addresses</Label>
            <Input
              id="alternateEmails"
              value={alternateEmails}
              onChange={(e) => setAlternateEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Physical address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
