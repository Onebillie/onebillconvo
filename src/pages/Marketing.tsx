import { useState } from "react";
import { Plus, BarChart3, Send, Clock, CheckCircle2, XCircle, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PersistentHeader } from "@/components/PersistentHeader";
import { CampaignWizard } from "@/components/marketing/CampaignWizard";
import { format } from "date-fns";

export default function Marketing() {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'sending': return <Send className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-gray-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
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
            <h1 className="text-3xl font-bold">Marketing Campaigns</h1>
            <p className="text-muted-foreground">
              Create and manage multi-channel marketing campaigns
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Send className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns?.filter(c => c.status === 'sending').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns?.filter(c => c.status === 'scheduled').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns?.filter(c => c.status === 'completed').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
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
                      {getStatusIcon(campaign.status)}
                      <Badge variant={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
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
