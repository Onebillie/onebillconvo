import { memo } from "react";
import { Handle, Position } from "reactflow";
import { FileType } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const DocumentTypeNode = memo(({ data }: { data: any }) => {
  const typeCount = data.documentTypes?.length || 0;
  
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-orange-500 bg-background min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-orange-500" />
      <div className="flex items-center gap-2 mb-2">
        <FileType className="h-5 w-5 text-orange-500" />
        <div className="font-semibold text-foreground">Document Type</div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        Classify document type
      </div>
      {typeCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {typeCount} type{typeCount > 1 ? "s" : ""}
        </Badge>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-orange-500" />
    </div>
  );
});

DocumentTypeNode.displayName = "DocumentTypeNode";
