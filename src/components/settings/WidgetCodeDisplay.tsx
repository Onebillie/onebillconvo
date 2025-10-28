import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface WidgetCodeDisplayProps {
  businessId: string;
  embedTokenId: string;
  siteId: string;
  config: any;
}

export const WidgetCodeDisplay = ({ siteId }: WidgetCodeDisplayProps) => {
  const [copied, setCopied] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState<'widget' | 'responsive' | 'embedded' | 'fullscreen' | 'react'>('widget');

  const embedCode = `<!-- À La Carte Chat Widget -->
<script src="${window.location.origin}/embed-widget.js"></script>
<script>
  AlacarteChatWidget.init({
    siteId: '${siteId}',
    customer: {
      name: 'Customer Name',
      email: 'customer@example.com',
      phone: '+1234567890'
    }
  });
</script>`;

  const responsiveIframeCode = `<!-- Responsive Iframe Embed -->
<div style="width: 100%; max-width: 450px; height: 600px; margin: 0 auto;">
  <iframe 
    id="alacarte-chat-embed"
    src="${window.location.origin}/embed/conversation?token=YOUR_SSO_TOKEN"
    style="width: 100%; height: 100%; border: none; border-radius: 12px;"
    allow="microphone; camera"
  ></iframe>
</div>`;

  const embeddedModeCode = `<!-- Embedded Mode (Full Container) -->
<iframe 
  src="${window.location.origin}/embed/conversation?token=YOUR_SSO_TOKEN"
  style="width: 100%; height: 100%; min-height: 500px; border: none;"
  allow="microphone; camera"
></iframe>`;

  const fullscreenModeCode = `<!-- Fullscreen Mode -->
<iframe 
  src="${window.location.origin}/embed/conversation?token=YOUR_SSO_TOKEN"
  style="position: fixed; inset: 0; width: 100vw; height: 100vh; border: none;"
  allow="microphone; camera"
></iframe>`;

  const reactComponentCode = `// React Component Wrapper
import { useEffect, useRef } from 'react';

function AlacarteChat({ token, sizing = 'responsive' }) {
  const iframeRef = useRef(null);
  
  const styles = {
    responsive: {
      width: '100%',
      height: '600px',
      maxWidth: '450px',
      margin: '0 auto',
    },
    embedded: {
      width: '100%',
      height: '100%',
      minHeight: '500px',
    },
    fullscreen: {
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
    }
  };

  return (
    <div style={styles[sizing]}>
      <iframe
        ref={iframeRef}
        src={\`${window.location.origin}/embed/conversation?token=\${token}\`}
        style={{ width: '100%', height: '100%', border: 'none', borderRadius: sizing === 'responsive' ? '12px' : '0' }}
        allow="microphone; camera"
      />
    </div>
  );
}`;

  const getCurrentCode = () => {
    switch (selectedTab) {
      case 'widget': return embedCode;
      case 'responsive': return responsiveIframeCode;
      case 'embedded': return embeddedModeCode;
      case 'fullscreen': return fullscreenModeCode;
      case 'react': return reactComponentCode;
      default: return embedCode;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentCode());
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Integration Code</h3>
      
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="widget">Widget</TabsTrigger>
          <TabsTrigger value="responsive">Responsive</TabsTrigger>
          <TabsTrigger value="embedded">Embedded</TabsTrigger>
          <TabsTrigger value="fullscreen">Fullscreen</TabsTrigger>
          <TabsTrigger value="react">React</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          <div>
            <Label className="mb-2 block">
              {selectedTab === 'widget' && 'Floating Widget Code'}
              {selectedTab === 'responsive' && 'Responsive Iframe (Recommended)'}
              {selectedTab === 'embedded' && 'Embedded Mode (Full Container)'}
              {selectedTab === 'fullscreen' && 'Fullscreen Mode'}
              {selectedTab === 'react' && 'React Component'}
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              {selectedTab === 'widget' && 'Add this code to any website to show a floating chat button'}
              {selectedTab === 'responsive' && 'Responsive iframe that adapts to container size with max dimensions'}
              {selectedTab === 'embedded' && 'Embed chat directly into a page section or container'}
              {selectedTab === 'fullscreen' && 'Full-screen chat experience, ideal for dedicated support pages'}
              {selectedTab === 'react' && 'Reusable React component for easy integration'}
            </p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                <code>{getCurrentCode()}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          {selectedTab === 'responsive' && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> Replace <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">YOUR_SSO_TOKEN</code> with a token generated via the API endpoint <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/api-sso-generate-token</code>
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};