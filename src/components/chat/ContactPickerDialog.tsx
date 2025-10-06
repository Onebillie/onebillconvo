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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  avatar: string | null;
  last_contact_method: string | null;
}

interface ContactPickerDialogProps {
  onContactSelected: (customerId: string) => void;
}

export const ContactPickerDialog = ({ onContactSelected }: ContactPickerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, avatar, last_contact_method")
        .order("name");

      if (error) throw error;

      setCustomers(data || []);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCustomer = async (customer: Customer) => {
    try {
      // Check if conversation already exists for this customer
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("is_archived", false)
        .maybeSingle();

      if (existingConv) {
        toast({
          title: "Conversation exists",
          description: "Opening existing conversation",
        });
        onContactSelected(customer.id);
        setOpen(false);
        return;
      }

      // Create new conversation
      const { data: { user } } = await supabase.auth.getUser();
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          customer_id: customer.id,
          status: "active",
          business_id: businessData?.business_id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Conversation started",
        description: `Started new conversation with ${customer.name}`,
      });

      onContactSelected(customer.id);
      setOpen(false);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <UserPlus className="w-4 h-4 mr-2" />
          Message Existing Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No contacts match your search" : "No contacts found"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={customer.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {customer.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {customer.phone}
                        {customer.email && ` • ${customer.email}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
