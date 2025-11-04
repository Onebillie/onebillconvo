import { useState, useCallback } from 'react';
import { Upload, Camera, FileCheck, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ClassificationResult {
  classification: 'meter' | 'electricity' | 'gas';
  confidence: number;
  fields: Record<string, string>;
  field_confidence: Record<string, number>;
  low_confidence_fields: string[];
}

export const OneBillFileUpload = () => {
  const { currentBusinessId, user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatIrishPhone = (input: string): string => {
    let digits = input.replace(/\D/g, '');
    
    if (digits.startsWith('353')) {
      digits = digits.substring(3);
    } else if (digits.startsWith('00353')) {
      digits = digits.substring(5);
    } else if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    
    if (digits.length === 9 && digits.startsWith('8')) {
      return `+353 ${digits[0]}${digits[1]} ${digits.substring(2, 5)} ${digits.substring(5)}`;
    }
    
    return `+353${digits}`;
  };

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, HEIC, or PDF files.');
      return;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (selectedFile.size > maxSize) {
      toast.error('File too large. Maximum size is 25MB.');
      return;
    }

    setFile(selectedFile);
    setClassification(null);
    setEditedFields({});
    await uploadAndClassify(selectedFile);
  };

  const uploadAndClassify = async (fileToUpload: File) => {
    if (!currentBusinessId || !user) return;

    try {
      setUploading(true);
      setUploadProgress(30);

      // Upload file to Supabase storage
      const fileName = `${Date.now()}_${fileToUpload.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('customer_media')
        .upload(`${currentBusinessId}/${fileName}`, fileToUpload);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      const { data: { publicUrl } } = supabase.storage
        .from('customer_media')
        .getPublicUrl(uploadData.path);

      setFileUrl(publicUrl);
      setUploading(false);
      setUploadProgress(100);

      // Classify document
      setClassifying(true);
      const { data: classificationData, error: classifyError } = await supabase.functions.invoke(
        'onebill-classify-document',
        {
          body: {
            fileUrl: publicUrl,
            fileName: fileToUpload.name,
            businessId: currentBusinessId,
          },
        }
      );

      if (classifyError) throw classifyError;

      // Format phone number
      if (classificationData.fields.phone) {
        classificationData.fields.phone = formatIrishPhone(classificationData.fields.phone);
      }

      setClassification(classificationData);
      setEditedFields(classificationData.fields);
      toast.success(`Document classified as ${classificationData.classification}`);
    } catch (error: any) {
      console.error('Upload/classification error:', error);
      toast.error(error.message || 'Failed to process document');
    } finally {
      setUploading(false);
      setClassifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!classification || !currentBusinessId || !user) return;

    try {
      setSubmitting(true);

      // Create submission record
      const { data: submission, error: insertError } = await supabase
        .from('onebill_submissions')
        .insert({
          business_id: currentBusinessId,
          file_url: fileUrl,
          file_name: file?.name || 'unknown',
          file_size: file?.size || 0,
          document_type: classification.classification,
          classification_confidence: classification.confidence,
          extracted_fields: editedFields,
          phone: editedFields.phone,
          mprn: editedFields.mprn,
          gprn: editedFields.gprn,
          mcc_type: editedFields.mcc_type,
          dg_type: editedFields.dg_type,
          url: editedFields.url || fileUrl,
          onebill_endpoint: `https://api.onebill.ie/api/${classification.classification}-file`,
          submission_status: 'pending',
          submitted_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Submit to OneBill
      const { data: submitData, error: submitError } = await supabase.functions.invoke(
        'onebill-submit',
        {
          body: {
            submissionId: submission.id,
            businessId: currentBusinessId,
            documentType: classification.classification,
            fields: editedFields,
            fileUrl,
            fileName: file?.name,
          },
        }
      );

      if (submitError) throw submitError;

      if (submitData.success) {
        toast.success('Document submitted to OneBill successfully!');
        // Reset form
        setFile(null);
        setClassification(null);
        setEditedFields({});
        setFileUrl('');
        setUploadProgress(0);
      } else {
        toast.error(submitData.message || 'Submission failed');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit document');
    } finally {
      setSubmitting(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return <Badge variant="default" className="bg-green-500">High Confidence</Badge>;
    if (confidence >= 0.7) return <Badge variant="secondary">Medium Confidence</Badge>;
    return <Badge variant="destructive">Low Confidence</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      {!classification && (
        <Card className="p-8">
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) handleFileChange(droppedFile);
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            {uploading || classifying ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-lg font-medium">
                  {uploading ? 'Uploading...' : 'Analyzing document...'}
                </p>
                {uploading && <Progress value={uploadProgress} className="w-full" />}
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Upload Utility Document</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop or click to select a meter reading, electricity bill, or gas bill
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm">
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported: JPG, PNG, HEIC, PDF (max 25MB)
                </p>
              </>
            )}
          </div>
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.heic,.pdf"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) handleFileChange(selectedFile);
            }}
          />
        </Card>
      )}

      {/* Classification Result */}
      {classification && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold capitalize">
                  {classification.classification} Document
                </h3>
                <p className="text-sm text-muted-foreground">
                  {file?.name}
                </p>
              </div>
            </div>
            {getConfidenceBadge(classification.confidence)}
          </div>

          {/* Extracted Fields */}
          <div className="space-y-4">
            <h4 className="font-medium">Extracted Information</h4>
            
            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                Phone Number
                {classification.low_confidence_fields.includes('phone') && (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
              </Label>
              <Input
                id="phone"
                value={editedFields.phone || ''}
                onChange={(e) => setEditedFields({ ...editedFields, phone: formatIrishPhone(e.target.value) })}
                placeholder="+353 8X XXX XXXX"
              />
            </div>

            {/* Electricity-specific fields */}
            {classification.classification === 'electricity' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="mprn">MPRN (11 digits)</Label>
                  <Input
                    id="mprn"
                    value={editedFields.mprn || ''}
                    onChange={(e) => setEditedFields({ ...editedFields, mprn: e.target.value })}
                    placeholder="10012345678"
                    maxLength={11}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mcc_type">MCC Type</Label>
                  <Select
                    value={editedFields.mcc_type || ''}
                    onValueChange={(value) => setEditedFields({ ...editedFields, mcc_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select MCC type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Domestic">Domestic</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dg_type">DG Type</Label>
                  <Select
                    value={editedFields.dg_type || ''}
                    onValueChange={(value) => setEditedFields({ ...editedFields, dg_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select DG type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Urban">Urban</SelectItem>
                      <SelectItem value="Rural">Rural</SelectItem>
                      <SelectItem value="Night Saver">Night Saver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Gas-specific fields */}
            {classification.classification === 'gas' && (
              <div className="grid gap-2">
                <Label htmlFor="gprn">GPRN</Label>
                <Input
                  id="gprn"
                  value={editedFields.gprn || ''}
                  onChange={(e) => setEditedFields({ ...editedFields, gprn: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
            )}

            {/* Meter-specific fields */}
            {classification.classification === 'meter' && (
              <div className="grid gap-2">
                <Label htmlFor="url">Source URL (optional)</Label>
                <Input
                  id="url"
                  value={editedFields.url || fileUrl}
                  onChange={(e) => setEditedFields({ ...editedFields, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setClassification(null);
                setEditedFields({});
                setFileUrl('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit to OneBill
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
