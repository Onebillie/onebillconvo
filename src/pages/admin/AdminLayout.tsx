import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Activity, Settings, ArrowLeft, CreditCard, DollarSign, Receipt, Building2 } from "lucide-react";
import { useEffect } from "react";

export default function AdminLayout() {
  const { isSuperAdmin, isAdminSession, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!isSuperAdmin) {
        navigate("/app/dashboard");
      } else if (!isAdminSession) {
        navigate("/admin/login");
      }
    }
  }, [isSuperAdmin, isAdminSession, loading, navigate]);

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/enterprise", label: "Enterprise Accounts", icon: Building2 },
    { path: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    { path: "/admin/pricing-config", label: "Pricing Config", icon: DollarSign },
    { path: "/admin/payments", label: "Payments", icon: Receipt },
    { path: "/admin/users", label: "Users", icon: Users },
    { path: "/admin/system", label: "System Health", icon: Activity },
    { path: "/admin/testing", label: "System Testing", icon: Activity },
    { path: "/app/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Mode Banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 text-center text-sm font-medium">
        🔐 SuperAdmin Mode Active - System Management Access
      </div>
      
      {/* Top Navigation */}
      <header className="border-b bg-card border-red-900/10">
        <div className="flex h-16 items-center px-6 gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to App
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">SuperAdmin Portal</h1>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-64 border-r bg-card min-h-[calc(100vh-4rem)]">
          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
