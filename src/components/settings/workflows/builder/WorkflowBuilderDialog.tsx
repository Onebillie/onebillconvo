import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { NodeSidebar } from "./NodeSidebar";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { TriggerNode } from "./nodes/TriggerNode";
import { ParseNode } from "./nodes/ParseNode";
import { DocumentTypeNode } from "./nodes/DocumentTypeNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { TransformNode } from "./nodes/TransformNode";
import { ApiActionNode } from "./nodes/ApiActionNode";
import { DelayNode } from "./nodes/DelayNode";
import { EndNode } from "./nodes/EndNode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, Play, X } from "lucide-react";
import dagre from "dagre";

const nodeTypes = {
  trigger: TriggerNode,
  parse: ParseNode,
  documentType: DocumentTypeNode,
  condition: ConditionNode,
  transform: TransformNode,
  apiAction: ApiActionNode,
  delay: DelayNode,
  end: EndNode,
};

// Type mappings between UI and database
const uiTypeToDbType: Record<string, string> = {
  trigger: 'trigger',
  parse: 'parse',
  documentType: 'document_type',
  condition: 'condition',
  transform: 'transform',
  apiAction: 'api_action',
  delay: 'delay',
  end: 'end',
};

const dbTypeToUiType: Record<string, string> = {
  trigger: 'trigger',
  parse: 'parse',
  document_type: 'documentType',
  condition: 'condition',
  transform: 'transform',
  api_action: 'apiAction',
  delay: 'delay',
  end: 'end',
};

interface WorkflowBuilderDialogProps {
  workflowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WorkflowBuilderContent({ workflowId, onOpenChange }: Omit<WorkflowBuilderDialogProps, "open">) {
  const { currentBusinessId } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-layout nodes using dagre
  const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 150 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 250, height: 150 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 125,
          y: nodeWithPosition.y - 75,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  };

  // Load workflow from database
  useEffect(() => {
    if (!workflowId || !currentBusinessId) return;

    const loadWorkflow = async () => {
      setIsLoading(true);
      try {
        const { data: steps, error } = await supabase
          .from("workflow_steps")
          .select("*")
          .eq("workflow_id", workflowId)
          .order("step_order");

        if (error) throw error;

        if (!steps || steps.length === 0) {
          // Create default trigger node
          const triggerId = `trigger-${Date.now()}`;
          setNodes([
            {
              id: triggerId,
              type: "trigger",
              position: { x: 250, y: 50 },
              data: {
                triggerType: "attachment_received",
                filters: {},
              },
            },
          ]);
          setIsLoading(false);
          return;
        }

        // Convert database steps to React Flow nodes
        const loadedNodes: Node[] = steps.map((step) => ({
          id: step.id,
          type: dbTypeToUiType[step.step_type] || step.step_type,
          position: { x: 0, y: 0 },
          data: step.step_config || {},
        }));

        // Create edges from next_step connections
        const loadedEdges: Edge[] = [];
        steps.forEach((step) => {
          if (step.next_step_on_success) {
            loadedEdges.push({
              id: `${step.id}-success`,
              source: step.id,
              target: step.next_step_on_success,
              label: "Success",
              type: "smoothstep",
              animated: true,
            });
          }
          if (step.next_step_on_failure) {
            loadedEdges.push({
              id: `${step.id}-failure`,
              source: step.id,
              target: step.next_step_on_failure,
              label: "Failure",
              type: "smoothstep",
              style: { stroke: "hsl(var(--destructive))" },
            });
          }
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          loadedNodes,
          loadedEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      } catch (error) {
        console.error("Error loading workflow:", error);
        toast.error("Failed to load workflow");
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId, currentBusinessId, setNodes, setEdges]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      // Auto-set edge label based on source handle
      const label = params.sourceHandle === 'success' ? 'Success' : 
                    params.sourceHandle === 'failure' ? 'Failure' : undefined;
      
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            label,
            type: "smoothstep",
            animated: true,
            style: params.sourceHandle === 'failure' ? { stroke: "hsl(var(--destructive))" } : undefined,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle node click
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle node drag
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle node drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const reactFlowBounds = (event.target as HTMLElement)
        .closest(".react-flow")
        ?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 125,
        y: event.clientY - reactFlowBounds.top - 75,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  // Get default data for new nodes
  const getDefaultNodeData = (type: string) => {
    switch (type) {
      case "trigger":
        return { triggerType: "attachment_received", filters: {} };
      case "parse":
        return { provider: "lovable_ai", model: "google/gemini-2.5-flash", extractionSchema: {}, enablePIIMasking: true, confidenceThreshold: 0.8 };
      case "documentType":
        return { documentTypes: [], strategy: "both", minConfidence: 0.8 };
      case "condition":
        return { conditions: [] };
      case "transform":
        return { mapping: [] };
      case "apiAction":
        return { method: "POST", url: "", headers: {}, bodyTemplate: "{}", retryConfig: { maxRetries: 3, backoffMs: 1000 }, timeoutMs: 30000 };
      case "delay":
        return { duration: 5, unit: "seconds" };
      case "end":
        return { status: "success" };
      default:
        return {};
    }
  };

  // Save workflow to database
  const handleSave = async () => {
    if (!workflowId || !currentBusinessId) return;

    setIsSaving(true);
    try {
      // Validate workflow
      const triggerNodes = nodes.filter((n) => n.type === "trigger");
      if (triggerNodes.length === 0) {
        toast.error("Workflow must have at least one trigger node");
        setIsSaving(false);
        return;
      }

      // Delete existing steps
      await supabase.from("workflow_steps").delete().eq("workflow_id", workflowId);

      // Convert nodes to database format
      const steps = nodes.map((node, index) => {
        // Find edges by sourceHandle instead of label
        const successEdge = edges.find((e) => e.source === node.id && e.sourceHandle === 'success');
        const failureEdge = edges.find((e) => e.source === node.id && e.sourceHandle === 'failure');

        return {
          workflow_id: workflowId,
          step_order: index,
          step_type: uiTypeToDbType[node.type!] || node.type!,
          step_config: node.data,
          next_step_on_success: successEdge?.target || null,
          next_step_on_failure: failureEdge?.target || null,
        };
      });

      const { error } = await supabase.from("workflow_steps").insert(steps);

      if (error) throw error;

      toast.success("Workflow saved successfully");
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  };

  // Update node data when config changes
  const handleNodeConfigChange = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  // Delete node
  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh]">
      <NodeSidebar />
      
      <div className="flex-1 relative">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Test
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background className="bg-muted/20" />
          <Controls />
          <MiniMap className="bg-background border border-border" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onConfigChange={handleNodeConfigChange}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

export function WorkflowBuilderDialog({ workflowId, open, onOpenChange }: WorkflowBuilderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Workflow Builder</DialogTitle>
        </DialogHeader>
        <ReactFlowProvider>
          <WorkflowBuilderContent workflowId={workflowId} onOpenChange={onOpenChange} />
        </ReactFlowProvider>
      </DialogContent>
    </Dialog>
  );
}
