import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, Smartphone, Tablet, X, Send } from "lucide-react";
import { getIconById } from "@/lib/widgetIcons";

interface WidgetConfig {
  widget_type?: string;
  widget_shape?: string;
  icon_type: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  widget_size: string;
  widget_position: string;
  button_text: string;
  show_button_text: boolean;
  greeting_message: string;
  welcome_message?: string;
}

interface WidgetLivePreviewProps {
  config: WidgetConfig;
}

export const WidgetLivePreview = ({ config }: WidgetLivePreviewProps) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isOpen, setIsOpen] = useState(false);

  const sizeMap = {
    small: '48px',
    medium: '60px',
    large: '80px',
  };

  const shapeMap = {
    circle: '50%',
    square: '12px',
    rounded: '24px',
  };

  const widgetSize = sizeMap[config.widget_size as keyof typeof sizeMap] || '60px';
  const borderRadius = shapeMap[(config.widget_shape || 'circle') as keyof typeof shapeMap] || '50%';
  const icon = getIconById(config.icon_type);
  const IconComponent = icon?.Icon;

  const getPositionStyles = () => {
    const base = { position: 'absolute' as const };
    switch (config.widget_position) {
      case 'bottom-right':
        return { ...base, bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { ...base, bottom: '20px', left: '20px' };
      case 'bottom-center':
        return { ...base, bottom: '20px', left: '50%', transform: 'translateX(-50%)' };
      case 'top-right':
        return { ...base, top: '20px', right: '20px' };
      case 'top-left':
        return { ...base, top: '20px', left: '20px' };
      case 'top-center':
        return { ...base, top: '20px', left: '50%', transform: 'translateX(-50%)' };
      default:
        return { ...base, bottom: '20px', right: '20px' };
    }
  };

  const deviceDimensions = {
    desktop: { width: '100%', height: '600px' },
    tablet: { width: '768px', height: '600px' },
    mobile: { width: '375px', height: '600px' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Live Preview</h3>
          <p className="text-sm text-muted-foreground">
            See how your widget will look
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={device === 'desktop' ? 'default' : 'outline'}
            onClick={() => setDevice('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={device === 'tablet' ? 'default' : 'outline'}
            onClick={() => setDevice('tablet')}
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={device === 'mobile' ? 'default' : 'outline'}
            onClick={() => setDevice('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex justify-center bg-muted/30 p-4">
            <div
              className="bg-background border rounded-lg shadow-lg overflow-hidden relative"
              style={{
                width: deviceDimensions[device].width,
                height: deviceDimensions[device].height,
                maxWidth: '100%',
              }}
            >
              {/* Simulated Website Background */}
              <div className="h-full bg-gradient-to-br from-muted/20 to-muted/40 p-8">
                <div className="space-y-4">
                  <div className="h-8 w-48 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-5/6 bg-muted rounded" />
                </div>

                {/* Widget Button */}
                <button
                  style={{
                    ...getPositionStyles(),
                    backgroundColor: config.primary_color,
                    color: config.text_color,
                    width: config.show_button_text ? 'auto' : widgetSize,
                    minWidth: widgetSize,
                    height: widgetSize,
                    borderRadius: borderRadius,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: config.show_button_text ? '0 20px' : '0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => setIsOpen(!isOpen)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = config.secondary_color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = config.primary_color;
                  }}
                >
                  {IconComponent && <IconComponent size={24} />}
                  {config.show_button_text && (
                    <span className="font-medium whitespace-nowrap">
                      {config.button_text}
                    </span>
                  )}
                </button>

                {/* Chat Window */}
                {isOpen && (
                  <div
                    style={{
                      ...getPositionStyles(),
                      width: device === 'mobile' ? 'calc(100% - 40px)' : '380px',
                      height: '500px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      bottom: config.widget_position.includes('bottom')
                        ? `calc(${widgetSize} + 30px)`
                        : undefined,
                      top: config.widget_position.includes('top')
                        ? `calc(${widgetSize} + 30px)`
                        : undefined,
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        backgroundColor: config.primary_color,
                        color: config.text_color,
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTopLeftRadius: '12px',
                        borderTopRightRadius: '12px',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {IconComponent && <IconComponent size={20} />}
                        <span className="font-semibold">Chat with us</span>
                      </div>
                      <button
                        onClick={() => setIsOpen(false)}
                        style={{ color: config.text_color }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-muted/5">
                      <div className="space-y-3">
                        <div
                          className="p-3 rounded-lg max-w-[80%]"
                          style={{
                            backgroundColor: config.primary_color,
                            color: config.text_color,
                          }}
                        >
                          {config.greeting_message}
                        </div>
                        {config.welcome_message && (
                          <div
                            className="p-3 rounded-lg max-w-[80%]"
                            style={{
                              backgroundColor: config.primary_color,
                              color: config.text_color,
                            }}
                          >
                            {config.welcome_message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          disabled
                        />
                        <button
                          style={{
                            backgroundColor: config.primary_color,
                            color: config.text_color,
                          }}
                          className="p-2 rounded-lg"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
