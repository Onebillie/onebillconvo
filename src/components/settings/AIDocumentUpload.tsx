import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AIDocumentUploadProps {
  businessId: string;
  onUploadComplete: () => void;
}

export function AIDocumentUpload({ businessId, onUploadComplete }: AIDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/html',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please upload PDF, DOCX, TXT, HTML, CSV, or XLSX files.');
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Upload to storage
      const fileName = `${businessId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ai-knowledge-base')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      setProgress(40);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ai-knowledge-base')
        .getPublicUrl(fileName);

      setProgress(60);
      setProcessing(true);

      // Process document (parse and chunk)
      const { data: processData, error: processError } = await supabase.functions.invoke('process-ai-document', {
        body: {
          businessId,
          fileName: file.name,
          filePath: fileName,
          fileSize: file.size,
          fileType: file.type
        }
      });

      if (processError) throw processError;

      setProgress(100);
      toast.success(`Document "${file.name}" uploaded and processed successfully`);
      onUploadComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document: ' + error.message);
    } finally {
      setUploading(false);
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Upload your business documents, procedures, terms & conditions, and FAQs. 
          Supported formats: PDF, DOCX, TXT, HTML, CSV, XLSX (max 20MB)
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Label htmlFor="document-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                {uploading ? (
                  <div className="space-y-3">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {processing ? 'Processing document...' : 'Uploading...'}
                    </p>
                    <Progress value={progress} className="w-full" />
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, TXT, HTML, CSV, XLSX up to 20MB
                    </p>
                  </>
                )}
              </div>
            </Label>
            <Input
              id="document-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.html,.csv,.xls,.xlsx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
