import { Zap, Bot, FileType, GitBranch, Wand2, Globe, Clock, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const nodeCategories = [
  {
    category: "Entry",
    nodes: [
      {
        type: "trigger",
        icon: Zap,
        label: "Trigger",
        description: "Start workflow on attachment",
        color: "text-green-500",
      },
    ],
  },
  {
    category: "Processing",
    nodes: [
      {
        type: "parse",
        icon: Bot,
        label: "AI Parse",
        description: "Extract data with AI",
        color: "text-blue-500",
      },
      {
        type: "documentType",
        icon: FileType,
        label: "Document Type",
        description: "Classify document",
        color: "text-orange-500",
      },
      {
        type: "transform",
        icon: Wand2,
        label: "Transform",
        description: "Map and structure data",
        color: "text-cyan-500",
      },
    ],
  },
  {
    category: "Logic",
    nodes: [
      {
        type: "condition",
        icon: GitBranch,
        label: "Condition",
        description: "If/Then logic",
        color: "text-yellow-500",
      },
    ],
  },
  {
    category: "Actions",
    nodes: [
      {
        type: "apiAction",
        icon: Globe,
        label: "API Call",
        description: "Send to external API",
        color: "text-green-600",
      },
      {
        type: "delay",
        icon: Clock,
        label: "Delay",
        description: "Wait before continuing",
        color: "text-gray-500",
      },
    ],
  },
  {
    category: "Terminal",
    nodes: [
      {
        type: "end",
        icon: CheckCircle,
        label: "End",
        description: "Complete workflow",
        color: "text-purple-500",
      },
    ],
  },
];

export function NodeSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-64 border-r border-border bg-muted/30">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-foreground mb-2">Workflow Nodes</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Drag nodes onto the canvas to build your workflow
            </p>
          </div>

          {nodeCategories.map((category) => (
            <div key={category.category} className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {category.category}
              </h4>
              {category.nodes.map((node) => (
                <Card
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-background"
                >
                  <div className="flex items-start gap-3">
                    <node.icon className={`h-5 w-5 mt-0.5 ${node.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">{node.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {node.description}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
