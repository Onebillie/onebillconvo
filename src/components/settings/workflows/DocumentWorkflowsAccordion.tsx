import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowList } from "./WorkflowList";
import { CreateWorkflowDialog } from "./CreateWorkflowDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DocumentWorkflowsAccordion() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Document Workflows</CardTitle>
            <CardDescription>
              Create custom workflows to automatically process and handle documents
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Workflows allow you to automatically parse documents, identify their type, and trigger actions like
            sending data to APIs, creating notifications, or storing files with labels. Configure document types
            and API endpoints before creating workflows.
          </AlertDescription>
        </Alert>

        <WorkflowList />

        <CreateWorkflowDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </CardContent>
    </Card>
  );
}
