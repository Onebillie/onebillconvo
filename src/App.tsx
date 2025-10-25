import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Features from "./pages/Features";
import WhyUs from "./pages/WhyUs";
import FAQ from "./pages/FAQ";
import Guides from "./pages/Guides";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Marketing from "./pages/Marketing";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import SignUp from "./pages/SignUp";
import PaymentSuccess from "./pages/PaymentSuccess";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Training from "./pages/Training";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import CreateSuperAdmin from "./pages/admin/CreateSuperAdmin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManagement from "./pages/admin/UsersManagement";
import SystemHealth from "./pages/admin/SystemHealth";
import SubscriptionManagement from "./pages/admin/SubscriptionManagement";
import PricingConfiguration from "./pages/admin/PricingConfiguration";
import PricingConfig from "./pages/admin/PricingConfig";
import PaymentsTracking from "./pages/admin/PaymentsTracking";
import SystemTesting from "./pages/admin/SystemTesting";
import PaymentTesting from "./pages/admin/PaymentTesting";
import EnterpriseAccounts from "./pages/admin/EnterpriseAccounts";
import EmbedConversation from "./pages/embed/EmbedConversation";
import EmbedInbox from "./pages/embed/EmbedInbox";
import { AccountFrozenBanner } from "./components/AccountFrozenBanner";
import { CookieConsent } from "./components/CookieConsent";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

const queryClient = new QueryClient();

function AppContent() {
  return (
    <>
      <AccountFrozenBanner />
      <CookieConsent />
      <PWAInstallPrompt />
      
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/why-us" element={<WhyUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/training" element={<Training />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/app/onboarding" element={<Onboarding />} />
          
          {/* Customer Business App Routes */}
          <Route path="/app" element={<Index />} />
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route path="/app/settings" element={<Settings />} />
          <Route path="/app/marketing" element={<Marketing />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          
          {/* Legacy routes - redirect to /app */}
          <Route path="/onebillchat" element={<Index />} />
          <Route path="/onebillchat/dashboard" element={<Dashboard />} />
          <Route path="/onebillchat/settings" element={<Settings />} />
          
          {/* Platform Owner (SuperAdmin) Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/create-superadmin" element={<CreateSuperAdmin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="enterprise" element={<EnterpriseAccounts />} />
            <Route path="subscriptions" element={<SubscriptionManagement />} />
            <Route path="pricing" element={<PricingConfiguration />} />
            <Route path="pricing-config" element={<PricingConfig />} />
            <Route path="payments" element={<PaymentsTracking />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="system" element={<SystemHealth />} />
            <Route path="testing" element={<SystemTesting />} />
            <Route path="payment-testing" element={<PaymentTesting />} />
          </Route>
          
          {/* Embed Routes - No Auth Required */}
          <Route path="/embed/conversation" element={<EmbedConversation />} />
          <Route path="/embed/inbox" element={<EmbedInbox />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter future={{ 
        v7_startTransition: true,
        v7_relativeSplatPath: true 
      }}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
