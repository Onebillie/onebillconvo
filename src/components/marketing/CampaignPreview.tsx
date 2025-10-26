import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Smartphone, Monitor, Users, AlertCircle } from "lucide-react";

interface CampaignPreviewProps {
  campaign: {
    name: string;
    description: string;
    channels: string[];
    email_subject?: string;
    email_content?: string;
    sms_content?: string;
    whatsapp_template_id?: string;
    recipient_filter: {
      includeAll: boolean;
      statusTags: string[];
      excludeUnsubscribed: boolean;
      lastContactedDays: number | null;
      customerType: 'all' | 'lead' | 'customer';
    };
  };
}

export function CampaignPreview({ campaign }: CampaignPreviewProps) {
  const renderPreviewContent = (content: string, subject?: string) => {
    // Replace merge tags with sample data for preview
    return content
      .replace(/\{\{first_name\}\}/g, 'John')
      .replace(/\{\{last_name\}\}/g, 'Doe')
      .replace(/\{\{full_name\}\}/g, 'John Doe')
      .replace(/\{\{customer_name\}\}/g, 'John Doe')
      .replace(/\{\{email\}\}/g, 'john.doe@example.com')
      .replace(/\{\{phone\}\}/g, '+353 87 123 4567')
      .replace(/\{\{company\}\}/g, 'Acme Corporation')
      .replace(/\{\{plan_name\}\}/g, 'Premium Plan')
      .replace(/\{\{invoice_total\}\}/g, '€299.00')
      .replace(/\{\{due_date\}\}/g, 'December 31, 2025')
      .replace(/\{\{renewal_date\}\}/g, 'January 15, 2026');
  };

  return (
    <div className="space-y-4">
      {/* Campaign Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Review Campaign
          </CardTitle>
          <CardDescription>
            Verify all details before sending. This cannot be undone once sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Campaign Name</Label>
            <p className="text-lg font-semibold mt-1">{campaign.name}</p>
          </div>

          {campaign.description && (
            <div>
              <Label className="text-sm text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{campaign.description}</p>
            </div>
          )}

          <div>
            <Label className="text-sm text-muted-foreground">Channels</Label>
            <div className="flex gap-2 mt-1">
              {campaign.channels.map(channel => (
                <Badge key={channel} variant="secondary" className="capitalize">
                  {channel === 'email' && <Mail className="w-3 h-3 mr-1" />}
                  {channel === 'sms' && <MessageSquare className="w-3 h-3 mr-1" />}
                  {channel === 'whatsapp' && <Smartphone className="w-3 h-3 mr-1" />}
                  {channel}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Target Audience</Label>
            <div className="space-y-2 mt-1">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                {campaign.recipient_filter.includeAll ? (
                  <span>All customers</span>
                ) : campaign.recipient_filter.statusTags.length > 0 ? (
                  <span>{campaign.recipient_filter.statusTags.length} status tag(s) selected</span>
                ) : (
                  <span>Custom filter</span>
                )}
              </div>
              {campaign.recipient_filter.excludeUnsubscribed && (
                <p className="text-xs text-muted-foreground">• Excluding unsubscribed customers</p>
              )}
              {campaign.recipient_filter.customerType !== 'all' && (
                <p className="text-xs text-muted-foreground capitalize">
                  • {campaign.recipient_filter.customerType}s only
                </p>
              )}
              {campaign.recipient_filter.lastContactedDays && (
                <p className="text-xs text-muted-foreground">
                  • Last contacted within {campaign.recipient_filter.lastContactedDays} days
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Message Preview
          </CardTitle>
          <CardDescription>
            Preview how your message will appear to recipients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={campaign.channels[0]} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${campaign.channels.length}, 1fr)` }}>
              {campaign.channels.includes('email') && (
                <TabsTrigger value="email">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </TabsTrigger>
              )}
              {campaign.channels.includes('sms') && (
                <TabsTrigger value="sms">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  SMS
                </TabsTrigger>
              )}
              {campaign.channels.includes('whatsapp') && (
                <TabsTrigger value="whatsapp">
                  <Smartphone className="w-4 h-4 mr-2" />
                  WhatsApp
                </TabsTrigger>
              )}
            </TabsList>

            {campaign.channels.includes('email') && campaign.email_content && (
              <TabsContent value="email" className="mt-4">
                <div className="space-y-4">
                  {/* Desktop Preview */}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Desktop View
                    </Label>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <div className="bg-muted p-3 border-b">
                        <p className="text-sm font-semibold">
                          Subject: {renderPreviewContent(campaign.email_subject || 'No subject')}
                        </p>
                      </div>
                      <div className="p-6 max-h-96 overflow-y-auto">
                        <div className="prose prose-sm max-w-none">
                          {renderPreviewContent(campaign.email_content).split('\n').map((line, i) => (
                            <p key={i} className="mb-2">{line || <br />}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Preview */}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Mobile View
                    </Label>
                    <div className="max-w-sm mx-auto">
                      <div className="border rounded-2xl overflow-hidden bg-white shadow-lg">
                        <div className="bg-muted p-2 border-b">
                          <p className="text-xs font-semibold truncate">
                            {renderPreviewContent(campaign.email_subject || 'No subject')}
                          </p>
                        </div>
                        <div className="p-4 max-h-64 overflow-y-auto text-sm">
                          {renderPreviewContent(campaign.email_content).split('\n').map((line, i) => (
                            <p key={i} className="mb-2 text-sm">{line || <br />}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {campaign.channels.includes('sms') && campaign.sms_content && (
              <TabsContent value="sms" className="mt-4">
                <div className="max-w-sm mx-auto">
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Mobile Device Preview
                  </Label>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-3xl shadow-xl">
                    <div className="bg-white rounded-2xl p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                          {campaign.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="bg-muted rounded-2xl rounded-tl-none p-3">
                            <p className="text-sm whitespace-pre-wrap">
                              {renderPreviewContent(campaign.sms_content)}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {campaign.sms_content.length} / 160 characters
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {campaign.channels.includes('whatsapp') && (
              <TabsContent value="whatsapp" className="mt-4">
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      WhatsApp Template ID: <code className="bg-muted px-2 py-1 rounded">{campaign.whatsapp_template_id || 'Not set'}</code>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Only approved WhatsApp templates can be sent. Preview will be available after template approval.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Final Warning */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium">Important Notes:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Campaigns cannot be edited or stopped once sent</li>
                <li>Ensure all content is accurate and professional</li>
                <li>Test with a small group first for best results</li>
                <li>Recipients will see personalized merge tag values</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
