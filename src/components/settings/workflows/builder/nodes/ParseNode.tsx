import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ParseNode = memo(({ data }: { data: any }) => {
  const fieldCount = data.extractionSchema ? Object.keys(data.extractionSchema).length : 0;
  
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-blue-500 bg-background min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-5 w-5 text-blue-500" />
        <div className="font-semibold text-foreground">AI Parse</div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {data.model || "google/gemini-2.5-flash"}
      </div>
      <div className="flex gap-1 flex-wrap">
        {fieldCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {fieldCount} field{fieldCount > 1 ? "s" : ""}
          </Badge>
        )}
        {data.enablePIIMasking && (
          <Badge variant="outline" className="text-xs">
            PII Masking
          </Badge>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
});

ParseNode.displayName = "ParseNode";
