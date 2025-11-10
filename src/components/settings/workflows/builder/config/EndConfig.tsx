import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface EndConfigProps {
  data: any;
  onChange: (data: any) => void;
}

export function EndConfig({ data, onChange }: EndConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Status</Label>
        <Select
          value={data.status || "success"}
          onValueChange={(value) => onChange({ ...data, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="send-notification"
          checked={data.notificationConfig?.sendNotification || false}
          onCheckedChange={(checked) =>
            onChange({
              ...data,
              notificationConfig: { ...data.notificationConfig, sendNotification: checked },
            })
          }
        />
        <Label htmlFor="send-notification" className="cursor-pointer">
          Send Notification
        </Label>
      </div>

      {data.notificationConfig?.sendNotification && (
        <div>
          <Label>Notification Message</Label>
          <Textarea
            placeholder="Workflow completed successfully"
            value={data.notificationConfig?.message || ""}
            onChange={(e) =>
              onChange({
                ...data,
                notificationConfig: { ...data.notificationConfig, message: e.target.value },
              })
            }
            rows={3}
          />
        </div>
      )}

      <div className="p-3 bg-muted/50 rounded text-xs text-muted-foreground">
        This marks the end of the workflow execution path
      </div>
    </div>
  );
}
