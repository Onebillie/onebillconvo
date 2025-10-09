import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Phone, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SmsAccount {
  id: string;
  name: string;
  provider: string;
  phone_number: string;
  is_active: boolean;
}

export function SmsAccountManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    provider: "twilio",
    phone_number: "",
    account_sid: "",
    auth_token: "",
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['sms-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SmsAccount[];
    }
  });

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      const { data, error } = await supabase
        .from('sms_accounts')
        .insert({
          ...accountData,
          created_by: user?.id,
          business_id: businessData?.business_id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-accounts'] });
      toast({
        title: "SMS account added",
        description: "Your SMS account has been configured successfully.",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding account",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sms_accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-accounts'] });
      toast({
        title: "SMS account deleted",
        description: "The SMS account has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting account",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const toggleAccountMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sms_accounts')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-accounts'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "twilio",
      phone_number: "",
      account_sid: "",
      auth_token: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccountMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMS Accounts</h2>
          <p className="text-muted-foreground">
            Connect SMS providers to send and receive text messages
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add SMS Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add SMS Account</DialogTitle>
              <DialogDescription>
                Configure your Twilio account for SMS messaging
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main SMS Line"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="vonage">Vonage</SelectItem>
                    <SelectItem value="plivo">Plivo</SelectItem>
                    <SelectItem value="messagebird">MessageBird</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+15551234567"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sid">Account SID</Label>
                <Input
                  id="sid"
                  value={formData.account_sid}
                  onChange={(e) => setFormData({ ...formData, account_sid: e.target.value })}
                  placeholder="AC..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Auth Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={formData.auth_token}
                  onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={addAccountMutation.isPending}>
                  {addAccountMutation.isPending ? "Adding..." : "Add Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts && accounts.length > 0 ? (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <CardDescription>{account.phone_number}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Provider:</span>
                    <Badge variant="outline" className="capitalize">{account.provider}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={account.is_active}
                      onCheckedChange={(checked) => 
                        toggleAccountMutation.mutate({ id: account.id, is_active: checked })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteAccountMutation.mutate(account.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Phone className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No SMS accounts configured yet.
              <br />
              Add one to start sending and receiving text messages.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}