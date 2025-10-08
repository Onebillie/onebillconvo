import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, RefreshCw, Mail, CheckCircle, XCircle, Wifi, FileText, AlertCircle, Pencil, Send, Search, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmailOperationLogsDialog } from "./EmailOperationLogsDialog";
import { ManualImapTestDialog } from "./ManualImapTestDialog";
import { EmailAutoconfigure } from "./EmailAutoconfigure";
import { EmailSetupWizard } from "./EmailSetupWizard";

interface EmailAccount {
  id: string;
  name: string;
  email_address: string;
  inbound_method: 'imap' | 'pop3';
  imap_host: string;
  imap_port: number;
  imap_username: string;
  imap_password: string;
  imap_use_ssl: boolean;
  pop3_host: string;
  pop3_port: number;
  pop3_username: string;
  pop3_password: string;
  pop3_use_ssl: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_use_ssl: boolean;
  is_active: boolean;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
}

export function EmailAccountManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [logsDialogAccount, setLogsDialogAccount] = useState<{ id: string; name: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [manualTestAccount, setManualTestAccount] = useState<EmailAccount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email_address: "",
    inbound_method: 'pop3' as 'imap' | 'pop3',
    imap_host: "",
    imap_port: 993,
    imap_username: "",
    imap_password: "",
    imap_use_ssl: true,
    pop3_host: "",
    pop3_port: 995,
    pop3_username: "",
    pop3_password: "",
    pop3_use_ssl: true,
    smtp_host: "",
    smtp_port: 465,
    smtp_username: "",
    smtp_password: "",
    smtp_use_ssl: true,
    sync_enabled: true,
    sync_interval_minutes: 5,
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailAccount[];
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
        .from('email_accounts')
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
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast({
        title: "Email account added",
        description: "Your email account has been configured successfully.",
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

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, accountData }: { id: string; accountData: typeof formData }) => {
      const { data, error } = await supabase
        .from('email_accounts')
        .update(accountData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast({
        title: "Email account updated",
        description: "Your email account has been updated successfully.",
      });
      setIsAddDialogOpen(false);
      setEditingAccountId(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating account",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast({
        title: "Email account deleted",
        description: "The email account has been removed.",
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

  const syncNowMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const account = accounts?.find(a => a.id === accountId);
      const functionName = account?.inbound_method === 'pop3' ? 'email-sync-pop3' : 'email-sync';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { account_id: accountId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      
      if (data.success) {
        toast({
          title: "Email sync completed",
          description: `Fetched ${data.fetched} emails, processed ${data.processed}`,
        });
      } else {
        toast({
          title: "Sync completed with warnings",
          description: data.error || "Check logs for details",
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      const message = error.message || "Failed to sync emails";
      toast({
        title: "Sync failed",
        description: message,
        variant: "destructive",
      });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setIsTestingConnection(true);
      const { data, error } = await supabase.functions.invoke('imap-test', {
        body: { account_id: accountId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, accountId) => {
      setIsTestingConnection(false);
      if (data.ok) {
        toast({
          title: "Connection successful",
          description: `Connected to ${data.server}:${data.port} in ${data.duration_ms}ms`,
        });
      }
    },
    onError: (error: any, accountId) => {
      setIsTestingConnection(false);
      const message = error.message || "Connection test failed";
      toast({
        title: "Connection failed",
        description: message,
        variant: "destructive",
      });
    }
  });

  const deepImapTestMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setIsTestingConnection(true);
      const { data, error } = await supabase.functions.invoke('imap-test-deep', {
        body: { account_id: accountId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsTestingConnection(false);
      if (data.ok) {
        toast({
          title: "Deep test found working config!",
          description: `Working variant: ${data.working_variant}`,
        });
      } else {
        toast({
          title: "All variants failed",
          description: data.suggestion || "Check logs for details",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsTestingConnection(false);
      toast({
        title: "Deep test failed",
        description: error.message || "Check logs for details",
        variant: "destructive",
      });
    }
  });

  const smtpTestMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke('smtp-test', {
        body: { account_id: accountId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "SMTP test successful",
          description: `Test email sent to ${data.test_email_sent_to}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "SMTP test failed",
        description: error.message || "Check logs for details",
        variant: "destructive",
      });
    }
  });

  const toggleAccountMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('email_accounts')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email_address: "",
      inbound_method: 'pop3' as 'imap' | 'pop3',
      imap_host: "",
      imap_port: 993,
      imap_username: "",
      imap_password: "",
      imap_use_ssl: true,
      pop3_host: "",
      pop3_port: 995,
      pop3_username: "",
      pop3_password: "",
      pop3_use_ssl: true,
      smtp_host: "",
      smtp_port: 465,
      smtp_username: "",
      smtp_password: "",
      smtp_use_ssl: true,
      sync_enabled: true,
      sync_interval_minutes: 5,
    });
  };

  const handleEdit = (account: EmailAccount) => {
    setFormData({
      name: account.name,
      email_address: account.email_address,
      inbound_method: account.inbound_method || 'pop3',
      imap_host: account.imap_host,
      imap_port: account.imap_port,
      imap_username: account.imap_username,
      imap_password: account.imap_password,
      imap_use_ssl: account.imap_use_ssl,
      pop3_host: account.pop3_host || "",
      pop3_port: account.pop3_port || 995,
      pop3_username: account.pop3_username || "",
      pop3_password: account.pop3_password || "",
      pop3_use_ssl: account.pop3_use_ssl ?? true,
      smtp_host: account.smtp_host,
      smtp_port: account.smtp_port,
      smtp_username: account.smtp_username,
      smtp_password: account.smtp_password,
      smtp_use_ssl: account.smtp_use_ssl,
      sync_enabled: account.sync_enabled,
      sync_interval_minutes: account.sync_interval_minutes,
    });
    setEditingAccountId(account.id);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccountId) {
      updateAccountMutation.mutate({ id: editingAccountId, accountData: formData });
    } else {
      addAccountMutation.mutate(formData);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingAccountId(null);
      resetForm();
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Accounts</h2>
          <p className="text-muted-foreground">
            Connect your email accounts to sync emails with your CRM
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Email Account
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAccountId ? "Edit Email Account" : "Add Email Account"}</DialogTitle>
              <DialogDescription>
                {editingAccountId ? "Update your email account configuration" : "Configure your cPanel or other email account for two-way sync"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between">
              <Alert className="flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Some email providers require an "app-specific password" instead of your regular password. 
                  Check your email provider's documentation if authentication fails.
                </AlertDescription>
              </Alert>
              <div className="ml-4">
                <EmailAutoconfigure
                  onApplyConfig={(config) => {
                    setFormData({
                      ...formData,
                      ...config,
                    });
                  }}
                />
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Support Email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email_address}
                  onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                  placeholder="support@yourdomain.com"
                  required
                />
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2 mb-4">
                  <Label htmlFor="inbound_method">Inbound Method</Label>
                  <select
                    id="inbound_method"
                    value={formData.inbound_method}
                    onChange={(e) => setFormData({ ...formData, inbound_method: e.target.value as 'imap' | 'pop3' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="pop3">POP3 (Recommended - simpler, more reliable)</option>
                    <option value="imap">IMAP (Advanced)</option>
                  </select>
                </div>
                
                {formData.inbound_method === 'pop3' ? (
                  <>
                    <h3 className="font-semibold mb-3">POP3 Settings (Incoming Mail)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pop3_host">POP3 Host</Label>
                        <Input
                          id="pop3_host"
                          value={formData.pop3_host}
                          onChange={(e) => setFormData({ ...formData, pop3_host: e.target.value })}
                          placeholder="mail.yourdomain.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pop3_port">Port</Label>
                        <Input
                          id="pop3_port"
                          type="number"
                          value={formData.pop3_port}
                          onChange={(e) => setFormData({ ...formData, pop3_port: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pop3_username">Username</Label>
                        <Input
                          id="pop3_username"
                          value={formData.pop3_username}
                          onChange={(e) => setFormData({ ...formData, pop3_username: e.target.value })}
                          placeholder="support@yourdomain.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pop3_password">Password</Label>
                        <Input
                          id="pop3_password"
                          type="password"
                          value={formData.pop3_password}
                          onChange={(e) => setFormData({ ...formData, pop3_password: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold mb-3">IMAP Settings (Incoming Mail)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imap_host">IMAP Host</Label>
                    <Input
                      id="imap_host"
                      value={formData.imap_host}
                      onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                      placeholder="mail.yourdomain.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap_port">Port</Label>
                    <Input
                      id="imap_port"
                      type="number"
                      value={formData.imap_port}
                      onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap_username">Username</Label>
                    <Input
                      id="imap_username"
                      value={formData.imap_username}
                      onChange={(e) => setFormData({ ...formData, imap_username: e.target.value })}
                      placeholder="support@yourdomain.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap_password">Password</Label>
                    <Input
                      id="imap_password"
                      type="password"
                      value={formData.imap_password}
                      onChange={(e) => setFormData({ ...formData, imap_password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                  </>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">SMTP Settings (Outgoing Mail)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">SMTP Host</Label>
                    <Input
                      id="smtp_host"
                      value={formData.smtp_host}
                      onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                      placeholder="mail.yourdomain.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">Port</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_username">Username</Label>
                    <Input
                      id="smtp_username"
                      value={formData.smtp_username}
                      onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                      placeholder="support@yourdomain.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">Password</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      value={formData.smtp_password}
                      onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync_enabled">Enable Email Sync</Label>
                  <Switch
                    id="sync_enabled"
                    checked={formData.sync_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, sync_enabled: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sync_interval">Sync Interval (minutes)</Label>
                  <Input
                    id="sync_interval"
                    type="number"
                    value={formData.sync_interval_minutes}
                    onChange={(e) => setFormData({ ...formData, sync_interval_minutes: parseInt(e.target.value) })}
                    min={1}
                    max={60}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addAccountMutation.isPending || updateAccountMutation.isPending}>
                  {editingAccountId 
                    ? (updateAccountMutation.isPending ? "Updating..." : "Update Account")
                    : (addAccountMutation.isPending ? "Adding..." : "Add Account")
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!accounts || accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              No email accounts configured yet.<br />
              Add your first email account to start syncing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {account.name}
                      {account.is_active ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription>{account.email_address}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(account)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {account.inbound_method === 'imap' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLogsDialogAccount({ id: account.id, name: account.name });
                            testConnectionMutation.mutate(account.id);
                          }}
                          disabled={testConnectionMutation.isPending || deepImapTestMutation.isPending}
                        >
                          <Wifi className="w-4 h-4 mr-2" />
                          {testConnectionMutation.isPending ? "Testing..." : "Test IMAP"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLogsDialogAccount({ id: account.id, name: account.name });
                            deepImapTestMutation.mutate(account.id);
                          }}
                          disabled={testConnectionMutation.isPending || deepImapTestMutation.isPending}
                        >
                          <Search className="w-4 h-4 mr-2" />
                          {deepImapTestMutation.isPending ? "Testing..." : "Deep IMAP"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLogsDialogAccount({ id: account.id, name: account.name });
                            smtpTestMutation.mutate(account.id);
                          }}
                          disabled={smtpTestMutation.isPending}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {smtpTestMutation.isPending ? "Sending..." : "Test SMTP"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualTestAccount(account)}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Manual Test
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLogsDialogAccount({ id: account.id, name: account.name })}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Logs
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncNowMutation.mutate(account.id)}
                      disabled={!account.is_active || syncNowMutation.isPending}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAccountMutation.mutate(account.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <Switch
                      checked={account.is_active}
                      onCheckedChange={(checked) =>
                        toggleAccountMutation.mutate({ id: account.id, is_active: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Inbound Method</span>
                    <span className="uppercase font-semibold">{account.inbound_method || 'IMAP'}</span>
                  </div>
                  {account.inbound_method === 'pop3' ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">POP3 Server</span>
                      <span>{account.pop3_host}:{account.pop3_port}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">IMAP Server</span>
                      <span>{account.imap_host}:{account.imap_port}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SMTP Server</span>
                    <span>{account.smtp_host}:{account.smtp_port}</span>
                  </div>
                  {account.last_sync_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Synced</span>
                      <span>{new Date(account.last_sync_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {logsDialogAccount && (
        <EmailOperationLogsDialog
          accountId={logsDialogAccount.id}
          accountName={logsDialogAccount.name}
          open={!!logsDialogAccount}
          onOpenChange={(open) => !open && setLogsDialogAccount(null)}
          liveMode={isTestingConnection}
        />
      )}

      {manualTestAccount && (
        <ManualImapTestDialog
          open={!!manualTestAccount}
          onOpenChange={(open) => !open && setManualTestAccount(null)}
          defaultHost={manualTestAccount.imap_host}
          defaultPort={manualTestAccount.imap_port}
          defaultUsername={manualTestAccount.imap_username}
          defaultUseSsl={manualTestAccount.imap_use_ssl}
          onSuccess={async (config) => {
            // Update the account with the working configuration
            await updateAccountMutation.mutateAsync({
              id: manualTestAccount.id,
              accountData: {
                ...formData,
                imap_host: config.hostname,
                imap_port: config.port,
                imap_username: config.username,
                imap_use_ssl: config.useTls,
              }
            });
            toast({
              title: "Configuration applied",
              description: "Email account updated with working configuration",
            });
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>✅ Email Integration Status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p className="text-green-600 font-semibold">
            ✓ Full POP3/SMTP email integration is now active!
          </p>
          <p>
            <strong>Features enabled:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>✓ POP3 email fetching with SSL/TLS (simpler, more reliable than IMAP)</li>
            <li>✓ SMTP email sending with SSL/TLS</li>
            <li>✓ Incremental sync (only fetches new emails using UIDL tracking)</li>
            <li>✓ Attachment parsing and storage</li>
            <li>✓ Email threading and reply detection</li>
            <li>✓ Push notifications for new emails</li>
            <li>✓ Comprehensive operation logging</li>
          </ul>
          <p className="pt-2">
            <strong>Automated sync:</strong> Emails are automatically synced every 5 minutes via cron job.
            Use "Sync Now" to manually trigger an immediate sync for testing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
