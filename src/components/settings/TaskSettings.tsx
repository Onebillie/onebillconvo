import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const TaskSettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Settings</CardTitle>
        <CardDescription>Configure default task settings and notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Task Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications when tasks are due
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-assign Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign tasks based on conversation assignment
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Overdue Task Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Send alerts for overdue tasks
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Default Task Duration (hours)</Label>
          <Input type="number" defaultValue="24" min="1" />
        </div>

        <div className="space-y-2">
          <Label>Reminder Before Due (hours)</Label>
          <Input type="number" defaultValue="2" min="1" />
        </div>

        <div className="pt-4">
          <Button>Save Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
};
