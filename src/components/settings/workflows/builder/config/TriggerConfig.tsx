import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TriggerConfigProps {
  data: any;
  onChange: (data: any) => void;
}

export function TriggerConfig({ data, onChange }: TriggerConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Trigger Type</Label>
        <Select
          value={data.triggerType || "attachment_received"}
          onValueChange={(value) => onChange({ ...data, triggerType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attachment_received">On Attachment Received</SelectItem>
            <SelectItem value="message_received">On Message Received</SelectItem>
            <SelectItem value="manual">Manual Trigger</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>File Type Filters (optional)</Label>
        <Input
          placeholder="pdf, png, jpg"
          value={data.filters?.fileTypes?.join(", ") || ""}
          onChange={(e) => {
            const fileTypes = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
            onChange({ ...data, filters: { ...data.filters, fileTypes } });
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
      </div>

      <div>
        <Label>Channel Filters (optional)</Label>
        <Input
          placeholder="whatsapp, email, sms"
          value={data.filters?.channels?.join(", ") || ""}
          onChange={(e) => {
            const channels = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
            onChange({ ...data, filters: { ...data.filters, channels } });
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
      </div>

      {data.triggerType === "message_received" && (
        <div>
          <Label>Message Keyword Filters (optional)</Label>
          <Input
            placeholder="bill, invoice, receipt"
            value={data.filters?.keywords?.join(", ") || ""}
            onChange={(e) => {
              const keywords = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
              onChange({ ...data, filters: { ...data.filters, keywords } });
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">Trigger only when message contains these keywords</p>
        </div>
      )}
    </div>
  );
}
