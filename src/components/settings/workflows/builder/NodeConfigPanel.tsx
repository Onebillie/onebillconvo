import { Node } from "reactflow";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Trash2 } from "lucide-react";
import { TriggerConfig } from "./config/TriggerConfig";
import { ParseConfig } from "./config/ParseConfig";
import { DocumentTypeConfig } from "./config/DocumentTypeConfig";
import { ConditionConfig } from "./config/ConditionConfig";
import { TransformConfig } from "./config/TransformConfig";
import { ApiActionConfig } from "./config/ApiActionConfig";
import { DelayConfig } from "./config/DelayConfig";
import { EndConfig } from "./config/EndConfig";

interface NodeConfigPanelProps {
  node: Node;
  onConfigChange: (nodeId: string, newData: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onConfigChange, onDelete, onClose }: NodeConfigPanelProps) {
  const handleConfigChange = (newData: any) => {
    onConfigChange(node.id, newData);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this node?")) {
      onDelete(node.id);
    }
  };

  const renderConfig = () => {
    switch (node.type) {
      case "trigger":
        return <TriggerConfig data={node.data} onChange={handleConfigChange} />;
      case "parse":
        return <ParseConfig data={node.data} onChange={handleConfigChange} />;
      case "documentType":
        return <DocumentTypeConfig data={node.data} onChange={handleConfigChange} />;
      case "condition":
        return <ConditionConfig data={node.data} onChange={handleConfigChange} />;
      case "transform":
        return <TransformConfig data={node.data} onChange={handleConfigChange} />;
      case "apiAction":
        return <ApiActionConfig data={node.data} onChange={handleConfigChange} />;
      case "delay":
        return <DelayConfig data={node.data} onChange={handleConfigChange} />;
      case "end":
        return <EndConfig data={node.data} onChange={handleConfigChange} />;
      default:
        return <div className="text-muted-foreground">No configuration available for this node type.</div>;
    }
  };

  return (
    <div className="w-96 border-l border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Node Configuration</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">{renderConfig()}</div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  );
}
