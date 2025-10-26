import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Tag, Clock, UserCheck } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface RecipientFilter {
  includeAll: boolean;
  statusTags: string[];
  excludeUnsubscribed: boolean;
  lastContactedDays: number | null;
  customerType: 'all' | 'lead' | 'customer';
}

interface AudienceSelectorProps {
  recipientFilter: RecipientFilter;
  onChange: (filter: RecipientFilter) => void;
}

export function AudienceSelector({ recipientFilter, onChange }: AudienceSelectorProps) {
  const [estimatedCount, setEstimatedCount] = useState<number>(0);

  // Fetch available status tags from the database
  const { data: statusTags } = useQuery({
    queryKey: ['conversation-status-tags'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('conversation_status_tags')
        .select('id, name, color')
        .eq('business_id', businessUser!.business_id)
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Estimate audience size
  useEffect(() => {
    let mounted = true;
    
    const estimateAudience = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const { data: businessUser } = await supabase
          .from('business_users')
          .select('business_id')
          .eq('user_id', user.id)
          .single();

        if (!businessUser || !mounted) return;

        // Simple count for now - will be accurate on send
        let estimatedSize = 100; // Default estimate
        
        if (recipientFilter.includeAll) {
          const result = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessUser.business_id);
          estimatedSize = result.count || 0;
        } else if (recipientFilter.statusTags.length > 0) {
          // Estimate based on status tags
          estimatedSize = recipientFilter.statusTags.length * 20;
        }

        if (mounted) {
          setEstimatedCount(estimatedSize);
        }
      } catch (error) {
        console.error('Error estimating audience:', error);
        if (mounted) setEstimatedCount(0);
      }
    };

    estimateAudience();
    return () => { mounted = false; };
  }, [recipientFilter.includeAll, recipientFilter.statusTags.length]);

  const handleStatusToggle = (statusId: string) => {
    const newTags = recipientFilter.statusTags.includes(statusId)
      ? recipientFilter.statusTags.filter(id => id !== statusId)
      : [...recipientFilter.statusTags, statusId];
    
    onChange({
      ...recipientFilter,
      statusTags: newTags,
      includeAll: newTags.length === 0
    });
  };

  return (
    <div className="space-y-4">
      {/* Audience Size Indicator */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Estimated Recipients</p>
                <p className="text-3xl font-bold">{estimatedCount.toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm px-4 py-2">
              {recipientFilter.includeAll ? 'All Customers' : 'Filtered'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Audience Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Target Audience
          </CardTitle>
          <CardDescription>Select who should receive this campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Send to All Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeAll"
              checked={recipientFilter.includeAll}
              onCheckedChange={(checked) =>
                onChange({
                  ...recipientFilter,
                  includeAll: !!checked,
                  statusTags: checked ? [] : recipientFilter.statusTags
                })
              }
            />
            <Label htmlFor="includeAll" className="font-normal">
              Send to all customers
            </Label>
          </div>

          {/* Status Tags Filter */}
          {!recipientFilter.includeAll && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Filter by Status Tags
              </Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
                {statusTags && statusTags.length > 0 ? (
                  statusTags.map((status) => (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.id}`}
                        checked={recipientFilter.statusTags.includes(status.id)}
                        onCheckedChange={() => handleStatusToggle(status.id)}
                      />
                      <Label
                        htmlFor={`status-${status.id}`}
                        className="font-normal cursor-pointer flex items-center gap-2"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground col-span-2">
                    No status tags available. Create them in Settings → Communication → Statuses.
                  </p>
                )}
              </div>
              {recipientFilter.statusTags.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  ✓ {recipientFilter.statusTags.length} status tag{recipientFilter.statusTags.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Customer Type Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Customer Type
            </Label>
            <RadioGroup
              value={recipientFilter.customerType}
              onValueChange={(value: 'all' | 'lead' | 'customer') =>
                onChange({ ...recipientFilter, customerType: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="type-all" />
                <Label htmlFor="type-all" className="font-normal cursor-pointer">
                  All (Leads & Customers)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lead" id="type-lead" />
                <Label htmlFor="type-lead" className="font-normal cursor-pointer">
                  Leads Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customer" id="type-customer" />
                <Label htmlFor="type-customer" className="font-normal cursor-pointer">
                  Existing Customers Only
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Last Contacted Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last Contacted
            </Label>
            <Select
              value={recipientFilter.lastContactedDays?.toString() || 'any'}
              onValueChange={(value) =>
                onChange({
                  ...recipientFilter,
                  lastContactedDays: value === 'any' ? null : parseInt(value)
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="7">Within last 7 days</SelectItem>
                <SelectItem value="30">Within last 30 days</SelectItem>
                <SelectItem value="90">Within last 90 days</SelectItem>
                <SelectItem value="180">Within last 6 months</SelectItem>
                <SelectItem value="365">Within last year</SelectItem>
                <SelectItem value="730">Not contacted in 2+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exclude Unsubscribed */}
          <div className="pt-3 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="excludeUnsubscribed"
                checked={recipientFilter.excludeUnsubscribed}
                onCheckedChange={(checked) =>
                  onChange({ ...recipientFilter, excludeUnsubscribed: !!checked })
                }
              />
              <Label htmlFor="excludeUnsubscribed" className="font-normal">
                Automatically exclude unsubscribed customers
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {!recipientFilter.includeAll && recipientFilter.statusTags.length > 0 && (
        <Card className="border-muted-foreground/20">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {recipientFilter.statusTags.map((tagId) => {
                  const status = statusTags?.find(s => s.id === tagId);
                  return status ? (
                    <Badge key={tagId} variant="secondary" className="gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </Badge>
                  ) : null;
                })}
                {recipientFilter.customerType !== 'all' && (
                  <Badge variant="outline" className="capitalize">
                    {recipientFilter.customerType}s
                  </Badge>
                )}
                {recipientFilter.lastContactedDays && (
                  <Badge variant="outline">
                    Last {recipientFilter.lastContactedDays} days
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
