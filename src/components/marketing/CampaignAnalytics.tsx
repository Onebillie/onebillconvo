import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  MousePointerClick, 
  Mail, 
  MessageSquare,
  Users,
  DollarSign,
  Eye,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CampaignAnalyticsProps {
  campaignId: string;
}

export function CampaignAnalytics({ campaignId }: CampaignAnalyticsProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_analytics')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: events } = useQuery({
    queryKey: ['campaign-events', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: linkClicks } = useQuery({
    queryKey: ['campaign-link-clicks', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_link_clicks')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('click_count', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  const openRate = analytics?.sent_count > 0 
    ? ((analytics.opened_count / analytics.sent_count) * 100).toFixed(1) 
    : '0';
  
  const clickRate = analytics?.opened_count > 0
    ? ((analytics.clicked_count / analytics.opened_count) * 100).toFixed(1)
    : '0';

  const conversionRate = analytics?.sent_count > 0
    ? ((analytics.conversion_count / analytics.sent_count) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.sent_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.delivered_count || 0} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <Progress value={parseFloat(openRate)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
            <Progress value={parseFloat(clickRate)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.conversion_count || 0}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="links">Link Clicks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Delivered</span>
                  </div>
                  <span className="font-bold">{analytics?.delivered_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Failed</span>
                  </div>
                  <span className="font-bold">{analytics?.failed_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Bounced</span>
                  </div>
                  <span className="font-bold">{analytics?.bounced_count || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Opened</span>
                  </div>
                  <span className="font-bold">{analytics?.opened_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">Clicked</span>
                  </div>
                  <span className="font-bold">{analytics?.clicked_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Replied</span>
                  </div>
                  <span className="font-bold">{analytics?.replied_count || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {analytics?.conversion_value && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Revenue Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${analytics.conversion_value.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  From {analytics.conversion_count} conversions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest events from this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events && events.length > 0 ? (
                  events.slice(0, 20).map((event) => (
                    <div key={event.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          event.event_type === 'opened' ? 'default' :
                          event.event_type === 'clicked' ? 'secondary' :
                          event.event_type === 'converted' ? 'default' :
                          'outline'
                        }>
                          {event.event_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground capitalize">{event.channel}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No events yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Performing Links</CardTitle>
              <CardDescription>Most clicked links in this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {linkClicks && linkClicks.length > 0 ? (
                  linkClicks.map((link) => (
                    <div key={link.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[400px]">
                          {link.link_url}
                        </span>
                        <Badge variant="secondary">{link.click_count} clicks</Badge>
                      </div>
                      <Progress value={(link.click_count / (analytics?.clicked_count || 1)) * 100} />
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No link clicks yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
