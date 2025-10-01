import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { StaffManagement } from "@/components/settings/StaffManagement";
import { TemplateManagement } from "@/components/settings/TemplateManagement";
import { StatusManagement } from "@/components/settings/StatusManagement";
import { TaskSettings } from "@/components/settings/TaskSettings";
import { BusinessSettings } from "@/components/settings/BusinessSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { WhatsAppTemplateManagement } from "@/components/settings/WhatsAppTemplateManagement";
import { ApiAccessManagement } from "@/components/settings/ApiAccessManagement";

export default function Settings() {
  const { profile, loading, signOut } = useAuth();

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

  const isAdmin = profile.role === 'admin' || profile.role === 'superadmin';
  const isSuperAdmin = profile.role === 'superadmin';

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
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/dashboard'}>
              Back to Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue="staff" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
            {isSuperAdmin && <TabsTrigger value="staff">Staff</TabsTrigger>}
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="statuses">Statuses</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="api">API Access</TabsTrigger>}
          </TabsList>

          {isSuperAdmin && (
            <TabsContent value="staff">
              <StaffManagement />
            </TabsContent>
          )}

          <TabsContent value="templates">
            <TemplateManagement />
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppTemplateManagement />
          </TabsContent>

          <TabsContent value="statuses">
            <StatusManagement />
          </TabsContent>

          <TabsContent value="tasks">
            <TaskSettings />
          </TabsContent>

          <TabsContent value="business">
            <BusinessSettings />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarSettings />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="api">
              <ApiAccessManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
