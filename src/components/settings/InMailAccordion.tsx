import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Settings2, Bell, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const InMailAccordion = () => {
  return (
    <Accordion type="multiple" defaultValue={["inmail-settings"]} className="w-full space-y-4">
      <AccordionItem value="inmail-settings" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">InMail Settings</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Access your InMail messages by clicking the mail icon in the top navigation bar.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you want to be notified about new internal messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show browser notifications for new messages
                  </p>
                </div>
                <Switch id="desktop-notifications" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email alerts for urgent messages
                  </p>
                </div>
                <Switch id="email-notifications" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound-notifications">Sound Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Play a sound when new messages arrive
                  </p>
                </div>
                <Switch id="sound-notifications" defaultChecked />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority-filter">Auto-Read Messages</Label>
                <Select defaultValue="never">
                  <SelectTrigger id="priority-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="low">Low priority only</SelectItem>
                    <SelectItem value="normal">Normal and below</SelectItem>
                    <SelectItem value="all">All messages</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Automatically mark messages as read when viewed
                </p>
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};