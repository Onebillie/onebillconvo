import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Filter,
} from "lucide-react";

interface UsageRecord {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  message_count: number;
  base_fee: number;
  message_fee: number;
  total_fee: number;
  created_at: string;
  businesses: {
    name: string;
    subscription_tier: string;
  };
}

interface RevenueStats {
  totalRevenue: number;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  averageRevenuePerBusiness: number;
}

export default function PaymentsTracking() {
  const { toast } = useToast();
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [filteredUsage, setFilteredUsage] = useState<UsageRecord[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    currentMonthRevenue: 0,
    lastMonthRevenue: 0,
    averageRevenuePerBusiness: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  useEffect(() => {
    fetchUsageData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [usage, dateFilter, tierFilter]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("usage_tracking")
        .select(`
          *,
          businesses (
            name,
            subscription_tier
          )
        `)
        .order("period_end", { ascending: false });

      if (error) throw error;

      const usageData = data as UsageRecord[];
      setUsage(usageData);

      // Calculate stats
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const currentMonthRevenue = usageData
        .filter((u) => new Date(u.period_end) >= currentMonth)
        .reduce((sum, u) => sum + (u.total_fee || 0), 0);

      const lastMonthRevenue = usageData
        .filter(
          (u) =>
            new Date(u.period_end) >= lastMonth &&
            new Date(u.period_end) < currentMonth
        )
        .reduce((sum, u) => sum + (u.total_fee || 0), 0);

      const totalRevenue = usageData.reduce((sum, u) => sum + (u.total_fee || 0), 0);

      const uniqueBusinesses = new Set(usageData.map((u) => u.business_id)).size;

      setStats({
        totalRevenue,
        currentMonthRevenue,
        lastMonthRevenue,
        averageRevenuePerBusiness:
          uniqueBusinesses > 0 ? totalRevenue / uniqueBusinesses : 0,
      });
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

  const applyFilters = () => {
    let filtered = [...usage];

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "current_month":
          filterDate.setMonth(now.getMonth(), 1);
          break;
        case "last_month":
          filterDate.setMonth(now.getMonth() - 1, 1);
          break;
        case "last_3_months":
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case "last_year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(
        (u) => new Date(u.period_end) >= filterDate
      );
    }

    // Tier filter
    if (tierFilter !== "all") {
      filtered = filtered.filter(
        (u) => u.businesses.subscription_tier === tierFilter
      );
    }

    setFilteredUsage(filtered);
  };

  const exportData = () => {
    const csv = [
      [
        "Business",
        "Tier",
        "Period Start",
        "Period End",
        "Messages",
        "Base Fee",
        "Message Fee",
        "Total Fee",
      ],
      ...filteredUsage.map((u) => [
        u.businesses.name,
        u.businesses.subscription_tier,
        u.period_start,
        u.period_end,
        u.message_count,
        u.base_fee,
        u.message_fee,
        u.total_fee,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const revenueGrowth =
    stats.lastMonthRevenue > 0
      ? ((stats.currentMonthRevenue - stats.lastMonthRevenue) /
          stats.lastMonthRevenue) *
        100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Payments & Revenue</h1>
          <p className="text-muted-foreground">
            Track revenue, usage, and payment history
          </p>
        </div>
        <Button onClick={exportData}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold">€{stats.totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Month</p>
              <p className="text-3xl font-bold">
                €{stats.currentMonthRevenue.toFixed(2)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last Month</p>
              <p className="text-3xl font-bold">
                €{stats.lastMonthRevenue.toFixed(2)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Growth</p>
              <p
                className={`text-3xl font-bold ${
                  revenueGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {revenueGrowth >= 0 ? "+" : ""}
                {revenueGrowth.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1 grid md:grid-cols-2 gap-4">
            <div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Table */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Usage & Billing History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Business</th>
                <th className="text-left p-4">Tier</th>
                <th className="text-left p-4">Period</th>
                <th className="text-left p-4">Messages</th>
                <th className="text-left p-4">Base Fee</th>
                <th className="text-left p-4">Message Fee</th>
                <th className="text-left p-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsage.map((record) => (
                <tr key={record.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{record.businesses.name}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary uppercase">
                      {record.businesses.subscription_tier}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <p>
                        {new Date(record.period_start).toLocaleDateString()} -{" "}
                      </p>
                      <p>{new Date(record.period_end).toLocaleDateString()}</p>
                    </div>
                  </td>
                  <td className="p-4">{record.message_count}</td>
                  <td className="p-4">€{record.base_fee?.toFixed(2) || "0.00"}</td>
                  <td className="p-4">€{record.message_fee?.toFixed(2) || "0.00"}</td>
                  <td className="p-4 font-bold">
                    €{record.total_fee?.toFixed(2) || "0.00"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
