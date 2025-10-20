import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MousePointerClick, TrendingUp } from "lucide-react";

export function WhatsAppAnalyticsWidget() {
  const { data: buttonClicks, isLoading } = useQuery({
    queryKey: ['whatsapp-button-clicks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get business_id for the user
      const { data: businessData } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!businessData?.business_id) return [];

      // Fetch messages with button clicks from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          created_at,
          metadata,
          conversations!inner (
            business_id
          )
        `)
        .eq('conversations.business_id', businessData.business_id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('metadata', 'is', null);

      if (error) throw error;

      // Filter and aggregate button clicks
      const buttonClickData = data
        .filter(msg => msg.metadata && typeof msg.metadata === 'object' && 'button_clicked' in msg.metadata)
        .reduce((acc, msg) => {
          const date = new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const buttonText = (msg.metadata as any).button_text || 'Unknown';
          
          const existing = acc.find(item => item.date === date);
          if (existing) {
            existing.clicks += 1;
            existing.buttons[buttonText] = (existing.buttons[buttonText] || 0) + 1;
          } else {
            acc.push({
              date,
              clicks: 1,
              buttons: { [buttonText]: 1 }
            });
          }
          return acc;
        }, [] as Array<{ date: string; clicks: number; buttons: Record<string, number> }>);

      return buttonClickData;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const totalClicks = buttonClicks?.reduce((sum, day) => sum + day.clicks, 0) || 0;
  const avgClicksPerDay = buttonClicks?.length ? (totalClicks / buttonClicks.length).toFixed(1) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="w-5 h-5" />
            WhatsApp Button Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!buttonClicks || buttonClicks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="w-5 h-5" />
            WhatsApp Button Analytics
          </CardTitle>
          <CardDescription>Track customer button interactions in WhatsApp messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <MousePointerClick className="w-12 h-12 mb-2 opacity-50" />
            <p>No button clicks recorded yet</p>
            <p className="text-sm">Start using WhatsApp buttons to see analytics here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MousePointerClick className="w-5 h-5" />
          WhatsApp Button Analytics
        </CardTitle>
        <CardDescription>Last 30 days of button click activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Clicks</p>
            <p className="text-2xl font-bold">{totalClicks}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Avg. Per Day
            </p>
            <p className="text-2xl font-bold">{avgClicksPerDay}</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={buttonClicks}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
