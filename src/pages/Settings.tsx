import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Users, Mail, CreditCard, MessageSquare, Tags, CheckSquare, Building2, Calendar, Bot, MessageCircle, Shield, Bell, Key, ChevronDown } from "lucide-react";
import { UnifiedStaffManagement } from "@/components/settings/UnifiedStaffManagement";
import { PersistentHeader } from "@/components/PersistentHeader";
import { InMailAccordion } from "@/components/settings/InMailAccordion";
import { SubscriptionAccordion } from "@/components/settings/SubscriptionAccordion";
import { ChannelSettings } from "@/components/settings/ChannelSettings";
import { StatusesAccordion } from "@/components/settings/StatusesAccordion";
import { TasksAccordion } from "@/components/settings/TasksAccordion";
import { BusinessAccordion } from "@/components/settings/BusinessAccordion";
import { CalendarAccordion } from "@/components/settings/CalendarAccordion";
import { AIAccordion } from "@/components/settings/AIAccordion";
import { QuickRepliesAccordion } from "@/components/settings/QuickRepliesAccordion";
import { AIApprovalAccordion } from "@/components/settings/AIApprovalAccordion";
import { NotificationsAccordion } from "@/components/settings/NotificationsAccordion";
import { ApiAccessAccordion } from "@/components/settings/ApiAccessAccordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Settings() {
  const { profile, loading, isAdmin, isSuperAdmin, currentBusinessId } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "staff" : "subscription");

  const tabOptions = [
    ...(isSuperAdmin ? [{ value: "staff", label: "Staff & Teams", icon: Users }] : []),
    { value: "inmail", label: "In-Mail", icon: Mail },
    { value: "subscription", label: "Subscription", icon: CreditCard },
    { value: "channels", label: "Channels", icon: MessageSquare },
    { value: "statuses", label: "Statuses", icon: Tags },
    { value: "tasks", label: "Tasks", icon: CheckSquare },
    { value: "business", label: "Business", icon: Building2 },
    { value: "calendar", label: "Calendar", icon: Calendar },
    { value: "ai", label: "AI Assistant", icon: Bot },
    { value: "canned", label: "Quick Replies", icon: MessageCircle },
    { value: "ai-approval", label: "AI Approval", icon: Shield },
    { value: "notifications", label: "Notifications", icon: Bell },
    ...(isSuperAdmin ? [{ value: "api", label: "API Access", icon: Key }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile || !profile.is_active) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PersistentHeader />

      {/* Content */}
      <div className="container mx-auto p-3 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-semibold">Settings</h1>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Mobile: Dropdown Menu */}
          {isMobile ? (
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-12">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const option = tabOptions.find(opt => opt.value === activeTab);
                      const Icon = option?.icon;
                      return (
                        <>
                          {Icon && <Icon className="w-4 h-4" />}
                          <span>{option?.label}</span>
                        </>
                      );
                    })()}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tabOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            /* Desktop: Horizontal Tabs */
            <TabsList className="w-full overflow-x-auto whitespace-nowrap inline-flex flex-nowrap gap-1">
              {tabOptions.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="shrink-0">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {isSuperAdmin && (
            <TabsContent value="staff" forceMount>
              <UnifiedStaffManagement />
            </TabsContent>
          )}

          <TabsContent value="inmail" forceMount>
            <InMailAccordion />
          </TabsContent>

          <TabsContent value="subscription" forceMount>
            <SubscriptionAccordion />
          </TabsContent>

          <TabsContent value="channels" forceMount>
            <ChannelSettings businessId={currentBusinessId} />
          </TabsContent>

          <TabsContent value="statuses" forceMount>
            <StatusesAccordion />
          </TabsContent>

          <TabsContent value="tasks" forceMount>
            <TasksAccordion />
          </TabsContent>

          <TabsContent value="business" forceMount>
            <BusinessAccordion />
          </TabsContent>

          <TabsContent value="calendar" forceMount>
            <CalendarAccordion />
          </TabsContent>

          <TabsContent value="ai" forceMount>
            <AIAccordion />
          </TabsContent>

          <TabsContent value="canned" forceMount>
            <QuickRepliesAccordion />
          </TabsContent>

          <TabsContent value="ai-approval" forceMount>
            <AIApprovalAccordion />
          </TabsContent>

          <TabsContent value="notifications" forceMount>
            <NotificationsAccordion />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="api" forceMount>
              <ApiAccessAccordion />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
