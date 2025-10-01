import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface TemplateFormData {
  name: string;
  category: string;
  language: string;
  header_type?: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  buttons: Array<{ type: string; text: string; }>;
}

export const WhatsAppTemplateManagement = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttons, setButtons] = useState<Array<{ type: string; text: string; }>>([]);
  
  const { register, handleSubmit, reset, watch, setValue } = useForm<TemplateFormData>({
    defaultValues: {
      category: "MARKETING",
      language: "en",
      header_type: "TEXT",
    }
  });

  const addButton = () => {
    setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: string, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  const onSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true);
    try {
      const components = [];

      // Add header component if provided
      if (data.header_text && data.header_type) {
        components.push({
          type: "HEADER",
          format: data.header_type,
          text: data.header_text,
        });
      }

      // Add body component (required)
      components.push({
        type: "BODY",
        text: data.body_text,
      });

      // Add footer component if provided
      if (data.footer_text) {
        components.push({
          type: "FOOTER",
          text: data.footer_text,
        });
      }

      // Add buttons component if any buttons exist
      if (buttons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: buttons,
        });
      }

      const { error } = await supabase.functions.invoke("whatsapp-submit-template", {
        body: {
          name: data.name,
          category: data.category,
          language: data.language,
          components,
        },
      });

      if (error) throw error;

      toast.success("Template submitted to Meta for approval");
      reset();
      setButtons([]);
    } catch (error: any) {
      console.error("Error submitting template:", error);
      toast.error(error.message || "Failed to submit template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Message Templates</CardTitle>
        <CardDescription>
          Create and submit new WhatsApp message templates to Meta for approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                {...register("name", { required: true })}
                placeholder="welcome_message"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => setValue("category", value)} defaultValue="MARKETING">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select onValueChange={(value) => setValue("language", value)} defaultValue="en">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="header_type">Header Type (Optional)</Label>
              <Select onValueChange={(value) => setValue("header_type", value)} defaultValue="TEXT">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="header_text">Header Text (Optional)</Label>
            <Input
              id="header_text"
              {...register("header_text")}
              placeholder="Welcome to our service!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body_text">Body Text (Required)</Label>
            <Textarea
              id="body_text"
              {...register("body_text", { required: true })}
              placeholder="Hello {{1}}, thank you for contacting us..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Use {"{{1}}"}, {"{{2}}"} for variables
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_text">Footer Text (Optional)</Label>
            <Input
              id="footer_text"
              {...register("footer_text")}
              placeholder="Reply STOP to unsubscribe"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Buttons (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addButton}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Button
              </Button>
            </div>
            
            {buttons.map((button, index) => (
              <div key={index} className="flex gap-2">
                <Select
                  value={button.type}
                  onValueChange={(value) => updateButton(index, "type", value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                    <SelectItem value="URL">URL</SelectItem>
                    <SelectItem value="PHONE_NUMBER">Phone</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={button.text}
                  onChange={(e) => updateButton(index, "text", e.target.value)}
                  placeholder="Button text"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeButton(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit to Meta for Approval
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
