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
  const logic = data.logic || 'AND';

  const addCondition = () => {
    onChange({
      ...data,
      conditions: [
        ...conditions,
        { id: crypto.randomUUID(), field: "", operator: "equals", value: "", logicalOperator: "AND" },
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

      {conditions.length > 1 && (
        <div>
          <Label>Logic Operator</Label>
          <Select
            value={logic}
            onValueChange={(value) => onChange({ ...data, logic: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND (all conditions must match)</SelectItem>
              <SelectItem value="OR">OR (any condition must match)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {conditions.length === 0 && (
        <div className="p-4 bg-muted/50 rounded text-center text-sm text-muted-foreground">
          No conditions added yet
        </div>
      )}

      {conditions.map((condition: any, index: number) => (
        <div key={condition.id || index} className="border rounded p-3 space-y-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Input
              placeholder="parsed_data.mprn"
              value={condition.field || ""}
              onChange={(e) => updateCondition(index, { field: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-xs">Operator</Label>
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
          </div>

          {!['exists', 'not_exists'].includes(condition.operator) && (
            <div>
              <Label className="text-xs">Value</Label>
              <Input
                placeholder="Enter value"
                value={condition.value || ""}
                onChange={(e) => updateCondition(index, { value: e.target.value })}
              />
            </div>
          )}

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
