import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Send, Save, FileText, Sparkles } from "lucide-react";
import { RichContentEditor } from "./RichContentEditor";
import { TemplateLibrary } from "./TemplateLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AudienceSelector } from "./AudienceSelector";
import { CampaignPreview } from "./CampaignPreview";

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
}

export function CampaignWizard({ open, onClose }: CampaignWizardProps) {
  const [step, setStep] = useState(1);
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'broadcast' as 'broadcast' | 'drip' | 'newsletter',
    channels: [] as string[],
    whatsapp_template_id: '',
    whatsapp_variables: {},
    email_subject: '',
    email_content: '',
    sms_content: '',
    recipient_filter: {
      includeAll: true,
      statusTags: [] as string[],
      excludeUnsubscribed: true,
      lastContactedDays: null as number | null,
      customerType: 'all' as 'all' | 'lead' | 'customer'
    },
    template_id: null as string | null
  });

  const handleChannelToggle = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const handleSave = async (sendNow: boolean = false) => {
    if (!formData.name) {
      toast.error('Please enter a campaign name');
      return;
    }

    if (formData.channels.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }

    // Validate content for selected channels
    if (formData.channels.includes('email') && !formData.email_content) {
      toast.error('Please add email content');
      return;
    }
    if (formData.channels.includes('sms') && !formData.sms_content) {
      toast.error('Please add SMS content');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      const { data: campaign, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          channels: formData.channels,
          business_id: businessUser!.business_id,
          whatsapp_template_id: formData.whatsapp_template_id,
          whatsapp_variables: formData.whatsapp_variables,
          email_subject: formData.email_subject,
          email_content: formData.email_content,
          sms_content: formData.sms_content,
          recipient_filter: formData.recipient_filter,
          status: sendNow ? 'sending' : 'draft',
          created_by: user.id,
          template_id: formData.template_id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Campaign ${sendNow ? 'started' : 'saved'} successfully`);

      // Execute campaign if sending now
      if (sendNow && campaign) {
        supabase.functions.invoke('execute-marketing-campaign', {
          body: { campaign_id: campaign.id }
        });
      }

      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      onClose();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      toast.error(error.message || 'Failed to save campaign');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 && <><Sparkles className="w-5 h-5" />Campaign Setup</>}
            {step === 2 && 'Select Recipients'}
            {step === 3 && 'Create Content'}
            {step === 4 && 'Review & Send'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            ))}
          </div>

          {/* Step 1: Campaign Setup */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Black Friday Sale 2025"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this campaign"
                  rows={3}
                />
              </div>

              <div>
                <Label>Campaign Type</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="broadcast" id="broadcast" />
                    <Label htmlFor="broadcast" className="font-normal cursor-pointer">
                      Broadcast - One-time message
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="newsletter" id="newsletter" />
                    <Label htmlFor="newsletter" className="font-normal cursor-pointer">
                      Newsletter - Regular updates
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Channels * (Select at least one)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {['email', 'sms', 'whatsapp'].map(channel => (
                    <Card 
                      key={channel}
                      className={`cursor-pointer transition-all ${
                        formData.channels.includes(channel) 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleChannelToggle(channel)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <Checkbox
                          checked={formData.channels.includes(channel)}
                          onCheckedChange={() => handleChannelToggle(channel)}
                        />
                        <span className="capitalize font-medium">{channel}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 2 && (
            <AudienceSelector
              recipientFilter={formData.recipient_filter}
              onChange={(filter) => setFormData(prev => ({ ...prev, recipient_filter: filter }))}
            />
          )}

          {/* Step 3: Content */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Create Campaign Content</h3>
                  <p className="text-sm text-muted-foreground">
                    Use merge tags like {'{{first_name}}'} for personalization
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {showTemplates ? 'Hide Templates' : 'Use Template'}
                </Button>
              </div>

              {showTemplates ? (
                <TemplateLibrary
                  onSelectTemplate={(template) => {
                    setFormData({
                      ...formData,
                      email_subject: template.email_subject || '',
                      email_content: template.email_content || '',
                      sms_content: template.sms_content || '',
                      template_id: template.id
                    });
                    setShowTemplates(false);
                    toast.success('Template loaded');
                  }}
                  currentContent={{
                    email_subject: formData.email_subject,
                    email_content: formData.email_content,
                    sms_content: formData.sms_content,
                    channels: formData.channels
                  }}
                />
              ) : (
                <Tabs defaultValue={formData.channels[0] || 'email'} className="w-full">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${formData.channels.length}, 1fr)` }}>
                    {formData.channels.includes('email') && (
                      <TabsTrigger value="email">Email</TabsTrigger>
                    )}
                    {formData.channels.includes('sms') && (
                      <TabsTrigger value="sms">SMS</TabsTrigger>
                    )}
                    {formData.channels.includes('whatsapp') && (
                      <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                    )}
                  </TabsList>

                  {formData.channels.includes('email') && (
                    <TabsContent value="email" className="mt-4">
                      <RichContentEditor
                        value={formData.email_content}
                        onChange={(value) => setFormData(prev => ({ ...prev, email_content: value }))}
                        showSubject
                        subject={formData.email_subject}
                        onSubjectChange={(value) => setFormData(prev => ({ ...prev, email_subject: value }))}
                        channel="email"
                        placeholder="Write your email content with {{merge_tags}}..."
                      />
                    </TabsContent>
                  )}

                  {formData.channels.includes('sms') && (
                    <TabsContent value="sms" className="mt-4">
                      <RichContentEditor
                        value={formData.sms_content}
                        onChange={(value) => setFormData(prev => ({ ...prev, sms_content: value }))}
                        channel="sms"
                        placeholder="Write your SMS content (max 160 characters)..."
                      />
                    </TabsContent>
                  )}

                  {formData.channels.includes('whatsapp') && (
                    <TabsContent value="whatsapp" className="mt-4">
                      <div className="space-y-4">
                        <div>
                          <Label>WhatsApp Template ID</Label>
                          <Input
                            placeholder="Enter approved template ID"
                            value={formData.whatsapp_template_id}
                            onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_template_id: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Only approved WhatsApp templates can be used for marketing messages.
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </div>
          )}

          {/* Step 4: Review & Preview */}
          {step === 4 && (
            <CampaignPreview campaign={formData} />
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>

            <div className="flex gap-2">
              {step < 4 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => handleSave(false)}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button onClick={() => handleSave(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Send Now
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
