import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface WidgetMessagesEditorProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export const WidgetMessagesEditor = ({
  config,
  onConfigChange,
}: WidgetMessagesEditorProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Configure Messages</h3>
        <p className="text-sm text-muted-foreground">
          Customize the messages your visitors will see
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="greeting_message">Greeting Message</Label>
          <Input
            id="greeting_message"
            value={config.greeting_message}
            onChange={(e) =>
              onConfigChange({ ...config, greeting_message: e.target.value })
            }
            placeholder="Hi! How can we help?"
          />
          <p className="text-xs text-muted-foreground">
            The first message visitors see when they open the chat
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcome_message">Welcome Message</Label>
          <Textarea
            id="welcome_message"
            value={config.welcome_message}
            onChange={(e) =>
              onConfigChange({ ...config, welcome_message: e.target.value })
            }
            placeholder="Welcome! Send us a message."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Additional welcome text shown after the greeting
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="offline_message">Offline Message (Optional)</Label>
          <Textarea
            id="offline_message"
            value={config.offline_message || ''}
            onChange={(e) =>
              onConfigChange({ ...config, offline_message: e.target.value })
            }
            placeholder="We're currently offline. Leave us a message and we'll get back to you."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Message shown when your team is offline
          </p>
        </div>
      </div>
    </div>
  );
};
