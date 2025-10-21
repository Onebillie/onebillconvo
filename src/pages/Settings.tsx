import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmbedTokenManagement } from "@/components/settings/EmbedTokenManagement";
import { EmbedWidgetCustomization } from "@/components/settings/EmbedWidgetCustomization";
import { EmbedAISettings } from "@/components/settings/EmbedAISettings";

export default function Settings() {
  const { profile, loading, isAdmin, isSuperAdmin, currentBusinessId } = useAuth();
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
      <PersistentHeader />

      {/* Content */}
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        
        <Tabs defaultValue={isSuperAdmin ? "staff" : "subscription"} className="space-y-6">
          <TabsList className="w-full overflow-x-auto whitespace-nowrap inline-flex flex-nowrap gap-1">
            {isSuperAdmin && <TabsTrigger value="staff" className="shrink-0">Staff & Teams</TabsTrigger>}
            <TabsTrigger value="inmail" className="shrink-0">In-Mail</TabsTrigger>
            <TabsTrigger value="subscription" className="shrink-0">Subscription</TabsTrigger>
            <TabsTrigger value="channels" className="shrink-0">Channels</TabsTrigger>
            <TabsTrigger value="statuses" className="shrink-0">Statuses</TabsTrigger>
            <TabsTrigger value="tasks" className="shrink-0">Tasks</TabsTrigger>
            <TabsTrigger value="business" className="shrink-0">Business</TabsTrigger>
            <TabsTrigger value="calendar" className="shrink-0">Calendar</TabsTrigger>
            <TabsTrigger value="ai" className="shrink-0">AI Assistant</TabsTrigger>
            <TabsTrigger value="canned" className="shrink-0">Quick Replies</TabsTrigger>
            <TabsTrigger value="ai-approval" className="shrink-0">AI Approval</TabsTrigger>
            <TabsTrigger value="notifications" className="shrink-0">Notifications</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="api" className="shrink-0">API Access</TabsTrigger>}
          </TabsList>

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
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="channels">
                <AccordionTrigger>Channel Configuration</AccordionTrigger>
                <AccordionContent>
                  <ChannelSettings />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="tokens">
                <AccordionTrigger>Widget - Embed Tokens</AccordionTrigger>
                <AccordionContent>
                  <EmbedTokenManagement />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="customization">
                <AccordionTrigger>Widget - Customization</AccordionTrigger>
                <AccordionContent>
                  {currentBusinessId && <EmbedWidgetCustomization businessId={currentBusinessId} />}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ai-settings">
                <AccordionTrigger>Widget - AI Settings</AccordionTrigger>
                <AccordionContent>
                  {currentBusinessId && <EmbedAISettings businessId={currentBusinessId} />}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
