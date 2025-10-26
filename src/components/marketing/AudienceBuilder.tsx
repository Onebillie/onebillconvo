import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Trash2, RefreshCw, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AudienceSegment {
  id: string;
  name: string;
  description: string | null;
  filters: any;
  member_count: number;
  last_calculated_at: string | null;
  created_at: string;
}

export function AudienceBuilder() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [filters, setFilters] = useState({
    tags: [] as string[],
    status: [] as string[],
    channels: [] as string[],
    last_contacted_days: 30,
    include_unsubscribed: false
  });

  const queryClient = useQueryClient();

  const { data: segments, isLoading } = useQuery({
    queryKey: ['audience-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audience_segments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AudienceSegment[];
    }
  });

  const createSegmentMutation = useMutation({
    mutationFn: async () => {
      if (!segmentName.trim()) throw new Error('Segment name is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('audience_segments')
        .insert({
          name: segmentName,
          description: segmentDescription,
          filters: filters,
          business_id: businessUser!.business_id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-segments'] });
      toast.success('Audience segment created');
      setDialogOpen(false);
      setSegmentName('');
      setSegmentDescription('');
      setFilters({
        tags: [],
        status: [],
        channels: [],
        last_contacted_days: 30,
        include_unsubscribed: false
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create segment: ' + error.message);
    }
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      const { error } = await supabase
        .from('audience_segments')
        .delete()
        .eq('id', segmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-segments'] });
      toast.success('Segment deleted');
    }
  });

  const calculateSegmentSize = async (filters: any) => {
    // TODO: Call edge function to calculate segment size
    return Math.floor(Math.random() * 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audience Segments</h2>
          <p className="text-muted-foreground">Create and manage targeted audience groups</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Audience Segment</DialogTitle>
              <DialogDescription>
                Build a targeted audience based on customer attributes and behavior
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Segment Name *</Label>
                <Input
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  placeholder="E.g., Premium Customers"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  placeholder="Brief description of this segment"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Filters</CardTitle>
                  <CardDescription>Define criteria to segment your audience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Customer Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Active', 'Trial', 'Lapsed', 'Lead'].map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.status.includes(status.toLowerCase())}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters({ ...filters, status: [...filters.status, status.toLowerCase()] });
                              } else {
                                setFilters({ ...filters, status: filters.status.filter(s => s !== status.toLowerCase()) });
                              }
                            }}
                          />
                          <Label htmlFor={`status-${status}`} className="font-normal cursor-pointer">
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Channels</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Email', 'SMS', 'WhatsApp'].map((channel) => (
                        <div key={channel} className="flex items-center space-x-2">
                          <Checkbox
                            id={`channel-${channel}`}
                            checked={filters.channels.includes(channel.toLowerCase())}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters({ ...filters, channels: [...filters.channels, channel.toLowerCase()] });
                              } else {
                                setFilters({ ...filters, channels: filters.channels.filter(c => c !== channel.toLowerCase()) });
                              }
                            }}
                          />
                          <Label htmlFor={`channel-${channel}`} className="font-normal cursor-pointer">
                            {channel}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Last Contacted</Label>
                    <Select
                      value={filters.last_contacted_days.toString()}
                      onValueChange={(value) => setFilters({ ...filters, last_contacted_days: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Within 7 days</SelectItem>
                        <SelectItem value="30">Within 30 days</SelectItem>
                        <SelectItem value="90">Within 90 days</SelectItem>
                        <SelectItem value="180">Within 6 months</SelectItem>
                        <SelectItem value="365">Within 1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-unsubscribed"
                      checked={filters.include_unsubscribed}
                      onCheckedChange={(checked) => setFilters({ ...filters, include_unsubscribed: !!checked })}
                    />
                    <Label htmlFor="include-unsubscribed" className="font-normal">
                      Include unsubscribed customers
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createSegmentMutation.mutate()} disabled={createSegmentMutation.isPending}>
                  {createSegmentMutation.isPending ? 'Creating...' : 'Create Segment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Segments List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading segments...</div>
      ) : segments && segments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Card key={segment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{segment.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {segment.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSegmentMutation.mutate(segment.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{segment.member_count || 0}</span>
                  <span className="text-sm text-muted-foreground">members</span>
                </div>
                
                {segment.filters && (
                  <div className="space-y-2">
                    {segment.filters.status && segment.filters.status.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {segment.filters.status.map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs capitalize">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {segment.filters.channels && segment.filters.channels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {segment.filters.channels.map((c: string) => (
                          <Badge key={c} variant="outline" className="text-xs capitalize">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full">
                  <Filter className="w-3 h-3 mr-2" />
                  Use in Campaign
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No audience segments yet</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Segment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
