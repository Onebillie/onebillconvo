import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Mail, Send, Calendar as CalendarIcon, Users, Filter, Clock, Save, 
  PlayCircle, AlertCircle, Sparkles, TestTube, Eye, FileDown, Upload
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImprovedCampaignBuilderProps {
  open: boolean;
  onClose: () => void;
  editCampaign?: any;
}

export function ImprovedCampaignBuilder({ open, onClose, editCampaign }: ImprovedCampaignBuilderProps) {
  const queryClient = useQueryClient();
  const { currentBusinessId } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [description, setDescription] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Segmentation
  const [segmentFilters, setSegmentFilters] = useState<any>({
    statuses: [],
    tags: [],
    lastContactedDays: null,
  });
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  
  // Scheduling
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  
  // Account selection
  const [selectedSenderAccount, setSelectedSenderAccount] = useState<string>("");
  
  // Save settings
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [templateName, setTemplateName] = useState("");

  // Load existing campaign data
  useEffect(() => {
    if (editCampaign) {
      setCampaignName(editCampaign.name || "");
      setDescription(editCampaign.description || "");
      setEmailSubject(editCampaign.email_subject || "");
      setEmailContent(editCampaign.email_content || "");
      setSegmentFilters(editCampaign.recipient_filter || {});
      setSelectedSenderAccount(editCampaign.sender_email_account_id || "");
      if (editCampaign.scheduled_at) {
        setSendNow(false);
        setScheduledDate(new Date(editCampaign.scheduled_at));
        setScheduledTime(format(new Date(editCampaign.scheduled_at), "HH:mm"));
      }
    }
  }, [editCampaign]);

  // Fetch email accounts
  const { data: emailAccounts = [] } = useQuery({
    queryKey: ['email-accounts', currentBusinessId],
    queryFn: async () => {
      if (!currentBusinessId) return [];

      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('business_id', currentBusinessId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentBusinessId,
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates', currentBusinessId],
    queryFn: async () => {
      if (!currentBusinessId) return [];

      const { data, error } = await supabase
        .from('marketing_email_templates')
        .select('*')
        .eq('business_id', currentBusinessId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentBusinessId,
  });

  // Fetch statuses for filtering
  const { data: statuses = [] } = useQuery({
    queryKey: ['status-tags', currentBusinessId],
    queryFn: async () => {
      if (!currentBusinessId) return [];

      const { data, error } = await supabase
        .from('conversation_status_tags')
        .select('id, name')
        .eq('business_id', currentBusinessId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentBusinessId,
  });

  // Estimate recipients based on filters
  useEffect(() => {
    const estimateRecipients = async () => {
      if (!currentBusinessId) return;

      try {
        let query = supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', currentBusinessId)
          .eq('is_unsubscribed', false);

        // Apply filters here if needed

        const { count } = await query;
        setEstimatedRecipients(count || 0);
      } catch (error) {
        console.error('Error estimating recipients:', error);
      }
    };

    estimateRecipients();
  }, [segmentFilters, currentBusinessId]);

  // Send test email
  const sendTestEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user?.id)
        .single();

      if (!profile?.email) {
        toast.error('No email address found for your profile');
        return;
      }

      if (!emailSubject || !emailContent) {
        toast.error('Please enter subject and content first');
        return;
      }

      setLoading(true);
      const { error } = await supabase.functions.invoke('send-test-email', {
        body: {
          toEmail: profile.email,
          subject: emailSubject,
          htmlContent: emailContent,
          senderAccountId: selectedSenderAccount || null,
        }
      });

      if (error) throw error;

      toast.success(`Test email sent to ${profile.email}`);
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  // Load template
  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEmailSubject(template.subject);
      setEmailContent(template.html_content);
      setSelectedTemplate(templateId);
      toast.success('Template loaded');
    }
  };

  // Save campaign
  const saveCampaignMutation = useMutation({
    mutationFn: async (status: 'draft' | 'scheduled' | 'sending') => {
      if (!currentBusinessId) {
        throw new Error('No business selected');
      }
      if (!campaignName.trim()) {
        throw new Error('Campaign name is required');
      }
      if (!emailSubject.trim() || !emailContent.trim()) {
        throw new Error('Email subject and content are required');
      }
      if (!selectedSenderAccount) {
        throw new Error('Please select a sender email account');
      }

      const campaignData: any = {
        business_id: currentBusinessId,
        name: campaignName,
        description: description,
        type: 'marketing',
        channels: ['email'],
        email_subject: emailSubject,
        email_content: emailContent,
        recipient_filter: segmentFilters,
        sender_email_account_id: selectedSenderAccount,
        save_as_template: saveAsTemplate,
        status: status,
      };

      if (!sendNow && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':');
        const scheduleDateTime = new Date(scheduledDate);
        scheduleDateTime.setHours(parseInt(hours), parseInt(minutes));
        campaignData.scheduled_at = scheduleDateTime.toISOString();
      }

      let result;
      if (editCampaign) {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .update(campaignData)
          .eq('id', editCampaign.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .insert(campaignData)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      // Save as template if enabled
      if (saveAsTemplate && result && currentBusinessId) {
        const templateData = {
          business_id: currentBusinessId,
          name: templateName || campaignName,
          subject: emailSubject,
          html_content: emailContent,
          category: 'campaign',
        };

        await supabase
          .from('marketing_email_templates')
          .insert(templateData);
      }

      // Execute campaign if sending now
      if (status === 'sending') {
        await supabase.functions.invoke('execute-marketing-campaign', {
          body: { campaignId: result.id }
        });
      }

      return result;
    },
    onSuccess: (data, status) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      
      if (status === 'sending') {
        toast.success('Campaign is being sent!');
      } else if (status === 'scheduled') {
        toast.success('Campaign scheduled successfully');
      } else {
        toast.success('Campaign saved as draft');
      }
      
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save campaign');
    }
  });

  const handleSave = (status: 'draft' | 'scheduled' | 'sending') => {
    saveCampaignMutation.mutate(status);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {editCampaign ? 'Edit Campaign' : 'Create Email Campaign'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Step 1: Email Creation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <CardTitle>1. Create Your Email</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name *</Label>
                    <Input
                      id="campaign-name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g., Summer Sale 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-account">Sender Account *</Label>
                    <Select value={selectedSenderAccount} onValueChange={setSelectedSenderAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select email account" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.email_address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this campaign"
                  />
                </div>

                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Load from Template</Label>
                    <Select value={selectedTemplate || ""} onValueChange={loadTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="email-subject">Email Subject *</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Your compelling subject line"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-content">Email Content (HTML) *</Label>
                  <Textarea
                    id="email-content"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use merge tags: {'{'}{'{'} first_name {'}'}{'}'},  {'{'}{'{'} last_name {'}'}{'}'},  {'{'}{'{'} email {'}'}{'}'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={sendTestEmail} variant="outline" disabled={loading}>
                    <TestTube className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Audience Segmentation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <CardTitle>2. Select Your Audience</CardTitle>
                </div>
                <CardDescription>
                  Estimated recipients: <Badge>{estimatedRecipients}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Filter by Status (Optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((status: any) => {
                      const isSelected = segmentFilters.statuses?.includes(status.id);
                      return (
                        <Badge
                          key={status.id}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const current = segmentFilters.statuses || [];
                            setSegmentFilters({
                              ...segmentFilters,
                              statuses: isSelected
                                ? current.filter((id: string) => id !== status.id)
                                : [...current, status.id]
                            });
                          }}
                        >
                          {status.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last-contacted">Last Contacted (Days ago)</Label>
                  <Input
                    id="last-contacted"
                    type="number"
                    value={segmentFilters.lastContactedDays || ""}
                    onChange={(e) => setSegmentFilters({
                      ...segmentFilters,
                      lastContactedDays: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="e.g., 30"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Schedule */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle>3. Schedule Delivery</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="send-now"
                    checked={sendNow}
                    onCheckedChange={setSendNow}
                  />
                  <Label htmlFor="send-now">Send immediately</Label>
                </div>

                {!sendNow && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-time">Select Time</Label>
                      <Input
                        id="scheduled-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 4: Save Options */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  <CardTitle>4. Save Options</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="save-template"
                    checked={saveAsTemplate}
                    onCheckedChange={setSaveAsTemplate}
                  />
                  <Label htmlFor="save-template">Save this email as a template</Label>
                </div>

                {saveAsTemplate && (
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder={campaignName || "Enter template name"}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={saveCampaignMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            {!sendNow && (
              <Button
                onClick={() => handleSave('scheduled')}
                disabled={saveCampaignMutation.isPending || !scheduledDate}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            )}
            {sendNow && (
              <Button
                onClick={() => handleSave('sending')}
                disabled={saveCampaignMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}