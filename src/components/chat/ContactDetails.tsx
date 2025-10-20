import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Pencil, FolderOpen } from "lucide-react";
import { EditContactDialog } from "./EditContactDialog";
import { CustomerMediaLibrary } from "./CustomerMediaLibrary";
import DOMPurify from 'dompurify';

interface ContactDetailsProps {
  customer: Customer;
  onUpdate: () => void;
}

export const ContactDetails = ({ customer, onUpdate }: ContactDetailsProps) => {
  const [notes, setNotes] = useState(customer.notes || "");
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);

  const saveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("customers")
        .update({ notes })
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Customer notes updated successfully.",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 h-full overflow-y-auto">
      <div className="flex flex-col items-center space-y-2 pt-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={customer.avatar} />
          <AvatarFallback className="text-2xl">
            {customer.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">{DOMPurify.sanitize(customer.name, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })}</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditDialogOpen(true)}
            className="h-6 w-6"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        {customer.whatsapp_phone && (
          <div>
            <span className="text-muted-foreground">WhatsApp:</span>{" "}
            <span className="font-medium">{customer.whatsapp_phone}</span>
          </div>
        )}
        {customer.whatsapp_name && (
          <div>
            <span className="text-muted-foreground">WhatsApp Name:</span>{" "}
            <span className="font-medium">{customer.whatsapp_name}</span>
          </div>
        )}
        {customer.phone && (
          <div>
            <span className="text-muted-foreground">Phone:</span>{" "}
            <span className="font-medium">{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div>
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="font-medium">{customer.email}</span>
          </div>
        )}
        {customer.alternate_emails && customer.alternate_emails.length > 0 && (
          <div>
            <span className="text-muted-foreground">Alternate Emails:</span>{" "}
            <span className="font-medium">{customer.alternate_emails.join(", ")}</span>
          </div>
        )}
        {customer.address && (
          <div>
            <span className="text-muted-foreground">Address:</span>{" "}
            <span className="font-medium">{customer.address}</span>
          </div>
        )}
      </div>

      {/* Media Library Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setMediaLibraryOpen(true)}
      >
        <FolderOpen className="w-4 h-4 mr-2" />
        View Media Library
      </Button>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-semibold">Private Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add private notes about this customer..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          className="resize-none text-sm"
        />
        <Button onClick={saveNotes} disabled={saving} className="w-full" size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Notes"}
        </Button>
      </div>

      <EditContactDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={customer}
        onUpdate={onUpdate}
      />

      <CustomerMediaLibrary
        customerId={customer.id}
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
      />
    </div>
  );
};
