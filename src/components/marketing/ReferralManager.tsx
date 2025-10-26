import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Share2, Plus, Copy, Users, TrendingUp, Gift } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function ReferralManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [rewardType, setRewardType] = useState('discount');
  const [rewardValue, setRewardValue] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');

  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['referral-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!campaignName.trim()) throw new Error('Campaign name is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('referral_campaigns')
        .insert({
          name: campaignName,
          description: campaignDescription,
          reward_type: rewardType,
          reward_value: parseFloat(rewardValue) || null,
          reward_description: rewardDescription,
          business_id: businessUser!.business_id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-campaigns'] });
      toast.success('Referral campaign created');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to create campaign: ' + error.message);
    }
  });

  const resetForm = () => {
    setCampaignName('');
    setCampaignDescription('');
    setRewardType('discount');
    setRewardValue('');
    setRewardDescription('');
  };

  const generateReferralCode = async (campaignId: string, customerId: string) => {
    const { data, error } = await supabase.rpc('generate_referral_code');
    
    if (error) {
      toast.error('Failed to generate code');
      return;
    }

    const { error: insertError } = await supabase
      .from('referral_codes')
      .insert({
        campaign_id: campaignId,
        customer_id: customerId,
        referral_code: data,
        referral_link: `${window.location.origin}/refer/${data}`
      });

    if (insertError) {
      toast.error('Failed to save referral code');
    } else {
      toast.success('Referral code generated');
      queryClient.invalidateQueries({ queryKey: ['referral-campaigns'] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Referral Campaigns</h2>
          <p className="text-muted-foreground">Grow your customer base through referrals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Referral Campaign</DialogTitle>
              <DialogDescription>
                Set up a referral program to reward customers for bringing in new business
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="E.g., Summer Referral Program"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  placeholder="Describe your referral program..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reward Type *</Label>
                  <Select value={rewardType} onValueChange={setRewardType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="credit">Account Credit</SelectItem>
                      <SelectItem value="free_month">Free Month</SelectItem>
                      <SelectItem value="custom">Custom Reward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reward Value</Label>
                  <Input
                    type="number"
                    value={rewardValue}
                    onChange={(e) => setRewardValue(e.target.value)}
                    placeholder={rewardType === 'discount' ? '10' : '50'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reward Description</Label>
                <Input
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder="E.g., $10 off your next purchase"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createCampaignMutation.mutate()} disabled={createCampaignMutation.isPending}>
                  {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className={!campaign.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{campaign.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {campaign.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                    {campaign.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Reward</span>
                  </div>
                  <p className="text-sm">
                    {campaign.reward_description || `${campaign.reward_type}: $${campaign.reward_value}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{campaign.total_referrals || 0}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{campaign.successful_referrals || 0}</div>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <Share2 className="w-3 h-3 mr-2" />
                  Share Campaign
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Share2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No referral campaigns yet</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Campaign
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
