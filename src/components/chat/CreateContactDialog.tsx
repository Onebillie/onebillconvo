import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";
import { useFormAutosave } from "@/hooks/useFormAutosave";


interface CreateContactDialogProps {
  onContactCreated: () => void;
}

export const CreateContactDialog = ({
  onContactCreated,
}: CreateContactDialogProps) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const hasUnsavedChanges = open && (formData.name !== "" || formData.phone !== "" || formData.email !== "");
  
  // Autosave form data
  const { loadSavedData, clearSavedData } = useFormAutosave({
    key: 'create-contact-form',
    values: formData,
    enabled: open && hasUnsavedChanges,
  });

  // Load saved data when dialog opens
  useEffect(() => {
    if (open) {
      const savedData = loadSavedData();
      if (savedData && (savedData.name || savedData.phone || savedData.email)) {
        setFormData({
          name: savedData.name || "",
          phone: savedData.phone || "",
          email: savedData.email || "",
        });
        toast({
          title: "Draft restored",
          description: "Your previous contact draft has been restored.",
        });
      }
    }
  }, [open]);


  const handleCreate = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Create customer
      const { data: customer, error: customerError } = await (supabase as any)
        .from("customers")
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Create conversation
      const { error: conversationError } = await (supabase as any)
        .from("conversations")
        .insert({
          customer_id: customer.id,
          status: "active",
        });

      if (conversationError) throw conversationError;

      toast({
        title: "Contact created",
        description: "New contact added successfully.",
      });

      clearSavedData();
      setFormData({ name: "", phone: "", email: "" });
      setOpen(false);
      onContactCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close this form?"
      );
      if (!confirmClose) return;
    }
    setOpen(newOpen);
  };

  return (
    <>
      <UnsavedChangesGuard 
        hasUnsavedChanges={hasUnsavedChanges}
        message="You have an unsaved contact form. Are you sure you want to leave?"
      />
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          New Contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Customer name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="353871234567"
            />
            <p className="text-xs text-muted-foreground">
              Enter full number with country code (e.g., 353871234567)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="customer@example.com"
            />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            Create Contact
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
