import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface ConditionConfigProps {
  data: any;
  onChange: (data: any) => void;
}

export function ConditionConfig({ data, onChange }: ConditionConfigProps) {
  const conditions = data.conditions || [];

  const addCondition = () => {
    onChange({
      ...data,
      conditions: [
        ...conditions,
        { field: "", operator: "equals", value: "", logicalOperator: "AND" },
      ],
    });
  };

  const updateCondition = (index: number, updates: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ ...data, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    onChange({ ...data, conditions: conditions.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Conditions</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Define conditions to branch workflow execution
        </p>
      </div>

      {conditions.length === 0 && (
        <div className="p-4 bg-muted/50 rounded text-center text-sm text-muted-foreground">
          No conditions added yet
        </div>
      )}

      {conditions.map((condition: any, index: number) => (
        <div key={index} className="border rounded p-3 space-y-2">
          {index > 0 && (
            <Select
              value={condition.logicalOperator || "AND"}
              onValueChange={(value) => updateCondition(index, { logicalOperator: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Input
            placeholder="Field (e.g., parsed_data.mprn)"
            value={condition.field || ""}
            onChange={(e) => updateCondition(index, { field: e.target.value })}
          />

          <Select
            value={condition.operator || "equals"}
            onValueChange={(value) => updateCondition(index, { operator: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">Equals</SelectItem>
              <SelectItem value="not_equals">Not Equals</SelectItem>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="not_contains">Not Contains</SelectItem>
              <SelectItem value="greater_than">Greater Than</SelectItem>
              <SelectItem value="less_than">Less Than</SelectItem>
              <SelectItem value="exists">Exists</SelectItem>
              <SelectItem value="not_exists">Not Exists</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Value"
            value={condition.value || ""}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
          />

          <Button variant="ghost" size="sm" onClick={() => removeCondition(index)} className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Condition
          </Button>
        </div>
      ))}

      <Button onClick={addCondition} size="sm" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
    </div>
  );
}
