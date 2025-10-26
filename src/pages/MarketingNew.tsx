import { useState } from "react";
import { Plus, BarChart3, Send, Users, Share2, TrendingUp, MoreVertical, Pencil, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PersistentHeader } from "@/components/PersistentHeader";
import { CampaignWizard } from "@/components/marketing/CampaignWizard";
import { AudienceBuilder } from "@/components/marketing/AudienceBuilder";
import { ReferralManager } from "@/components/marketing/ReferralManager";
import { CampaignAnalytics } from "@/components/marketing/CampaignAnalytics";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function MarketingNew() {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['marketing-stats'],
    queryFn: async () => {
      const { data: campaignsData } = await supabase
        .from('marketing_campaigns')
        .select('*');

      const { data: segmentsData } = await supabase
        .from('audience_segments')
        .select('*');

      const { data: referralsData } = await supabase
        .from('referral_campaigns')
        .select('*');

      return {
        totalCampaigns: campaignsData?.length || 0,
        activeCampaigns: campaignsData?.filter(c => c.status === 'sending').length || 0,
        totalSegments: segmentsData?.length || 0,
        totalReferrals: referralsData?.reduce((sum, r) => sum + (r.total_referrals || 0), 0) || 0
      };
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'sending': return '⟳';
      case 'scheduled': return '⏱';
      case 'paused': return '⏸';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'sending': return 'default';
      case 'scheduled': return 'secondary';
      case 'paused': return 'secondary';
      case 'failed': return 'destructive';
      case 'draft': return 'outline';
      default: return 'secondary';
    }
  };

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
      toast.success('Campaign deleted successfully');
      setDeletingCampaignId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete campaign');
      console.error(error);
    }
  });

  const duplicateCampaignMutation = useMutation({
    mutationFn: async (campaign: any) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          ...campaign,
          id: undefined,
          name: `${campaign.name} (Copy)`,
          status: 'draft',
          sent_count: 0,
          opened_count: 0,
          clicked_count: 0,
          failed_count: 0,
          started_at: null,
          completed_at: null,
          scheduled_at: null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
      toast.success('Campaign duplicated successfully');
    },
    onError: (error) => {
      toast.error('Failed to duplicate campaign');
      console.error(error);
    }
  });

  const handleEdit = (campaign: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCampaign(campaign);
    setShowWizard(true);
  };

  const handleDuplicate = (campaign: any, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateCampaignMutation.mutate(campaign);
  };

  const handleDelete = (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCampaignId(campaignId);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setEditingCampaign(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <PersistentHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Marketing Hub</h1>
            <p className="text-muted-foreground">
              Create powerful multi-channel campaigns with AI-powered content
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCampaigns || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
              <Send className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.activeCampaigns || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audience Segments</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">{stats?.totalSegments || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Share2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.totalReferrals || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">
              <Send className="w-4 h-4 mr-2" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="audiences">
              <Users className="w-4 h-4 mr-2" />
              Audiences
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <Share2 className="w-4 h-4 mr-2" />
              Referrals
            </TabsTrigger>
            {selectedCampaign && (
              <TabsTrigger value="analytics">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Loading campaigns...
                </div>
              ) : campaigns && campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <Card 
                    key={campaign.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setSelectedCampaign(campaign.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="line-clamp-1">{campaign.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {campaign.description || 'No description'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(campaign.status)}>
                            {getStatusIcon(campaign.status)} {campaign.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleEdit(campaign, e)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => handleDuplicate(campaign, e)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => handleDelete(campaign.id, e)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Channels */}
                      <div className="flex flex-wrap gap-1">
                        {campaign.channels?.map((channel: string) => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Sent</div>
                          <div className="font-medium">{campaign.sent_count || 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Opened</div>
                          <div className="font-medium">{campaign.opened_count || 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Clicked</div>
                          <div className="font-medium">{campaign.clicked_count || 0}</div>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-xs text-muted-foreground">
                        {campaign.scheduled_at 
                          ? `Scheduled: ${format(new Date(campaign.scheduled_at), 'PPp')}`
                          : `Created: ${format(new Date(campaign.created_at), 'PPp')}`
                        }
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="text-muted-foreground mb-4">
                    No campaigns yet. Create your first campaign to get started.
                  </div>
                  <Button onClick={() => setShowWizard(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Campaign
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Audiences Tab */}
          <TabsContent value="audiences">
            <AudienceBuilder />
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <ReferralManager />
          </TabsContent>

          {/* Analytics Tab */}
          {selectedCampaign && (
            <TabsContent value="analytics">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Campaign Analytics</h2>
                  <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                    Back to Campaigns
                  </Button>
                </div>
                <CampaignAnalytics campaignId={selectedCampaign} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {showWizard && (
        <CampaignWizard
          open={showWizard}
          onClose={handleWizardClose}
          editCampaign={editingCampaign}
        />
      )}

      <AlertDialog open={!!deletingCampaignId} onOpenChange={() => setDeletingCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCampaignId && deleteCampaignMutation.mutate(deletingCampaignId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
