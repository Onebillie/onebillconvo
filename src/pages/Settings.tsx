import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Users, Mail, CreditCard, MessageSquare, Tags, CheckSquare, Building2, Calendar, Bot, MessageCircle, Shield, Bell, Key, Palette, Webhook } from "lucide-react";
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
import { WebsiteChatWidget } from "@/components/settings/WebsiteChatWidget";
import { WebhookManagement } from "@/components/settings/WebhookManagement";
import { ThemeCustomization } from "@/components/settings/ThemeCustomization";
import { GroupedSettingsNav } from "@/components/settings/GroupedSettingsNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { profile, loading, isAdmin, isSuperAdmin, currentBusinessId } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("subscription");

  const tabOptionsByGroup = [
    {
      group: "Account & Billing",
      options: [
        { value: "subscription", label: "Subscription", icon: CreditCard },
        { value: "inmail", label: "In-Mail", icon: Mail },
      ],
    },
    {
      group: "Communication",
      options: [
        { value: "channels", label: "Channels", icon: MessageSquare },
        { value: "webhooks", label: "Webhooks", icon: Webhook },
        { value: "canned", label: "Quick Replies", icon: MessageCircle },
        { value: "statuses", label: "Statuses", icon: Tags },
      ],
    },
    {
      group: "Automation & AI",
      options: [
        { value: "ai", label: "AI Assistant", icon: Bot },
        { value: "ai-approval", label: "AI Approval", icon: Shield },
      ],
    },
    {
      group: "Workflow",
      options: [
        { value: "tasks", label: "Tasks", icon: CheckSquare },
        { value: "calendar", label: "Calendar", icon: Calendar },
      ],
    },
    {
      group: "Business",
      options: [
        { value: "business", label: "Business Info", icon: Building2 },
        ...(isSuperAdmin ? [{ value: "staff", label: "Staff & Teams", icon: Users }] : []),
      ],
    },
    {
      group: "Customization",
      options: [
        { value: "theme", label: "Theme Colors", icon: Palette },
        { value: "notifications", label: "Notifications", icon: Bell },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            group: "Advanced",
            options: [{ value: "api", label: "API Access", icon: Key }],
          },
        ]
      : []),
  ];

  const allTabOptions = tabOptionsByGroup.flatMap((group) => group.options);

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
          {/* Mobile: Grouped Dropdown Menu */}
          {isMobile ? (
            <>
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const option = allTabOptions.find((opt) => opt.value === activeTab);
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
                <SelectContent className="max-h-[400px]">
                  {tabOptionsByGroup.map((group, groupIdx) => (
                    <div key={group.group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.group}
                      </div>
                      {group.options.map((option) => {
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
                      {groupIdx < tabOptionsByGroup.length - 1 && (
                        <Separator className="my-1" />
                      )}
                    </div>
                  ))}
                </SelectContent>
              </Select>

              {/* Mobile Tab Contents */}
              {isSuperAdmin && (
                <TabsContent value="staff">
                  <UnifiedStaffManagement />
                </TabsContent>
              )}

              <TabsContent value="inmail">
                <InMailAccordion />
              </TabsContent>

              <TabsContent value="subscription">
                <SubscriptionAccordion />
              </TabsContent>

              <TabsContent value="channels">
                <ChannelSettings businessId={currentBusinessId} />
              </TabsContent>

              <TabsContent value="webhooks">
                <WebhookManagement />
              </TabsContent>

              <TabsContent value="statuses">
                <StatusesAccordion />
              </TabsContent>

              <TabsContent value="tasks">
                <TasksAccordion />
              </TabsContent>

              <TabsContent value="business">
                <BusinessAccordion />
              </TabsContent>

              <TabsContent value="calendar">
                <CalendarAccordion />
              </TabsContent>

              <TabsContent value="ai">
                <AIAccordion />
              </TabsContent>

              <TabsContent value="canned">
                <QuickRepliesAccordion />
              </TabsContent>

              <TabsContent value="ai-approval">
                <AIApprovalAccordion />
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationsAccordion />
              </TabsContent>

              <TabsContent value="theme">
                {currentBusinessId && <ThemeCustomization businessId={currentBusinessId} />}
              </TabsContent>

              {isSuperAdmin && (
                <TabsContent value="api">
                  <ApiAccessAccordion />
                </TabsContent>
              )}
            </>
          ) : (
            /* Desktop: Grouped Sidebar Navigation */
            <div className="grid grid-cols-[280px_1fr] gap-6">
              <div className="sticky top-6 self-start">
                <GroupedSettingsNav
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  isSuperAdmin={isSuperAdmin}
                />
              </div>

              {/* Desktop Tab Contents */}
              <div className="min-w-0">
                {isSuperAdmin && (
                  <TabsContent value="staff">
                    <UnifiedStaffManagement />
                  </TabsContent>
                )}

                <TabsContent value="inmail">
                  <InMailAccordion />
                </TabsContent>

                <TabsContent value="subscription">
                  <SubscriptionAccordion />
                </TabsContent>

                <TabsContent value="channels">
                  <ChannelSettings businessId={currentBusinessId} />
                </TabsContent>

                <TabsContent value="webhooks">
                  <WebhookManagement />
                </TabsContent>

                <TabsContent value="statuses">
                  <StatusesAccordion />
                </TabsContent>

                <TabsContent value="tasks">
                  <TasksAccordion />
                </TabsContent>

                <TabsContent value="business">
                  <BusinessAccordion />
                </TabsContent>

                <TabsContent value="calendar">
                  <CalendarAccordion />
                </TabsContent>

                <TabsContent value="ai">
                  <AIAccordion />
                </TabsContent>

                <TabsContent value="canned">
                  <QuickRepliesAccordion />
                </TabsContent>

                <TabsContent value="ai-approval">
                  <AIApprovalAccordion />
                </TabsContent>

                <TabsContent value="notifications">
                  <NotificationsAccordion />
                </TabsContent>

                <TabsContent value="theme">
                  {currentBusinessId && <ThemeCustomization businessId={currentBusinessId} />}
                </TabsContent>

                {isSuperAdmin && (
                  <TabsContent value="api">
                    <ApiAccessAccordion />
                  </TabsContent>
                )}
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}
