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
import { ArrowLeft, ArrowRight, Send, Save } from "lucide-react";

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
}

export function CampaignWizard({ open, onClose }: CampaignWizardProps) {
  const [step, setStep] = useState(1);
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
      statusTags: [],
      excludeUnsubscribed: true
    }
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
          created_by: user.id
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Campaign Setup'}
            {step === 2 && 'Select Recipients'}
            {step === 3 && 'Create Content'}
            {step === 4 && 'Review & Send'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                <Label>Channels *</Label>
                <div className="space-y-2 mt-2">
                  {['whatsapp', 'email', 'sms', 'facebook', 'instagram'].map(channel => (
                    <div key={channel} className="flex items-center space-x-2">
                      <Checkbox
                        id={channel}
                        checked={formData.channels.includes(channel)}
                        onCheckedChange={() => handleChannelToggle(channel)}
                      />
                      <Label htmlFor={channel} className="font-normal cursor-pointer capitalize">
                        {channel}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAll"
                  checked={formData.recipient_filter.includeAll}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      recipient_filter: { ...prev.recipient_filter, includeAll: !!checked }
                    }))
                  }
                />
                <Label htmlFor="includeAll" className="font-normal">
                  Send to all customers
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="excludeUnsubscribed"
                  checked={formData.recipient_filter.excludeUnsubscribed}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      recipient_filter: { ...prev.recipient_filter, excludeUnsubscribed: !!checked }
                    }))
                  }
                />
                <Label htmlFor="excludeUnsubscribed" className="font-normal">
                  Exclude unsubscribed customers
                </Label>
              </div>

              <p className="text-sm text-muted-foreground">
                Advanced filtering options will be available soon.
              </p>
            </div>
          )}

          {/* Step 3: Content */}
          {step === 3 && (
            <div className="space-y-4">
              {formData.channels.includes('email') && (
                <div className="space-y-2">
                  <Label>Email Content</Label>
                  <Input
                    placeholder="Email Subject"
                    value={formData.email_subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, email_subject: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Email body... Use {{customer_name}} for personalization"
                    value={formData.email_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, email_content: e.target.value }))}
                    rows={6}
                  />
                </div>
              )}

              {formData.channels.includes('sms') && (
                <div className="space-y-2">
                  <Label>SMS Content</Label>
                  <Textarea
                    placeholder="SMS message... Use {{customer_name}} for personalization"
                    value={formData.sms_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, sms_content: e.target.value }))}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.sms_content.length} characters
                  </p>
                </div>
              )}

              {formData.channels.includes('whatsapp') && (
                <div className="space-y-2">
                  <Label>WhatsApp Template ID</Label>
                  <Input
                    placeholder="Enter approved template ID"
                    value={formData.whatsapp_template_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_template_id: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only approved WhatsApp templates can be used for marketing messages.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold">{formData.name}</h3>
                <p className="text-sm text-muted-foreground">{formData.description}</p>
                <div className="flex gap-2">
                  {formData.channels.map(channel => (
                    <span key={channel} className="text-xs px-2 py-1 bg-secondary rounded capitalize">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Review your campaign and click "Send Now" to start immediately, or "Save Draft" to send later.
              </p>
            </div>
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
