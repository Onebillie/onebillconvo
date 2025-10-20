import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, FileJson } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ConversationExportProps {
  conversationId?: string;
  customerId?: string;
}

export function ConversationExport({ conversationId, customerId }: ConversationExportProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);

    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          conversations!inner (
            id,
            customer:customers!inner (
              name,
              email,
              phone
            )
          )
        `)
        .order('created_at', { ascending: true });

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (customerId) {
        query = query.eq('conversations.customer_id', customerId);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      if (!messages || messages.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no messages to export for this selection.",
          variant: "destructive",
        });
        return;
      }

      if (exportFormat === "csv") {
        exportAsCSV(messages);
      } else {
        exportAsJSON(messages);
      }

      toast({
        title: "Export successful",
        description: `Exported ${messages.length} messages as ${exportFormat.toUpperCase()}`,
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportAsCSV = (messages: any[]) => {
    const headers = [
      "Date",
      "Time",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Channel",
      "Direction",
      "Content",
      "Status",
      ...(includeMetadata ? ["Message ID", "Conversation ID"] : []),
    ];

    const rows = messages.map(msg => [
      format(new Date(msg.created_at), "yyyy-MM-dd"),
      format(new Date(msg.created_at), "HH:mm:ss"),
      msg.conversations?.customer?.name || "Unknown",
      msg.conversations?.customer?.email || "",
      msg.conversations?.customer?.phone || "",
      msg.platform || "unknown",
      msg.direction || "unknown",
      msg.content || "",
      msg.status || "",
      ...(includeMetadata ? [msg.id, msg.conversation_id] : []),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    downloadFile(csvContent, "conversation-export.csv", "text/csv");
  };

  const exportAsJSON = (messages: any[]) => {
    const exportData = messages.map(msg => ({
      timestamp: msg.created_at,
      customer: {
        name: msg.conversations?.customer?.name || "Unknown",
        email: msg.conversations?.customer?.email || "",
        phone: msg.conversations?.customer?.phone || "",
      },
      channel: msg.platform,
      direction: msg.direction,
      content: msg.content,
      status: msg.status,
      ...(includeMetadata && {
        metadata: {
          message_id: msg.id,
          conversation_id: msg.conversation_id,
          attachments: msg.attachments,
        }
      }),
    }));

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, "conversation-export.json", "application/json");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
          <DialogDescription>
            Export messages to CSV or JSON format for backup or analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer font-normal">
                  <FileText className="w-4 h-4" />
                  CSV (Excel compatible)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer font-normal">
                  <FileJson className="w-4 h-4" />
                  JSON (Developer friendly)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="metadata" className="cursor-pointer font-normal">
                  Include metadata (IDs, timestamps)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attachments"
                  checked={includeAttachments}
                  onCheckedChange={(checked) => setIncludeAttachments(checked as boolean)}
                />
                <Label htmlFor="attachments" className="cursor-pointer font-normal">
                  Include attachment URLs
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
