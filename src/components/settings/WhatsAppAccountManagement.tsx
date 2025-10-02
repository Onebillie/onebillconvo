import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Copy, CheckCircle2, XCircle } from "lucide-react";

interface WhatsAppAccount {
  id: string;
  name: string;
  phone_number: string;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  verify_token: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export function WhatsAppAccountManagement() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    phone_number_id: "",
    business_account_id: "",
    access_token: "",
    is_default: false,
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_accounts")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppAccount[];
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("whatsapp_accounts").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      setIsAddDialogOpen(false);
      setFormData({
        name: "",
        phone_number: "",
        phone_number_id: "",
        business_account_id: "",
        access_token: "",
        is_default: false,
      });
      toast.success("WhatsApp account added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add account: ${error.message}`);
    },
  });

  const toggleAccountMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_accounts")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      toast.success("Account status updated");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase.from("whatsapp_accounts").update({ is_default: false }).neq("id", id);
      
      // Then set the new default
      const { error } = await supabase
        .from("whatsapp_accounts")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      toast.success("Default account updated");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      toast.success("Account deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });

  const copyWebhookUrl = (accountId: string) => {
    const supabaseUrl = "https://jrtlrnfdqfkjlkpfirzr.supabase.co";
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook?account_id=${accountId}`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccountMutation.mutate(formData);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Accounts</h2>
          <p className="text-muted-foreground">Manage multiple WhatsApp Business API accounts</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add WhatsApp Account</DialogTitle>
              <DialogDescription>
                Configure a new WhatsApp Business API account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Business Line"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1234567890"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone_number_id">Phone Number ID</Label>
                <Input
                  id="phone_number_id"
                  value={formData.phone_number_id}
                  onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                  placeholder="From Meta Business Manager"
                  required
                />
              </div>
              <div>
                <Label htmlFor="business_account_id">Business Account ID</Label>
                <Input
                  id="business_account_id"
                  value={formData.business_account_id}
                  onChange={(e) => setFormData({ ...formData, business_account_id: e.target.value })}
                  placeholder="From Meta Business Manager"
                  required
                />
              </div>
              <div>
                <Label htmlFor="access_token">Access Token</Label>
                <Input
                  id="access_token"
                  type="password"
                  value={formData.access_token}
                  onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                  placeholder="Your Meta API access token"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Set as default account</Label>
              </div>
              <Button type="submit" className="w-full" disabled={addAccountMutation.isPending}>
                {addAccountMutation.isPending ? "Adding..." : "Add Account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts && accounts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No WhatsApp accounts configured yet. Add your first account to get started.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {accounts?.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {account.name}
                    {account.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>{account.phone_number}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {account.is_active ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Phone Number ID:</span>
                  <p className="font-mono">{account.phone_number_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Business Account ID:</span>
                  <p className="font-mono">{account.business_account_id}</p>
                </div>
              </div>

              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    readOnly
                    value={`https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/whatsapp-webhook?account_id=${account.id}`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl(account.id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use verify token: <code className="bg-muted px-1 py-0.5 rounded">{account.verify_token}</code>
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={account.is_active}
                      onCheckedChange={(checked) =>
                        toggleAccountMutation.mutate({ id: account.id, is_active: checked })
                      }
                    />
                    <Label>Active</Label>
                  </div>
                  {!account.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(account.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this account?")) {
                      deleteAccountMutation.mutate(account.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
