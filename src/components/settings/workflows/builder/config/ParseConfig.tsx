import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface ParseConfigProps {
  data: any;
  onChange: (data: any) => void;
}

export function ParseConfig({ data, onChange }: ParseConfigProps) {
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("string");
  const [newFieldDesc, setNewFieldDesc] = useState("");

  const schema = data.extractionSchema || {};
  const fields = Object.entries(schema);

  const addField = () => {
    if (!newFieldName) return;
    onChange({
      ...data,
      extractionSchema: {
        ...schema,
        [newFieldName]: {
          type: newFieldType,
          required: true,
          description: newFieldDesc,
        },
      },
    });
    setNewFieldName("");
    setNewFieldDesc("");
  };

  const removeField = (fieldName: string) => {
    const newSchema = { ...schema };
    delete newSchema[fieldName];
    onChange({ ...data, extractionSchema: newSchema });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>AI Provider</Label>
        <Select
          value={data.provider || "lovable_ai"}
          onValueChange={(value) => onChange({ ...data, provider: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lovable_ai">Lovable AI</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Model</Label>
        <Select
          value={data.model || "google/gemini-2.5-flash"}
          onValueChange={(value) => onChange({ ...data, model: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
            <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
            <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
            <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="pii-masking"
          checked={data.enablePIIMasking !== false}
          onCheckedChange={(checked) => onChange({ ...data, enablePIIMasking: checked })}
        />
        <Label htmlFor="pii-masking" className="cursor-pointer">
          Enable PII Masking
        </Label>
      </div>

      <div>
        <Label>Confidence Threshold: {Math.round((data.confidenceThreshold || 0.8) * 100)}%</Label>
        <Slider
          value={[data.confidenceThreshold || 0.8]}
          onValueChange={([value]) => onChange({ ...data, confidenceThreshold: value })}
          min={0}
          max={1}
          step={0.05}
          className="mt-2"
        />
      </div>

      <div className="border-t pt-4">
        <Label className="text-base">Extraction Schema</Label>
        <p className="text-xs text-muted-foreground mb-3">Define fields to extract from documents</p>

        <div className="space-y-2 mb-3">
          {fields.map(([name, config]: [string, any]) => (
            <div key={name} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <div className="flex-1">
                <div className="font-medium text-sm">{name}</div>
                <div className="text-xs text-muted-foreground">{config.type} - {config.description}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeField(name)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-3">
          <Input
            placeholder="Field name (e.g., mprn)"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
          />
          <Select value={newFieldType} onValueChange={setNewFieldType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="array">Array</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Description (e.g., Meter Point Reference Number)"
            value={newFieldDesc}
            onChange={(e) => setNewFieldDesc(e.target.value)}
            rows={2}
          />
          <Button onClick={addField} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>
    </div>
  );
}
