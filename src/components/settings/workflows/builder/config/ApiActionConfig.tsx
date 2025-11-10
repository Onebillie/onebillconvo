import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ApiActionConfigProps {
  data: any;
  onChange: (data: any) => void;
}

export function ApiActionConfig({ data, onChange }: ApiActionConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>HTTP Method</Label>
        <Select
          value={data.method || "POST"}
          onValueChange={(value) => onChange({ ...data, method: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Endpoint URL</Label>
        <Input
          placeholder="https://api.example.com/endpoint"
          value={data.url || ""}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use variables like {`{{parsed_data.field}}`}
        </p>
      </div>

      <div>
        <Label>Headers (JSON)</Label>
        <Textarea
          placeholder={`{\n  "Authorization": "Bearer {{secrets.API_KEY}}",\n  "Content-Type": "application/json"\n}`}
          value={typeof data.headers === "object" ? JSON.stringify(data.headers, null, 2) : data.headers || "{}"}
          onChange={(e) => {
            try {
              const headers = JSON.parse(e.target.value);
              onChange({ ...data, headers });
            } catch {
              onChange({ ...data, headers: e.target.value });
            }
          }}
          rows={5}
        />
      </div>

      <div>
        <Label>Request Body Template (JSON)</Label>
        <Textarea
          placeholder={`{\n  "phone": "{{parsed_data.phone}}",\n  "mprn": "{{parsed_data.mprn}}"\n}`}
          value={data.bodyTemplate || "{}"}
          onChange={(e) => onChange({ ...data, bodyTemplate: e.target.value })}
          rows={8}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use Handlebars-style variables from parsed data
        </p>
      </div>

      <div>
        <Label>Timeout (ms)</Label>
        <Input
          type="number"
          value={data.timeoutMs || 30000}
          onChange={(e) => onChange({ ...data, timeoutMs: parseInt(e.target.value) })}
        />
      </div>

      <div>
        <Label>Max Retries</Label>
        <Input
          type="number"
          value={data.retryConfig?.maxRetries || 3}
          onChange={(e) =>
            onChange({
              ...data,
              retryConfig: { ...data.retryConfig, maxRetries: parseInt(e.target.value) },
            })
          }
        />
      </div>
    </div>
  );
}
