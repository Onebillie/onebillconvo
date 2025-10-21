import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, CreditCard, Plus, Lock, Unlock, FileText } from "lucide-react";

interface EnterpriseAccount {
  id: string;
  name: string;
  owner_id: string;
  payment_method: string;
  custom_price_monthly: number;
  payment_status: string;
  is_frozen: boolean;
  trial_ends_at: string;
  next_payment_due: string;
  invoice_email: string;
  enterprise_notes: string;
  subscription_status: string;
  profiles?: {
    email: string;
    full_name: string;
  } | {
    email: string;
    full_name: string;
  }[];
}

export default function EnterpriseAccounts() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<EnterpriseAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    ownerEmail: "",
    ownerFullName: "",
    trialDays: "30",
    customPrice: "",
    paymentMethod: "bank",
    invoiceEmail: "",
    notes: ""
  });

  useEffect(() => {
    fetchEnterpriseAccounts();
  }, []);

  const fetchEnterpriseAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          *,
          profiles!owner_id(email, full_name)
        `)
        .eq("is_enterprise", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching enterprise accounts:", error);
      toast({
        title: "Error",
        description: "Failed to load enterprise accounts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-create-enterprise-trial", {
        body: {
          businessName: formData.businessName,
          ownerEmail: formData.ownerEmail,
          ownerFullName: formData.ownerFullName,
          trialDays: parseInt(formData.trialDays),
          customPrice: formData.customPrice ? parseFloat(formData.customPrice) : null,
          paymentMethod: formData.paymentMethod,
          invoiceEmail: formData.invoiceEmail || formData.ownerEmail,
          notes: formData.notes
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Enterprise trial account created successfully"
      });

      setIsCreateDialogOpen(false);
      setFormData({
        businessName: "",
        ownerEmail: "",
        ownerFullName: "",
        trialDays: "30",
        customPrice: "",
        paymentMethod: "bank",
        invoiceEmail: "",
        notes: ""
      });
      fetchEnterpriseAccounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create enterprise account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (businessId: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-manage-enterprise-payment", {
        body: {
          businessId,
          action: "mark_paid"
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account marked as paid and unfrozen"
      });
      fetchEnterpriseAccounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as paid",
        variant: "destructive"
      });
    }
  };

  const handleFreezeAccount = async (businessId: string, freeze: boolean) => {
    try {
      const { error } = await supabase.functions.invoke("admin-manage-enterprise-payment", {
        body: {
          businessId,
          action: freeze ? "freeze" : "unfreeze"
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: freeze ? "Account frozen" : "Account unfrozen"
      });
      fetchEnterpriseAccounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update account status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (account: EnterpriseAccount) => {
    if (account.is_frozen) {
      return <Badge variant="destructive">Frozen</Badge>;
    }
    if (account.payment_status === "paid") {
      return <Badge variant="default">Paid</Badge>;
    }
    if (account.payment_status === "overdue") {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading enterprise accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Accounts</h1>
          <p className="text-muted-foreground mt-2">Manage custom pricing and trial accounts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Enterprise Trial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Enterprise Trial Account</DialogTitle>
              <DialogDescription>
                Set up a custom trial with specific pricing and payment terms
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerEmail">Owner Email *</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    placeholder="owner@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerFullName">Owner Full Name *</Label>
                <Input
                  id="ownerFullName"
                  value={formData.ownerFullName}
                  onChange={(e) => setFormData({ ...formData, ownerFullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Trial Days</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customPrice">Monthly Price ($)</Label>
                  <Input
                    id="customPrice"
                    type="number"
                    step="0.01"
                    value={formData.customPrice}
                    onChange={(e) => setFormData({ ...formData, customPrice: e.target.value })}
                    placeholder="299.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceEmail">Invoice Email (optional)</Label>
                <Input
                  id="invoiceEmail"
                  type="email"
                  value={formData.invoiceEmail}
                  onChange={(e) => setFormData({ ...formData, invoiceEmail: e.target.value })}
                  placeholder="billing@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this enterprise account..."
                  rows={3}
                />
              </div>

              <Button onClick={handleCreateAccount} className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Enterprise Trial"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>
                      {Array.isArray(account.profiles) ? account.profiles[0]?.email : account.profiles?.email} 
                      ({Array.isArray(account.profiles) ? account.profiles[0]?.full_name : account.profiles?.full_name})
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(account)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Price</p>
                  <p className="font-semibold">
                    {account.custom_price_monthly ? `$${account.custom_price_monthly}` : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-semibold capitalize">{account.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trial Ends</p>
                  <p className="font-semibold">
                    {account.trial_ends_at ? new Date(account.trial_ends_at).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Payment</p>
                  <p className="font-semibold">
                    {account.next_payment_due ? new Date(account.next_payment_due).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>

              {account.enterprise_notes && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Notes:</strong> {account.enterprise_notes}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleMarkAsPaid(account.id)}
                  disabled={account.payment_status === "paid"}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
                <Button
                  size="sm"
                  variant={account.is_frozen ? "default" : "destructive"}
                  onClick={() => handleFreezeAccount(account.id, !account.is_frozen)}
                >
                  {account.is_frozen ? (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      Unfreeze
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Freeze
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    /* TODO: View invoices */
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Invoices
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {accounts.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold">No enterprise accounts yet</p>
              <p className="text-muted-foreground mt-2">
                Create your first enterprise trial account to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}