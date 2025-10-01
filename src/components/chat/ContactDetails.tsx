import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface ContactDetailsProps {
  customer: Customer;
  onUpdate: () => void;
}

export const ContactDetails = ({ customer, onUpdate }: ContactDetailsProps) => {
  const [notes, setNotes] = useState(customer.notes || "");
  const [saving, setSaving] = useState(false);

  const saveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
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
    <div className="p-4 space-y-4">
      <div className="flex flex-col items-center space-y-2">
        <Avatar className="w-24 h-24">
          <AvatarImage src={customer.avatar} />
          <AvatarFallback className="text-2xl">
            {customer.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="font-semibold text-lg">{customer.name}</h2>
      </div>

      <div className="space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Phone:</span>{" "}
          <span className="font-medium">{customer.phone}</span>
        </div>
        {customer.email && (
          <div className="text-sm">
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="font-medium">{customer.email}</span>
          </div>
        )}
      </div>

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
    </div>
  );
};
