import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";
import { NotificationBanner } from "@/components/ui/notification-banner";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SuperAdmin from "./pages/SuperAdmin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManagement from "./pages/admin/UsersManagement";
import SystemHealth from "./pages/admin/SystemHealth";
import SubscriptionManagement from "./pages/admin/SubscriptionManagement";
import PricingConfiguration from "./pages/admin/PricingConfiguration";
import PaymentsTracking from "./pages/admin/PaymentsTracking";

const queryClient = new QueryClient();

function AppContent() {
  const { unreadCount } = useGlobalNotifications();

  return (
    <>
      <NotificationBanner unreadCount={unreadCount} />
      <div className={unreadCount > 0 ? "pt-14" : ""}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/superadmin" element={<SuperAdmin />} />
          
          {/* OneBillChat App Routes */}
          <Route path="/onebillchat" element={<Index />} />
          <Route path="/onebillchat/dashboard" element={<Dashboard />} />
          <Route path="/onebillchat/settings" element={<Settings />} />
          <Route path="/onebillchat/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="system" element={<SystemHealth />} />
          </Route>
          
          {/* SuperAdmin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="subscriptions" element={<SubscriptionManagement />} />
            <Route path="pricing" element={<PricingConfiguration />} />
            <Route path="payments" element={<PaymentsTracking />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="system" element={<SystemHealth />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
