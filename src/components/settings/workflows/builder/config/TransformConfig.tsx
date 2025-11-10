import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface TransformConfigProps {
  data: any;
  onChange: (data: any) => void;
}

export function TransformConfig({ data, onChange }: TransformConfigProps) {
  const mapping = data.mapping || [];

  const addMapping = () => {
    onChange({
      ...data,
      mapping: [...mapping, { outputField: "", sourceField: "", transformation: "none" }],
    });
  };

  const updateMapping = (index: number, updates: any) => {
    const newMapping = [...mapping];
    newMapping[index] = { ...newMapping[index], ...updates };
    onChange({ ...data, mapping: newMapping });
  };

  const removeMapping = (index: number) => {
    onChange({ ...data, mapping: mapping.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Field Mappings</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Map and transform fields from parsed data to API payload structure
        </p>
      </div>

      {mapping.length === 0 && (
        <div className="p-4 bg-muted/50 rounded text-center text-sm text-muted-foreground">
          No mappings added yet
        </div>
      )}

      {mapping.map((map: any, index: number) => (
        <div key={index} className="border rounded p-3 space-y-2">
          <Input
            placeholder="Output field (e.g., api_payload.customer_phone)"
            value={map.outputField || ""}
            onChange={(e) => updateMapping(index, { outputField: e.target.value })}
          />

          <Input
            placeholder="Source field (e.g., parsed_data.phone)"
            value={map.sourceField || ""}
            onChange={(e) => updateMapping(index, { sourceField: e.target.value })}
          />

          <Select
            value={map.transformation || "none"}
            onValueChange={(value) => updateMapping(index, { transformation: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Transformation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="uppercase">Uppercase</SelectItem>
              <SelectItem value="lowercase">Lowercase</SelectItem>
              <SelectItem value="trim">Trim</SelectItem>
              <SelectItem value="format_date">Format Date</SelectItem>
              <SelectItem value="format_phone">Format Phone</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => removeMapping(index)} className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Mapping
          </Button>
        </div>
      ))}

      <Button onClick={addMapping} size="sm" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Mapping
      </Button>
    </div>
  );
}
