import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, Code } from "lucide-react";
import { WidgetTemplateGallery } from "./WidgetTemplateGallery";
import { WidgetAppearanceEditor } from "./WidgetAppearanceEditor";
import { WidgetMessagesEditor } from "./WidgetMessagesEditor";
import { WidgetBehaviorSettings } from "./WidgetBehaviorSettings";
import { WidgetLivePreview } from "./WidgetLivePreview";
import { WidgetCodeDisplay } from "./WidgetCodeDisplay";
import { WidgetPreset, getPresetById } from "@/lib/widgetPresets";
import { Progress } from "@/components/ui/progress";

interface EmbedWidgetWizardProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  embedTokenId: string;
  existingConfig?: any;
  onSave: () => void;
}

export const EmbedWidgetWizard = ({
  open,
  onClose,
  businessId,
  embedTokenId,
  existingConfig,
  onSave,
}: EmbedWidgetWizardProps) => {
  const [step, setStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [config, setConfig] = useState({
    widget_type: 'bubble',
    icon_type: 'chat',
    primary_color: '#6366f1',
    secondary_color: '#4f46e5',
    text_color: '#ffffff',
    widget_size: 'medium',
    widget_position: 'bottom-right',
    button_text: 'Chat with us',
    show_button_text: false,
    greeting_message: 'Hi! How can we help?',
    welcome_message: 'Welcome! Send us a message.',
    offline_message: '',
    show_unread_badge: true,
    auto_open_delay: null,
    sound_notifications: false,
    custom_css: '',
  });
  const [saving, setSaving] = useState(false);

  const totalSteps = 6;

  useEffect(() => {
    if (existingConfig) {
      setConfig(existingConfig);
      setStep(2); // Skip template selection if editing
    }
  }, [existingConfig]);

  const handlePresetSelect = (preset: WidgetPreset) => {
    setSelectedPreset(preset.id);
    setConfig({
      ...config,
      ...preset.config,
    });
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('widget_customization')
        .upsert({
          business_id: businessId,
          embed_token_id: embedTokenId,
          ...config,
        }, {
          onConflict: 'business_id,embed_token_id'
        });

      if (error) throw error;

      toast.success('Widget customization saved!');
      onSave();
      setStep(6); // Go to code display step instead of closing
    } catch (error: any) {
      console.error('Error saving widget customization:', error);
      toast.error('Failed to save widget customization');
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <WidgetTemplateGallery
            selectedPreset={selectedPreset}
            onSelectPreset={handlePresetSelect}
          />
        );
      case 2:
        return (
          <WidgetAppearanceEditor
            config={config}
            onConfigChange={setConfig}
          />
        );
      case 3:
        return (
          <WidgetMessagesEditor
            config={config}
            onConfigChange={setConfig}
          />
        );
      case 4:
        return (
          <WidgetBehaviorSettings
            config={config}
            onConfigChange={setConfig}
          />
        );
      case 5:
        return <WidgetLivePreview config={config} />;
      case 6:
        return (
          <WidgetCodeDisplay
            businessId={businessId}
            embedTokenId={embedTokenId}
            siteId={embedTokenId}
            config={config}
          />
        );
      default:
        return null;
    }
  };

  const stepTitles = [
    'Choose Template',
    'Customize Appearance',
    'Configure Messages',
    'Behavior Settings',
    'Preview & Finish',
    'Get Your Code',
  ];

  const canProceed = step === 1 ? selectedPreset !== null : true;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Widget Customization Wizard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Step {step} of {totalSteps}: {stepTitles[step - 1]}
              </span>
              <span className="text-muted-foreground">
                {Math.round((step / totalSteps) * 100)}%
              </span>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">{renderStepContent()}</div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex gap-2">
              {step < 5 ? (
                <Button onClick={handleNext} disabled={!canProceed}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : step === 5 ? (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save & Continue
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={onClose}>
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
