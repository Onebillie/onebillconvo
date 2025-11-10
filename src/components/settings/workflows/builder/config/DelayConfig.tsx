import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface DelayConfigProps {
  data: any;
  onChange: (data: any) => void;
}

export function DelayConfig({ data, onChange }: DelayConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Duration</Label>
        <Input
          type="number"
          min="1"
          value={data.duration || 5}
          onChange={(e) => onChange({ ...data, duration: parseInt(e.target.value) })}
        />
      </div>

      <div>
        <Label>Unit</Label>
        <Select
          value={data.unit || "seconds"}
          onValueChange={(value) => onChange({ ...data, unit: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="seconds">Seconds</SelectItem>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-muted/50 rounded text-xs text-muted-foreground">
        Workflow will pause for {data.duration || 5} {data.unit || "seconds"} before continuing to the next step
      </div>
    </div>
  );
}
