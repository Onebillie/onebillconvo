import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, Circle, Square, Check, Plus, X } from "lucide-react";
import { useState } from "react";

interface WidgetAppearanceEditorProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export const WidgetAppearanceEditor = ({
  config,
  onConfigChange,
}: WidgetAppearanceEditorProps) => {
  const [newStarter, setNewStarter] = useState("");
  const conversationStarters = config.conversation_starters || [];

  const addStarter = () => {
    if (newStarter.trim()) {
      onConfigChange({
        ...config,
        conversation_starters: [...conversationStarters, { text: newStarter.trim() }]
      });
      setNewStarter("");
    }
  };

  const removeStarter = (index: number) => {
    onConfigChange({
      ...config,
      conversation_starters: conversationStarters.filter((_: any, i: number) => i !== index)
    });
  };

  const iconShapes = [
    { id: 'circle', label: 'Circle' },
    { id: 'square', label: 'Square' },
    { id: 'rounded', label: 'Rounded' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Widget Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure the essential settings for your chat widget
        </p>
      </div>

      {/* Icon Shape */}
      <div className="space-y-3">
        <Label>Widget Shape</Label>
        <div className="grid grid-cols-3 gap-3">
          {iconShapes.map((shape) => (
            <Card
              key={shape.id}
              className={`cursor-pointer transition-all ${
                config.widget_shape === shape.id
                  ? "ring-2 ring-primary"
                  : "hover:ring-1 hover:ring-primary/50"
              }`}
              onClick={() =>
                onConfigChange({ ...config, widget_shape: shape.id })
              }
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div
                  className={`w-16 h-16 flex items-center justify-center ${
                    shape.id === 'circle' ? 'rounded-full' : 
                    shape.id === 'square' ? 'rounded-none' : 
                    'rounded-2xl'
                  }`}
                  style={{ backgroundColor: config.primary_color }}
                >
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-medium">{shape.label}</span>
                {config.widget_shape === shape.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Widget Color */}
      <div className="space-y-3">
        <Label htmlFor="primary_color">Widget Color</Label>
        <div className="flex gap-2">
          <Input
            id="primary_color"
            type="color"
            value={config.primary_color}
            onChange={(e) =>
              onConfigChange({ ...config, primary_color: e.target.value })
            }
            className="w-20 h-10 cursor-pointer"
          />
          <Input
            type="text"
            value={config.primary_color}
            onChange={(e) =>
              onConfigChange({ ...config, primary_color: e.target.value })
            }
            className="flex-1"
            placeholder="#6366f1"
          />
        </div>
      </div>

      {/* Welcome Message (Pre-Chat) */}
      <div className="space-y-3">
        <Label htmlFor="welcome_message">Welcome Message (Pre-Chat)</Label>
        <Textarea
          id="welcome_message"
          value={config.welcome_message}
          onChange={(e) =>
            onConfigChange({ ...config, welcome_message: e.target.value })
          }
          placeholder="Welcome! Please fill in your details to start chatting."
          rows={2}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Shown in the widget before the user fills in contact form
        </p>
      </div>

      {/* Greeting Message (Post-Auth) */}
      <div className="space-y-3">
        <Label htmlFor="greeting_message">Greeting Message (Post-Auth) *</Label>
        <Textarea
          id="greeting_message"
          value={config.greeting_message || config.welcome_message}
          onChange={(e) =>
            onConfigChange({ ...config, greeting_message: e.target.value })
          }
          placeholder="Hi! How can we help you today?"
          rows={2}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          First message shown to user after they authenticate
        </p>
      </div>

      {/* Conversation Starters */}
      <div className="space-y-3">
        <Label>Conversation Starters (Quick Replies)</Label>
        <div className="space-y-2">
          {conversationStarters.map((starter: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={starter.text}
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStarter(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newStarter}
              onChange={(e) => setNewStarter(e.target.value)}
              placeholder="e.g., Track my order"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStarter())}
            />
            <Button type="button" onClick={addStarter} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Quick reply buttons shown below the greeting message
        </p>
      </div>

      {/* Mandatory Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Require Name & Email</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Ask visitors for their details before chatting
            </p>
          </div>
          <Switch
            checked={config.require_contact_info || false}
            onCheckedChange={(checked) =>
              onConfigChange({ ...config, require_contact_info: checked })
            }
          />
        </div>
      </div>

      {/* Notification Sound */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Notification Sound</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Play sound when new messages arrive
            </p>
          </div>
          <Switch
            checked={config.sound_notifications || false}
            onCheckedChange={(checked) =>
              onConfigChange({ ...config, sound_notifications: checked })
            }
          />
        </div>
      </div>

      {/* Default State */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Start Minimized</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Widget appears as a button by default
            </p>
          </div>
          <Switch
            checked={config.start_minimized !== false}
            onCheckedChange={(checked) =>
              onConfigChange({ ...config, start_minimized: checked })
            }
          />
        </div>
      </div>
    </div>
  );
};
