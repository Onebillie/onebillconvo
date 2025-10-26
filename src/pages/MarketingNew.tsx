import { useState } from "react";
import { Plus, BarChart3, Send, Users, Share2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PersistentHeader } from "@/components/PersistentHeader";
import { CampaignWizard } from "@/components/marketing/CampaignWizard";
import { AudienceBuilder } from "@/components/marketing/AudienceBuilder";
import { ReferralManager } from "@/components/marketing/ReferralManager";
import { CampaignAnalytics } from "@/components/marketing/CampaignAnalytics";
import { format } from "date-fns";

export default function MarketingNew() {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

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
                        <Badge variant={getStatusColor(campaign.status)}>
                          {getStatusIcon(campaign.status)} {campaign.status}
                        </Badge>
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
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
