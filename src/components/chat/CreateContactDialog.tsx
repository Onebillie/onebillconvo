import { useState } from "react";
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
        .schema('api')
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
        .schema('api')
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              placeholder="+353..."
            />
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
  );
};
