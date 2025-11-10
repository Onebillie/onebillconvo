import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowList } from "./WorkflowList";
import { CreateWorkflowDialog } from "./CreateWorkflowDialog";
import { DocumentTypeManager } from "./DocumentTypeManager";
import { ApiEndpointManager } from "./ApiEndpointManager";
import { WorkflowTemplates } from "./WorkflowTemplates";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DocumentWorkflowsAccordion() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Workflows allow you to automatically parse documents, identify their type, and trigger actions like
          sending data to APIs, creating notifications, or storing files with labels.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="document-types">Document Types</TabsTrigger>
          <TabsTrigger value="api-endpoints">API Endpoints</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplates />
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
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
            <CardContent>
              <WorkflowList />
            </CardContent>
          </Card>

          <CreateWorkflowDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          />
        </TabsContent>

        <TabsContent value="document-types" className="mt-6">
          <DocumentTypeManager />
        </TabsContent>

        <TabsContent value="api-endpoints" className="mt-6">
          <ApiEndpointManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
