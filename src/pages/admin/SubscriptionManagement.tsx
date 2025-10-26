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
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, TrendingUp, Users, DollarSign, Trash2, Clock } from "lucide-react";
import RevenueBreakdownDialog from "@/components/admin/RevenueBreakdownDialog";

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
  owner_id: string;
  custom_price_monthly: number | null;
  is_enterprise: boolean;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface AuditLog {
  id: string;
  action: string;
  changes: any;
  created_at: string;
  changed_by: string;
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
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Business | null>(null);
  const [deletePreview, setDeletePreview] = useState<any>(null);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);

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
      
      // Fetch businesses
      const { data: bizData, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });

      if (bizError) throw bizError;

      const businessList = bizData || [];
      if (businessList.length === 0) {
        setBusinesses([]);
        setFilteredBusinesses([]);
        return;
      }

      // Get owner profiles
      const ownerIds = businessList.map((b: any) => b.owner_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ownerIds);

      const profilesById = new Map((profiles || []).map((p: any) => [p.id, p]));
      
      const businessesWithProfiles = businessList.map((b: any) => ({
        ...b,
        profiles: profilesById.get(b.owner_id) || null
      }));

      setBusinesses(businessesWithProfiles);
      setFilteredBusinesses(businessesWithProfiles);
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

  const fetchAuditLogs = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("business_audit_log")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
      setShowAuditDialog(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const logAuditAction = async (businessId: string, action: string, changes: any) => {
    try {
      await supabase
        .from("business_audit_log")
        .insert({
          business_id: businessId,
          action,
          changes
        });
    } catch (error) {
      console.error("Failed to log audit action:", error);
    }
  };

  const showDeletePreview = async (business: Business) => {
    try {
      // Call edge function to get preview of what will be deleted
      const { data, error } = await supabase.functions.invoke('admin-delete-business', {
        body: { business_id: business.id, confirm: false }
      });

      if (error) throw error;

      setDeletePreview(data);
      setDeleteConfirm(business);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteBusiness = async (business: Business) => {
    try {
      // Call edge function to actually delete with confirmation
      const { data, error } = await supabase.functions.invoke('admin-delete-business', {
        body: { business_id: business.id, confirm: true }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Business deleted successfully. ${data.deleted_records || 0} records removed.`
      });

      setDeleteConfirm(null);
      setDeletePreview(null);
      fetchBusinesses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateSubscription = async (
    businessId: string,
    updates: Partial<Business>
  ) => {
    try {
      // Log the update
      await logAuditAction(businessId, "UPDATE", {
        old_values: editingBusiness,
        new_values: updates
      });

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
        // Use custom price for enterprise, otherwise use tier pricing
        if (b.is_enterprise && b.custom_price_monthly) {
          return sum + b.custom_price_monthly;
        }
        
        const tierPricing: Record<string, number> = {
          free: 0,
          starter: 29,
          professional: 99,
          enterprise: 299,
        };
        return sum + (tierPricing[b.subscription_tier] || 0);
      }, 0),
  };

  const revenueSource = businesses
    .filter((b) => b.subscription_status === "active")
    .map(b => ({
      businessName: b.name,
      tier: b.subscription_tier,
      amount: b.is_enterprise && b.custom_price_monthly 
        ? b.custom_price_monthly 
        : { free: 0, starter: 29, professional: 99, enterprise: 299 }[b.subscription_tier] || 0,
      status: b.subscription_status,
      isEnterprise: b.is_enterprise || false
    }));

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

        <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowRevenueBreakdown(true)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold">${stats.totalMRR.toFixed(2)}</p>
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
                <th className="text-left p-4">Owner</th>
                <th className="text-left p-4">Contact</th>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Signed up: {new Date(business.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{business.profiles?.full_name || "N/A"}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm">{business.profiles?.email || "N/A"}</p>
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
                        onClick={() => fetchAuditLogs(business.id)}
                      >
                        Audit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => showDeletePreview(business)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Revenue Breakdown Dialog */}
      <RevenueBreakdownDialog
        open={showRevenueBreakdown}
        onOpenChange={setShowRevenueBreakdown}
        sources={revenueSource}
        totalMRR={stats.totalMRR}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => {
        setDeleteConfirm(null);
        setDeletePreview(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
                </p>
                {deletePreview && (
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                    <p className="font-semibold text-foreground">The following records will be permanently deleted:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {deletePreview.record_counts?.customers > 0 && (
                        <li>• {deletePreview.record_counts.customers} customer(s)</li>
                      )}
                      {deletePreview.record_counts?.conversations > 0 && (
                        <li>• {deletePreview.record_counts.conversations} conversation(s)</li>
                      )}
                      {deletePreview.record_counts?.messages > 0 && (
                        <li>• {deletePreview.record_counts.messages} message(s)</li>
                      )}
                      {deletePreview.record_counts?.whatsapp_accounts > 0 && (
                        <li>• {deletePreview.record_counts.whatsapp_accounts} WhatsApp account(s)</li>
                      )}
                      {deletePreview.record_counts?.email_accounts > 0 && (
                        <li>• {deletePreview.record_counts.email_accounts} email account(s)</li>
                      )}
                      {deletePreview.record_counts?.training_conversations > 0 && (
                        <li>• {deletePreview.record_counts.training_conversations} training conversation(s)</li>
                      )}
                      {deletePreview.record_counts?.business_users > 0 && (
                        <li>• {deletePreview.record_counts.business_users} business user(s)</li>
                      )}
                      {deletePreview.record_counts?.ai_knowledge_documents > 0 && (
                        <li>• {deletePreview.record_counts.ai_knowledge_documents} AI document(s)</li>
                      )}
                      {deletePreview.record_counts?.voice_call_usage > 0 && (
                        <li>• {deletePreview.record_counts.voice_call_usage} voice usage record(s)</li>
                      )}
                      {deletePreview.record_counts?.call_records > 0 && (
                        <li>• {deletePreview.record_counts.call_records} call record(s)</li>
                      )}
                    </ul>
                    <p className="font-semibold text-destructive pt-2">⚠️ This operation is irreversible!</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteBusiness(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Audit Trail</DialogTitle>
            <DialogDescription>Complete history of all changes</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted p-2 rounded text-xs">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(log.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              </Card>
            ))}
            {auditLogs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No audit logs available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
