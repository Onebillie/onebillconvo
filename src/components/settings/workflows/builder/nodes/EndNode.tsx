import { memo } from "react";
import { Handle, Position } from "reactflow";
import { CheckCircle, XCircle } from "lucide-react";

export const EndNode = memo(({ data }: { data: any }) => {
  const isSuccess = data.status === "success";
  
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 ${isSuccess ? "border-green-500" : "border-red-500"} bg-background min-w-[200px]`}>
      <Handle type="target" position={Position.Top} className={`w-3 h-3 ${isSuccess ? "!bg-green-500" : "!bg-red-500"}`} />
      <div className="flex items-center gap-2 mb-2">
        {isSuccess ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <div className="font-semibold text-foreground">End</div>
      </div>
      <div className="text-xs text-muted-foreground">
        {isSuccess ? "Success" : "Failure"}
      </div>
    </div>
  );
});

EndNode.displayName = "EndNode";
