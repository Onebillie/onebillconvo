import { memo } from "react";
import { Handle, Position } from "reactflow";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ConditionNode = memo(({ data }: { data: any }) => {
  const conditionCount = data.conditions?.length || 0;
  
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-yellow-500 bg-background min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-yellow-500" />
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-5 w-5 text-yellow-500" />
        <div className="font-semibold text-foreground">Condition</div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        If/Then logic
      </div>
      {conditionCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {conditionCount} condition{conditionCount > 1 ? "s" : ""}
        </Badge>
      )}
      <Handle type="source" position={Position.Bottom} id="success" className="w-3 h-3 !bg-green-500 translate-x-[-20px]" />
      <Handle type="source" position={Position.Bottom} id="failure" className="w-3 h-3 !bg-red-500 translate-x-[20px]" />
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";
