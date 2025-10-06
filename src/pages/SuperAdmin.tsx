import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, DollarSign, Activity, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessStats {
  totalBusinesses: number;
  activeSubscriptions: number;
  trialAccounts: number;
  totalRevenue: number;
  messageCount: number;
}

interface Business {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  message_count_current_period: number;
  created_at: string;
}

const SuperAdmin = () => {
  const { isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<BusinessStats>({
    totalBusinesses: 0,
    activeSubscriptions: 0,
    trialAccounts: 0,
    totalRevenue: 0,
    messageCount: 0,
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }

    fetchSuperAdminData();
  }, [isSuperAdmin, navigate]);

  const fetchSuperAdminData = async () => {
    try {
      setLoading(true);

      // Fetch all businesses
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });

      if (businessError) throw businessError;

      const businesses = businessData || [];
      setBusinesses(businesses);

      // Calculate statistics
      const stats: BusinessStats = {
        totalBusinesses: businesses.length,
        activeSubscriptions: businesses.filter(
          (b) => b.subscription_status === "active"
        ).length,
        trialAccounts: businesses.filter(
          (b) => b.subscription_status === "trialing"
        ).length,
        totalRevenue: businesses
          .filter((b) => b.subscription_tier !== "free")
          .reduce((sum, b) => sum + 30, 0), // Base fee calculation
        messageCount: businesses.reduce(
          (sum, b) => sum + b.message_count_current_period,
          0
        ),
      };

      setStats(stats);
    } catch (error: any) {
      console.error("Error fetching super admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          </div>
          <Button onClick={() => signOut()} variant="outline">
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
                  <Activity className="w-8 h-8 text-primary opacity-50" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Trial Accounts</p>
                    <p className="text-3xl font-bold">{stats.trialAccounts}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary opacity-50" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Monthly Revenue</p>
                    <p className="text-3xl font-bold">€{stats.totalRevenue}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary opacity-50" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Messages</p>
                    <p className="text-3xl font-bold">{stats.messageCount}</p>
                  </div>
                  <Activity className="w-8 h-8 text-primary opacity-50" />
                </div>
              </Card>
            </div>

            {/* Businesses Table */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">All Businesses</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Business Name</th>
                      <th className="text-left p-4">Subscription</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Messages</th>
                      <th className="text-left p-4">Trial Ends</th>
                      <th className="text-left p-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map((business) => (
                      <tr key={business.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 font-medium">{business.name}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                            {business.subscription_tier}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              business.subscription_status === "active"
                                ? "bg-green-100 text-green-700"
                                : business.subscription_status === "trialing"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {business.subscription_status}
                          </span>
                        </td>
                        <td className="p-4">{business.message_count_current_period}</td>
                        <td className="p-4">
                          {business.trial_ends_at
                            ? new Date(business.trial_ends_at).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="p-4">
                          {new Date(business.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SuperAdmin;