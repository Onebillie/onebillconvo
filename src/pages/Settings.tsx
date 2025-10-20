import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings as SettingsIcon, MessageSquare } from "lucide-react";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";
import { StaffManagement } from "@/components/settings/StaffManagement";
import { StatusManagement } from "@/components/settings/StatusManagement";
import { TaskSettings } from "@/components/settings/TaskSettings";
import { BusinessSettings } from "@/components/settings/BusinessSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { ApiAccessManagement } from "@/components/settings/ApiAccessManagement";
import { AIAssistantSettings } from "@/components/settings/AIAssistantSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { ChannelSettings } from "@/components/settings/ChannelSettings";
import { UsageDashboard } from "@/components/settings/UsageDashboard";
import { CannedResponses } from "@/components/settings/CannedResponses";
import { AIApprovalQueue } from "@/components/chat/AIApprovalQueue";

export default function Settings() {
  const { profile, loading, signOut, isAdmin, isSuperAdmin } = useAuth();
  const { unreadCount } = useGlobalNotifications();
  const navigate = useNavigate();

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
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-6 justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="relative">
              <MessageSquare className="w-4 h-4 mr-2" />
              Dashboard
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue={isSuperAdmin ? "staff" : "subscription"} className="space-y-6">
          <TabsList className="w-full overflow-x-auto whitespace-nowrap inline-flex flex-nowrap gap-1">
            {isSuperAdmin && <TabsTrigger value="staff" className="shrink-0">Staff</TabsTrigger>}
            <TabsTrigger value="subscription" className="shrink-0">Subscription</TabsTrigger>
            <TabsTrigger value="channels" className="shrink-0">Channels</TabsTrigger>
            <TabsTrigger value="statuses" className="shrink-0">Statuses</TabsTrigger>
            <TabsTrigger value="tasks" className="shrink-0">Tasks</TabsTrigger>
            <TabsTrigger value="business" className="shrink-0">Business</TabsTrigger>
            <TabsTrigger value="calendar" className="shrink-0">Calendar</TabsTrigger>
            <TabsTrigger value="ai" className="shrink-0">AI Assistant</TabsTrigger>
            <TabsTrigger value="canned" className="shrink-0">Quick Replies</TabsTrigger>
            <TabsTrigger value="ai-approval" className="shrink-0">AI Approval</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="api" className="shrink-0">API Access</TabsTrigger>}
          </TabsList>

          {isSuperAdmin && (
            <TabsContent value="staff" forceMount>
              <StaffManagement />
            </TabsContent>
          )}

          <TabsContent value="subscription" forceMount className="space-y-6">
            <UsageDashboard />
            <SubscriptionSettings />
          </TabsContent>

          <TabsContent value="channels" forceMount>
            <ChannelSettings />
          </TabsContent>

          <TabsContent value="statuses" forceMount>
            <StatusManagement />
          </TabsContent>

          <TabsContent value="tasks" forceMount>
            <TaskSettings />
          </TabsContent>

          <TabsContent value="business" forceMount className="space-y-4">
            <BusinessSettings />
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="calendar" forceMount>
            <CalendarSettings />
          </TabsContent>

          <TabsContent value="ai" forceMount>
            <AIAssistantSettings />
          </TabsContent>

          <TabsContent value="canned" forceMount>
            <CannedResponses />
          </TabsContent>

          <TabsContent value="ai-approval" forceMount>
            <AIApprovalQueue />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="api" forceMount>
              <ApiAccessManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
