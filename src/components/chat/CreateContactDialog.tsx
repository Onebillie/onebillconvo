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
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
    whatsappPhone: "",
    facebookUsername: "",
    instagramUsername: "",
  });

  const hasUnsavedChanges = open && (
    formData.name !== "" || 
    formData.phone !== "" || 
    formData.email !== "" || 
    formData.whatsappPhone !== "" || 
    formData.facebookUsername !== "" || 
    formData.instagramUsername !== ""
  );
  
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
      if (savedData && (savedData.name || savedData.phone || savedData.email || savedData.whatsappPhone || savedData.facebookUsername || savedData.instagramUsername)) {
        setFormData({
          name: savedData.name || "",
          phone: savedData.phone || "",
          email: savedData.email || "",
          whatsappPhone: savedData.whatsappPhone || "",
          facebookUsername: savedData.facebookUsername || "",
          instagramUsername: savedData.instagramUsername || "",
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
      // Get user's business_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: businessUser, error: businessError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (businessError || !businessUser) {
        throw new Error("No business found for user");
      }

      // Create customer
      const { data: customer, error: customerError } = await (supabase as any)
        .from("customers")
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          whatsapp_phone: formData.whatsappPhone || formData.phone,
          facebook_username: formData.facebookUsername || null,
          instagram_username: formData.instagramUsername || null,
          business_id: businessUser.business_id,
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
          business_id: businessUser.business_id,
        });

      if (conversationError) throw conversationError;

      toast({
        title: "Contact created",
        description: "New contact added successfully.",
      });

      clearSavedData();
      setFormData({ name: "", phone: "", email: "", whatsappPhone: "", facebookUsername: "", instagramUsername: "" });
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
        <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
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

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Contact Methods</h4>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone / SMS *</Label>
              <PhoneInput
                id="phone"
                value={formData.phone}
                onValueChange={(value) =>
                  setFormData({ ...formData, phone: value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Irish format: +353 85 800 7335
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappPhone">WhatsApp Phone (Optional)</Label>
              <PhoneInput
                id="whatsappPhone"
                value={formData.whatsappPhone}
                onValueChange={(value) =>
                  setFormData({ ...formData, whatsappPhone: value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use phone number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="facebookUsername">Facebook Username (Optional)</Label>
              <Input
                id="facebookUsername"
                value={formData.facebookUsername}
                onChange={(e) =>
                  setFormData({ ...formData, facebookUsername: e.target.value })
                }
                placeholder="@username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagramUsername">Instagram Username (Optional)</Label>
              <Input
                id="instagramUsername"
                value={formData.instagramUsername}
                onChange={(e) =>
                  setFormData({ ...formData, instagramUsername: e.target.value })
                }
                placeholder="@username"
              />
            </div>
          </div>

          <Button onClick={handleCreate} disabled={creating} className="w-full mt-4">
            Create Contact
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
