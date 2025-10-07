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
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import SignUp from "./pages/SignUp";
import PaymentSuccess from "./pages/PaymentSuccess";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManagement from "./pages/admin/UsersManagement";
import SystemHealth from "./pages/admin/SystemHealth";
import SubscriptionManagement from "./pages/admin/SubscriptionManagement";
import PricingConfiguration from "./pages/admin/PricingConfiguration";
import PaymentsTracking from "./pages/admin/PaymentsTracking";
import { AccountFrozenBanner } from "./components/AccountFrozenBanner";

const queryClient = new QueryClient();

function AppContent() {
  const { unreadCount } = useGlobalNotifications();

  return (
    <>
      <AccountFrozenBanner />
      <NotificationBanner unreadCount={unreadCount} />
      <div className={unreadCount > 0 ? "pt-14" : ""}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/app/onboarding" element={<Onboarding />} />
          
          {/* Customer Business App Routes */}
          <Route path="/app" element={<Index />} />
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route path="/app/settings" element={<Settings />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Legacy routes - redirect to /app */}
          <Route path="/onebillchat" element={<Index />} />
          <Route path="/onebillchat/dashboard" element={<Dashboard />} />
          <Route path="/onebillchat/settings" element={<Settings />} />
          
          {/* Platform Owner (SuperAdmin) Routes */}
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
