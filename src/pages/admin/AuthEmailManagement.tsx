import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  RefreshCw,
  Settings,
  FileText,
  Palette
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmailLog {
  id: string;
  type: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  created_at: string;
  error_message?: string;
}

export default function AuthEmailManagement() {
  const [testEmail, setTestEmail] = useState("");
  const [emailType, setEmailType] = useState<'email_verification' | 'magic_link' | 'password_reset' | '2fa_code'>('email_verification');
  const [testUrl, setTestUrl] = useState("https://alacartechat.com/auth");
  const [testCode, setTestCode] = useState("123456");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Brand customization state
  const [brandColor, setBrandColor] = useState("#ea384c");
  const [companyName, setCompanyName] = useState("À La Carte Chat");
  const [supportEmail, setSupportEmail] = useState("support@alacartechat.com");

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    setSending(true);
    try {
      const payload: any = {
        type: emailType,
        email: testEmail,
      };

      if (emailType === '2fa_code') {
        payload.code = testCode;
      } else {
        payload.url = testUrl;
      }

      const { error } = await supabase.functions.invoke('send-auth-email', {
        body: payload,
      });

      if (error) throw error;

      toast.success(`Test ${emailType.replace('_', ' ')} email sent to ${testEmail}`);
      
      // Refresh logs after sending
      await fetchEmailLogs();
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const fetchEmailLogs = async () => {
    setLoadingLogs(true);
    try {
      // In production, you'd query actual email logs from a database table
      // For now, we'll use placeholder data
      const mockLogs: EmailLog[] = [
        {
          id: '1',
          type: 'email_verification',
          to: 'user@example.com',
          subject: 'Verify your email address',
          status: 'sent',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'magic_link',
          to: 'admin@example.com',
          subject: 'Your magic link to sign in',
          status: 'sent',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          type: 'password_reset',
          to: 'test@example.com',
          subject: 'Reset your password',
          status: 'failed',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          error_message: 'Invalid email address',
        },
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error('Error fetching email logs:', error);
      toast.error('Failed to fetch email logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEmailTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Authentication Email Management</h1>
        <p className="text-muted-foreground mt-2">
          Configure, test, and monitor authentication emails
        </p>
      </div>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Test Emails
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Eye className="h-4 w-4 mr-2" />
            Email Logs
          </TabsTrigger>
          <TabsTrigger value="customize">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
        </TabsList>

        {/* Test Emails Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Test your authentication email templates with real data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="email-type">Email Type</Label>
                  <Select value={emailType} onValueChange={(value: any) => setEmailType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email_verification">Email Verification</SelectItem>
                      <SelectItem value="magic_link">Magic Link Login</SelectItem>
                      <SelectItem value="password_reset">Password Reset</SelectItem>
                      <SelectItem value="2fa_code">2FA Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="test-email">Recipient Email</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>

                {emailType === '2fa_code' ? (
                  <div>
                    <Label htmlFor="test-code">Verification Code</Label>
                    <Input
                      id="test-code"
                      placeholder="123456"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="test-url">Action URL</Label>
                    <Input
                      id="test-url"
                      placeholder="https://alacartechat.com/auth"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                    />
                  </div>
                )}

                <Button onClick={sendTestEmail} disabled={sending} className="w-full">
                  {sending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>How your email will look to recipients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6 bg-muted/50">
                <div className="bg-background rounded-lg p-8 max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">
                    {emailType === 'email_verification' && 'Welcome to À La Carte Chat!'}
                    {emailType === 'magic_link' && 'Sign in to À La Carte Chat'}
                    {emailType === 'password_reset' && 'Reset Your Password'}
                    {emailType === '2fa_code' && 'Two-Factor Authentication'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {emailType === 'email_verification' && 'Thank you for signing up. To get started, please verify your email address.'}
                    {emailType === 'magic_link' && 'Click the button below to securely sign in to your account.'}
                    {emailType === 'password_reset' && 'We received a request to reset your password. Click the button below to create a new password.'}
                    {emailType === '2fa_code' && 'Use the verification code below to complete your sign in.'}
                  </p>
                  {emailType === '2fa_code' ? (
                    <div className="text-center">
                      <div className="inline-block bg-muted border-2 border-primary rounded-lg px-8 py-4">
                        <span className="text-4xl font-bold font-mono tracking-widest">{testCode}</span>
                      </div>
                    </div>
                  ) : (
                    <Button style={{ backgroundColor: brandColor }} className="w-full">
                      {emailType === 'email_verification' && 'Verify Email Address'}
                      {emailType === 'magic_link' && 'Sign In'}
                      {emailType === 'password_reset' && 'Reset Password'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage your authentication email templates using React Email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {['email_verification', 'magic_link', 'password_reset', '2fa_code'].map((type) => (
                  <div key={type} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{getEmailTypeLabel(type)}</h3>
                      <Badge variant="outline">
                        <FileText className="h-3 w-3 mr-1" />
                        React Email
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Location: <code className="text-xs bg-muted px-2 py-1 rounded">
                        supabase/functions/send-auth-email/_templates/{type}.tsx
                      </code>
                    </p>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Template
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Delivery Logs</CardTitle>
                  <CardDescription>
                    Monitor authentication email delivery status
                  </CardDescription>
                </div>
                <Button onClick={fetchEmailLogs} disabled={loadingLogs} size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No email logs yet. Send a test email to see logs here.</p>
                      <Button onClick={fetchEmailLogs} variant="outline" className="mt-4">
                        Load Logs
                      </Button>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{getEmailTypeLabel(log.type)}</Badge>
                              {getStatusBadge(log.status)}
                            </div>
                            <p className="text-sm font-medium">{log.subject}</p>
                            <p className="text-sm text-muted-foreground">To: {log.to}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                        {log.error_message && (
                          <div className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                            Error: {log.error_message}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="customize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Branding</CardTitle>
              <CardDescription>
                Customize the look and feel of your authentication emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="brand-color">Primary Brand Color</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="brand-color"
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#ea384c"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Used for buttons and accent colors
                </p>
              </div>

              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="À La Carte Chat"
                />
              </div>

              <div>
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@alacartechat.com"
                />
              </div>

              <Button className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Save Branding Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
