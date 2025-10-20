import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, ExternalLink, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function FacebookAccountManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    page_name: "",
    page_id: "",
    access_token: "",
    verify_token: "",
  });

  // Fetch Facebook accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['facebook-accounts'],
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
        .from('facebook_accounts')
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
        .from('facebook_accounts')
        .insert({
          business_id: businessData.business_id,
          page_name: credentials.page_name,
          page_id: credentials.page_id,
          access_token: credentials.access_token,
          verify_token: credentials.verify_token,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-accounts'] });
      toast({
        title: "Facebook Page Connected",
        description: "Your Facebook page has been successfully connected.",
      });
      setIsDialogOpen(false);
      setFormData({ page_name: "", page_id: "", access_token: "", verify_token: "" });
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
        .from('facebook_accounts')
        .delete()
        .eq('id', accountId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-accounts'] });
      toast({
        title: "Page Disconnected",
        description: "Facebook page has been removed.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccountMutation.mutate(formData);
  };

  const webhookUrl = `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/facebook-webhook`;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Facebook Messenger requires a Facebook Business Page and Meta App credentials. Follow the setup guide below to obtain your credentials.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Facebook Pages
              </CardTitle>
              <CardDescription>
                Connect your Facebook Business Pages to manage messages
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Page
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Connect Facebook Page</DialogTitle>
                  <DialogDescription>
                    Enter your Facebook Page credentials from Meta Developers Console
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="page_name">Page Name</Label>
                    <Input
                      id="page_name"
                      placeholder="My Business Page"
                      value={formData.page_name}
                      onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="page_id">Page ID</Label>
                    <Input
                      id="page_id"
                      placeholder="123456789012345"
                      value={formData.page_id}
                      onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Find your Page ID at <a href="https://www.facebook.com/help/1503421039731588" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">facebook.com/help</a>
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
                      Generate at <a href="https://developers.facebook.com/tools/accesstoken" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta Access Token Tool</a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verify_token">Webhook Verify Token</Label>
                    <Input
                      id="verify_token"
                      placeholder="your_custom_verify_token_123"
                      value={formData.verify_token}
                      onChange={(e) => setFormData({ ...formData, verify_token: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Create your own secure random string (e.g., "fb_verify_xyz789")
                    </p>
                  </div>

                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <Label className="text-sm font-semibold">Webhook Configuration</Label>
                    <p className="text-xs text-muted-foreground">Add this webhook URL to your Meta App:</p>
                    <code className="block text-xs bg-background p-2 rounded border break-all">
                      {webhookUrl}
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Configure at: <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta App Dashboard → Messenger → Settings → Webhooks</a>
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
                        <li>Create a Meta App at <a href="https://developers.facebook.com/apps" target="_blank" className="text-primary hover:underline">developers.facebook.com</a></li>
                        <li>Add "Messenger" product to your app</li>
                        <li>Connect your Facebook Business Page</li>
                        <li>Generate a Page Access Token (Tools → Access Token Tool)</li>
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
                      {addAccountMutation.isPending ? "Connecting..." : "Connect Page"}
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
                      <p className="font-medium">{account.page_name}</p>
                      <p className="text-sm text-muted-foreground">Page ID: {account.page_id}</p>
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
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No Facebook pages connected yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add Page" to get started</p>
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
            <a href="https://developers.facebook.com/docs/messenger-platform/getting-started" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-2" />
              Messenger Platform Getting Started
            </a>
          </Button>
          <Button variant="link" className="px-0 h-auto" asChild>
            <a href="https://developers.facebook.com/docs/messenger-platform/webhooks" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-2" />
              Webhook Setup Guide
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
