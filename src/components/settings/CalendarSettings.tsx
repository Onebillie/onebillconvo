import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Plus, Trash2, RefreshCw, Calendar } from "lucide-react";
import { downloadICS } from "@/lib/icsExport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CalendarSyncConfig {
  id: string;
  name: string;
  is_active: boolean;
  provider: string;
  calendar_url: string | null;
  api_key: string | null;
  sync_interval_minutes: number;
  sync_tasks: boolean;
  sync_completed_tasks: boolean;
  default_timezone: string;
  include_description: boolean;
  last_sync_at: string | null;
}

export const CalendarSettings = () => {
  const [configs, setConfigs] = useState<CalendarSyncConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: "",
    provider: "google",
    calendar_url: "",
    api_key: "",
    sync_interval_minutes: 15,
    sync_tasks: true,
    sync_completed_tasks: false,
    default_timezone: "UTC",
    include_description: true,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from("calendar_sync_config")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching calendar configs:", error);
      toast({
        title: "Error",
        description: "Failed to load calendar configurations",
        variant: "destructive",
      });
      return;
    }

    setConfigs(data || []);
  };

  const handleCreateConfig = async () => {
    if (!newConfig.name) {
      toast({
        title: "Error",
        description: "Please enter a configuration name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("calendar_sync_config").insert([newConfig]);

    if (error) {
      console.error("Error creating config:", error);
      toast({
        title: "Error",
        description: "Failed to create calendar configuration",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Calendar configuration created successfully",
      });
      setDialogOpen(false);
      fetchConfigs();
      setNewConfig({
        name: "",
        provider: "google",
        calendar_url: "",
        api_key: "",
        sync_interval_minutes: 15,
        sync_tasks: true,
        sync_completed_tasks: false,
        default_timezone: "UTC",
        include_description: true,
      });
    }
    setLoading(false);
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("calendar_sync_config")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    } else {
      fetchConfigs();
    }
  };

  const handleDeleteConfig = async (id: string) => {
    const { error } = await supabase
      .from("calendar_sync_config")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Configuration deleted successfully",
      });
      fetchConfigs();
    }
  };

  const handleExportAllTasks = async () => {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
      return;
    }

    if (!tasks || tasks.length === 0) {
      toast({
        title: "No tasks",
        description: "There are no tasks to export",
      });
      return;
    }

    // Generate combined ICS file
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OneBill//Task Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    tasks.forEach(task => {
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dueDate = new Date(task.due_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${task.id}@onebill.ie`,
        `DTSTAMP:${now}`,
        `DTSTART:${dueDate}`,
        `DTEND:${dueDate}`,
        `SUMMARY:${task.title}`,
        task.description ? `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}` : '',
        `PRIORITY:${task.priority === 'high' ? '1' : task.priority === 'medium' ? '5' : '9'}`,
        `STATUS:${task.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.filter(Boolean).join('\r\n')], { 
      type: 'text/calendar;charset=utf-8' 
    });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `all-tasks-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);

    toast({
      title: "Success",
      description: `Exported ${tasks.length} tasks to calendar file`,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export Settings</TabsTrigger>
          <TabsTrigger value="sync">Calendar Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Calendar Events
              </CardTitle>
              <CardDescription>
                Export tasks and events as .ICS files to import into other calendars
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Export all tasks as a single calendar file that can be imported into:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Google Calendar</li>
                  <li>Microsoft Outlook</li>
                  <li>Apple Calendar</li>
                  <li>Any calendar app that supports .ICS files</li>
                </ul>
              </div>

              <Button onClick={handleExportAllTasks} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export All Tasks as ICS
              </Button>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Quick Actions:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Individual tasks can be exported from the task details view</p>
                  <p>• Exported files include task title, description, due date, and priority</p>
                  <p>• Calendar apps will automatically parse and display the tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Calendar Sync Configurations</h3>
              <p className="text-sm text-muted-foreground">
                Automatically sync tasks to external calendars
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Calendar Sync</DialogTitle>
                  <DialogDescription>
                    Configure automatic calendar synchronization
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Configuration Name</Label>
                    <Input
                      id="name"
                      value={newConfig.name}
                      onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                      placeholder="e.g., Main Google Calendar"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider">Calendar Provider</Label>
                    <Select
                      value={newConfig.provider}
                      onValueChange={(value) => setNewConfig({ ...newConfig, provider: value })}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Calendar</SelectItem>
                        <SelectItem value="outlook">Microsoft Outlook</SelectItem>
                        <SelectItem value="apple">Apple Calendar</SelectItem>
                        <SelectItem value="caldav">CalDAV</SelectItem>
                        <SelectItem value="webcal">WebCal URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calendar_url">Calendar URL</Label>
                    <Input
                      id="calendar_url"
                      value={newConfig.calendar_url}
                      onChange={(e) => setNewConfig({ ...newConfig, calendar_url: e.target.value })}
                      placeholder="https://calendar.example.com/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_key">API Key / Token</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={newConfig.api_key}
                      onChange={(e) => setNewConfig({ ...newConfig, api_key: e.target.value })}
                      placeholder="Enter API key or access token"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sync_interval">Sync Interval (minutes)</Label>
                    <Input
                      id="sync_interval"
                      type="number"
                      value={newConfig.sync_interval_minutes}
                      onChange={(e) => setNewConfig({ ...newConfig, sync_interval_minutes: parseInt(e.target.value) })}
                      min="5"
                      max="1440"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Input
                      id="timezone"
                      value={newConfig.default_timezone}
                      onChange={(e) => setNewConfig({ ...newConfig, default_timezone: e.target.value })}
                      placeholder="UTC"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_tasks">Sync Tasks</Label>
                      <Switch
                        id="sync_tasks"
                        checked={newConfig.sync_tasks}
                        onCheckedChange={(checked) => setNewConfig({ ...newConfig, sync_tasks: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_completed">Sync Completed Tasks</Label>
                      <Switch
                        id="sync_completed"
                        checked={newConfig.sync_completed_tasks}
                        onCheckedChange={(checked) => setNewConfig({ ...newConfig, sync_completed_tasks: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="include_desc">Include Descriptions</Label>
                      <Switch
                        id="include_desc"
                        checked={newConfig.include_description}
                        onCheckedChange={(checked) => setNewConfig({ ...newConfig, include_description: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateConfig} disabled={loading}>
                      {loading ? "Creating..." : "Create Configuration"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {configs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No calendar sync configurations yet</p>
                  <p className="text-sm mt-1">Add a configuration to automatically sync tasks</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <Card key={config.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{config.name}</CardTitle>
                        <CardDescription>
                          {config.provider.charAt(0).toUpperCase() + config.provider.slice(1)} • 
                          Syncs every {config.sync_interval_minutes} minutes
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={() => handleToggleActive(config.id, config.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteConfig(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Sync Tasks</p>
                        <p className="font-medium">{config.sync_tasks ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Include Completed</p>
                        <p className="font-medium">{config.sync_completed_tasks ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Timezone</p>
                        <p className="font-medium">{config.default_timezone}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Sync</p>
                        <p className="font-medium">
                          {config.last_sync_at
                            ? new Date(config.last_sync_at).toLocaleString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
