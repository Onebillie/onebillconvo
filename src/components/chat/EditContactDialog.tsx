import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Customer } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { Lock } from "lucide-react";

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
  const [phone, setPhone] = useState(customer.phone || "");
  const [email, setEmail] = useState(customer.email || "");
  const [alternateEmails, setAlternateEmails] = useState(
    customer.alternate_emails?.join(", ") || ""
  );
  const [address, setAddress] = useState(customer.address || "");
  const [facebookUsername, setFacebookUsername] = useState(customer.facebook_username || "");
  const [facebookPsid, setFacebookPsid] = useState(customer.facebook_psid || "");
  const [instagramUsername, setInstagramUsername] = useState(customer.instagram_username || "");
  const [instagramId, setInstagramId] = useState(customer.instagram_id || "");
  const [notes, setNotes] = useState(customer.notes || "");
  const [saving, setSaving] = useState(false);

  const formData = {
    firstName,
    lastName,
    whatsappPhone,
    whatsappName,
    phone,
    email,
    alternateEmails,
    address,
    facebookUsername,
    instagramUsername,
    notes,
  };

  const hasUnsavedChanges = open && (
    firstName !== (customer.first_name || "") ||
    lastName !== (customer.last_name || "") ||
    whatsappPhone !== (customer.whatsapp_phone || "") ||
    phone !== (customer.phone || "") ||
    email !== (customer.email || "") ||
    alternateEmails !== (customer.alternate_emails?.join(", ") || "") ||
    address !== (customer.address || "") ||
    facebookUsername !== (customer.facebook_username || "") ||
    instagramUsername !== (customer.instagram_username || "") ||
    notes !== (customer.notes || "")
  );

  const { clearSavedData } = useFormAutosave({
    key: `edit-contact-form-${customer.id}`,
    values: formData,
    enabled: open && hasUnsavedChanges,
  });

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

      const updateData = {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim() || whatsappPhone.trim() || undefined,
        whatsapp_phone: whatsappPhone.trim() || null,
        whatsapp_name: whatsappName.trim() || null,
        email: email.trim() || null,
        alternate_emails: emailsArray.length > 0 ? emailsArray : null,
        address: address.trim() || null,
        facebook_username: facebookUsername.trim() || null,
        instagram_username: instagramUsername.trim() || null,
        notes: notes.trim() || null,
      };
      console.log("Updating customer:", customer.id, updateData);

      const { data, error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", customer.id)
        .select();

      console.log("Update result:", { data, error });

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      
      clearSavedData();
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close this form?"
      );
      if (!confirmClose) return;
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <UnsavedChangesGuard 
        hasUnsavedChanges={hasUnsavedChanges}
        message="You have unsaved contact changes. Are you sure you want to leave?"
      />
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Customer address"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* WhatsApp */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">WhatsApp</h4>
              <div className="space-y-2">
                <Label htmlFor="whatsappPhone">WhatsApp Phone</Label>
                <Input
                  id="whatsappPhone"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="353871234567"
                />
                <p className="text-xs text-muted-foreground">
                  Enter full number with country code
                </p>
              </div>

              {whatsappName && (
                <div className="space-y-2">
                  <Label htmlFor="whatsappName" className="flex items-center gap-2">
                    WhatsApp Name
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    id="whatsappName"
                    value={whatsappName}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically populated from WhatsApp
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Phone & SMS */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Phone & SMS</h4>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="353871234567"
                />
                <p className="text-xs text-muted-foreground">
                  For SMS messages (can be different from WhatsApp)
                </p>
              </div>
            </div>

            <Separator />

            {/* Email */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Email</h4>
              <div className="space-y-2">
                <Label htmlFor="email">Primary Email (Default for outbound)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
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
            </div>

            <Separator />

            {/* Facebook Messenger */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Facebook Messenger</h4>
              <div className="space-y-2">
                <Label htmlFor="facebookUsername">Facebook Username</Label>
                <Input
                  id="facebookUsername"
                  value={facebookUsername}
                  onChange={(e) => setFacebookUsername(e.target.value)}
                  placeholder="@username"
                />
              </div>

              {facebookPsid && (
                <div className="space-y-2">
                  <Label htmlFor="facebookPsid" className="flex items-center gap-2">
                    Facebook PSID
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    id="facebookPsid"
                    value={facebookPsid}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically populated from Facebook
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Instagram */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Instagram</h4>
              <div className="space-y-2">
                <Label htmlFor="instagramUsername">Instagram Username</Label>
                <Input
                  id="instagramUsername"
                  value={instagramUsername}
                  onChange={(e) => setInstagramUsername(e.target.value)}
                  placeholder="@username"
                />
              </div>

              {instagramId && (
                <div className="space-y-2">
                  <Label htmlFor="instagramId" className="flex items-center gap-2">
                    Instagram ID
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    id="instagramId"
                    value={instagramId}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically populated from Instagram
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Private Notes */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Private Notes</h4>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this customer"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
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
    </>
  );
};