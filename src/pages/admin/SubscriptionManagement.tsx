import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, TrendingUp, Users, DollarSign } from "lucide-react";

interface Business {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  message_count_current_period: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface SubscriptionHistory {
  id: string;
  event_type: string;
  old_tier: string | null;
  new_tier: string | null;
  created_at: string;
  metadata: any;
}

const TIERS = ["free", "starter", "professional", "enterprise"];
const STATUSES = ["active", "trialing", "past_due", "canceled", "incomplete"];

export default function SubscriptionManagement() {
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    const filtered = businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBusinesses(filtered);
  }, [searchTerm, businesses]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("subscription_history")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
      setShowHistoryDialog(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateSubscription = async (
    businessId: string,
    updates: Partial<Business>
  ) => {
    try {
      const { error } = await supabase
        .from("businesses")
        .update(updates)
        .eq("id", businessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription updated successfully",
      });

      fetchBusinesses();
      setEditingBusiness(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const stats = {
    totalBusinesses: businesses.length,
    activeSubscriptions: businesses.filter((b) => b.subscription_status === "active")
      .length,
    totalMRR: businesses
      .filter((b) => b.subscription_status === "active")
      .reduce((sum, b) => {
        const tierPricing: Record<string, number> = {
          free: 0,
          starter: 29,
          professional: 99,
          enterprise: 299,
        };
        return sum + (tierPricing[b.subscription_tier] || 0);
      }, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">
          Manage customer subscriptions, tiers, and billing
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Businesses</p>
              <p className="text-3xl font-bold">{stats.totalBusinesses}</p>
            </div>
            <Users className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold">€{stats.totalMRR}</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search businesses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Businesses Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Business</th>
                <th className="text-left p-4">Tier</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Messages</th>
                <th className="text-left p-4">Started</th>
                <th className="text-left p-4">Ends</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBusinesses.map((business) => (
                <tr key={business.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{business.name}</p>
                      <p className="text-sm text-muted-foreground">{business.slug}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary uppercase">
                      {business.subscription_tier}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        business.subscription_status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : business.subscription_status === "trialing"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                      }`}
                    >
                      {business.subscription_status}
                    </span>
                  </td>
                  <td className="p-4">{business.message_count_current_period}</td>
                  <td className="p-4">
                    {business.subscription_started_at
                      ? new Date(business.subscription_started_at).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="p-4">
                    {business.subscription_ends_at
                      ? new Date(business.subscription_ends_at).toLocaleDateString()
                      : business.trial_ends_at
                      ? new Date(business.trial_ends_at).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingBusiness(business)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchHistory(business.id)}
                      >
                        History
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingBusiness} onOpenChange={() => setEditingBusiness(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details for {editingBusiness?.name}
            </DialogDescription>
          </DialogHeader>

          {editingBusiness && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Subscription Tier</Label>
                <Select
                  value={editingBusiness.subscription_tier}
                  onValueChange={(value) =>
                    setEditingBusiness({ ...editingBusiness, subscription_tier: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingBusiness.subscription_status}
                  onValueChange={(value) =>
                    setEditingBusiness({ ...editingBusiness, subscription_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stripe Customer ID</Label>
                <Input
                  value={editingBusiness.stripe_customer_id || ""}
                  onChange={(e) =>
                    setEditingBusiness({
                      ...editingBusiness,
                      stripe_customer_id: e.target.value,
                    })
                  }
                  placeholder="cus_..."
                />
              </div>

              <div className="space-y-2">
                <Label>Stripe Subscription ID</Label>
                <Input
                  value={editingBusiness.stripe_subscription_id || ""}
                  onChange={(e) =>
                    setEditingBusiness({
                      ...editingBusiness,
                      stripe_subscription_id: e.target.value,
                    })
                  }
                  placeholder="sub_..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBusiness(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editingBusiness &&
                updateSubscription(editingBusiness.id, {
                  subscription_tier: editingBusiness.subscription_tier,
                  subscription_status: editingBusiness.subscription_status,
                  stripe_customer_id: editingBusiness.stripe_customer_id,
                  stripe_subscription_id: editingBusiness.stripe_subscription_id,
                })
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Subscription History</DialogTitle>
            <DialogDescription>View all subscription changes</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((event) => (
              <Card key={event.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{event.event_type}</p>
                    {event.old_tier && event.new_tier && (
                      <p className="text-sm text-muted-foreground">
                        {event.old_tier} → {event.new_tier}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              </Card>
            ))}
            {history.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No history available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
