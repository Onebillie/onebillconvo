import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const TriggerNode = memo(({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-green-500 bg-background min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5 text-green-500" />
        <div className="font-semibold text-foreground">Trigger</div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {data.triggerType === "attachment_received" && "On attachment received"}
        {data.triggerType === "manual" && "Manual trigger"}
        {data.triggerType === "scheduled" && "Scheduled trigger"}
      </div>
      {data.filters && Object.keys(data.filters).length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {Object.keys(data.filters).length} filter{Object.keys(data.filters).length > 1 ? "s" : ""}
        </Badge>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-green-500" />
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";
