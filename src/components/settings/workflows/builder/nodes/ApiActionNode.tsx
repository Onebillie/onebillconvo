import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ApiActionNode = memo(({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-green-600 bg-background min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-green-600" />
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-5 w-5 text-green-600" />
        <div className="font-semibold text-foreground">API Call</div>
      </div>
      <div className="text-xs text-muted-foreground mb-2 truncate">
        {data.url || "Configure endpoint"}
      </div>
      {data.method && (
        <Badge variant="secondary" className="text-xs">
          {data.method}
        </Badge>
      )}
      <Handle type="source" position={Position.Bottom} id="success" className="w-3 h-3 !bg-green-500 translate-x-[-20px]" />
      <Handle type="source" position={Position.Bottom} id="failure" className="w-3 h-3 !bg-red-500 translate-x-[20px]" />
    </div>
  );
});

ApiActionNode.displayName = "ApiActionNode";
