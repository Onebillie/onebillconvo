import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const TransformNode = memo(({ data }: { data: any }) => {
  const mappingCount = data.mapping?.length || 0;
  
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-cyan-500 bg-background min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-cyan-500" />
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="h-5 w-5 text-cyan-500" />
        <div className="font-semibold text-foreground">Transform</div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        Map and structure data
      </div>
      {mappingCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {mappingCount} mapping{mappingCount > 1 ? "s" : ""}
        </Badge>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-cyan-500" />
    </div>
  );
});

TransformNode.displayName = "TransformNode";
