import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Instagram, ExternalLink, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function InstagramAccountManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    account_name: "",
    instagram_account_id: "",
    access_token: "",
    verify_token: "",
  });

  // Fetch Instagram accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['instagram-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!businessData?.business_id) return [];
      
      const { data, error } = await supabase
        .from('instagram_accounts')
        .select('*')
        .eq('business_id', businessData.business_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: async (credentials: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!businessData?.business_id) throw new Error('No business found');
      
      const { error } = await supabase
        .from('instagram_accounts')
        .insert({
          business_id: businessData.business_id,
          username: credentials.account_name,
          instagram_account_id: credentials.instagram_account_id,
          access_token: credentials.access_token,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      toast({
        title: "Instagram Account Connected",
        description: "Your Instagram Business account has been successfully connected.",
      });
      setIsDialogOpen(false);
      setFormData({ account_name: "", instagram_account_id: "", access_token: "", verify_token: "" });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('instagram_accounts')
        .delete()
        .eq('id', accountId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
      toast({
        title: "Account Disconnected",
        description: "Instagram account has been removed.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccountMutation.mutate(formData);
  };

  const webhookUrl = `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/instagram-webhook`;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Instagram messaging requires an Instagram Business or Creator account linked to a Facebook Business Page. You'll need Meta App credentials to connect.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-600" />
                Instagram Accounts
              </CardTitle>
              <CardDescription>
                Connect your Instagram Business accounts to manage direct messages
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Connect Instagram Business Account</DialogTitle>
                  <DialogDescription>
                    Enter your Instagram Business account credentials from Meta Developers Console
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_name">Account Name / Username</Label>
                    <Input
                      id="account_name"
                      placeholder="@mybusiness"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram_account_id">Instagram Business Account ID</Label>
                    <Input
                      id="instagram_account_id"
                      placeholder="17841400000000000"
                      value={formData.instagram_account_id}
                      onChange={(e) => setFormData({ ...formData, instagram_account_id: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Get from Graph API: <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /me?fields=instagram_business_account</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access_token">Page Access Token</Label>
                    <Input
                      id="access_token"
                      type="password"
                      placeholder="EAAxxxxxxxxxxxxxxxx"
                      value={formData.access_token}
                      onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Generate from your linked Facebook Page at <a href="https://developers.facebook.com/tools/accesstoken" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta Access Token Tool</a>
                    </p>
                  </div>


                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <Label className="text-sm font-semibold">Webhook Configuration</Label>
                    <p className="text-xs text-muted-foreground">Add this webhook URL to your Meta App:</p>
                    <code className="block text-xs bg-background p-2 rounded border break-all">
                      {webhookUrl}
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Configure at: <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta App Dashboard → Instagram → Settings → Webhooks</a>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subscribe to: <strong>messages</strong>, <strong>messaging_postbacks</strong>, <strong>message_reads</strong>
                    </p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Setup Guide:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Convert Instagram to Business/Creator account in settings</li>
                        <li>Link to Facebook Business Page (required for API access)</li>
                        <li>Create/use existing Meta App at <a href="https://developers.facebook.com/apps" target="_blank" className="text-primary hover:underline">developers.facebook.com</a></li>
                        <li>Add "Instagram" product to your app</li>
                        <li>Get Instagram Business Account ID via Graph API Explorer</li>
                        <li>Generate Page Access Token with instagram_manage_messages permission</li>
                        <li>Configure webhook with URL above and your verify token</li>
                        <li>Subscribe to messaging events</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addAccountMutation.isPending}>
                      {addAccountMutation.isPending ? "Connecting..." : "Connect Account"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : accounts && accounts.length > 0 ? (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="flex items-center justify-between p-4">
                  <div>
                      <p className="font-medium">{account.username}</p>
                      <p className="text-sm text-muted-foreground">Account ID: {account.instagram_account_id}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: <span className={account.is_active ? "text-green-600" : "text-gray-500"}>
                          {account.is_active ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAccountMutation.mutate(account.id)}
                      disabled={deleteAccountMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Instagram className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No Instagram accounts connected yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add Account" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="link" className="px-0 h-auto" asChild>
            <a href="https://developers.facebook.com/docs/messenger-platform/instagram/get-started" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-2" />
              Instagram Messaging Getting Started
            </a>
          </Button>
          <Button variant="link" className="px-0 h-auto" asChild>
            <a href="https://developers.facebook.com/docs/graph-api/webhooks/getting-started" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-2" />
              Webhooks Setup Guide
            </a>
          </Button>
          <Button variant="link" className="px-0 h-auto" asChild>
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-2" />
              Graph API Explorer (Get Account ID)
            </a>
          </Button>
          <Button variant="link" className="px-0 h-auto" asChild>
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-2" />
              Meta App Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
