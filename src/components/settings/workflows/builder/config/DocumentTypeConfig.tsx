import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface DocumentTypeConfigProps {
  data: any;
  onChange: (data: any) => void;
}

export function DocumentTypeConfig({ data, onChange }: DocumentTypeConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Recognition Strategy</Label>
        <Select
          value={data.strategy || "both"}
          onValueChange={(value) => onChange({ ...data, strategy: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai_classification">AI Classification Only</SelectItem>
            <SelectItem value="keyword_matching">Keyword Matching Only</SelectItem>
            <SelectItem value="both">Both (Recommended)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Minimum Confidence: {Math.round((data.minConfidence || 0.8) * 100)}%</Label>
        <Slider
          value={[data.minConfidence || 0.8]}
          onValueChange={([value]) => onChange({ ...data, minConfidence: value })}
          min={0}
          max={1}
          step={0.05}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Documents below this confidence will be marked as "Unknown"
        </p>
      </div>

      <div className="border-t pt-4">
        <Label className="text-base">Document Types</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Configure document types in the "Document Types" tab first, then select them here
        </p>
        <div className="p-3 bg-muted/50 rounded text-xs text-muted-foreground">
          Document type selection coming soon - configure in Document Types Manager
        </div>
      </div>
    </div>
  );
}
