import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Clock } from "lucide-react";

export const DelayNode = memo(({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-gray-500 bg-background min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-500" />
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-5 w-5 text-gray-500" />
        <div className="font-semibold text-foreground">Delay</div>
      </div>
      <div className="text-xs text-muted-foreground">
        Wait {data.duration || 5} {data.unit || "seconds"}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-500" />
    </div>
  );
});

DelayNode.displayName = "DelayNode";
