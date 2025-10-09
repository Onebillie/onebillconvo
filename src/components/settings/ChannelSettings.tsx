import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WhatsAppAccountManagement } from "./WhatsAppAccountManagement";
import { WhatsAppTemplateManagement } from "./WhatsAppTemplateManagement";
import { EmailAccountManagement } from "./EmailAccountManagement";
import { EmailTemplateSettings } from "./EmailTemplateSettings";
import { SmsAccountManagement } from "./SmsAccountManagement";
import { TemplateManagement } from "./TemplateManagement";
import { MessageSquare, Mail, Phone, MessageCircle } from "lucide-react";

export function ChannelSettings() {
  return (
    <div className="space-y-8">
      {/* WhatsApp Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <h2 className="text-2xl font-semibold">WhatsApp</h2>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Accounts</CardTitle>
              <CardDescription>
                Manage your WhatsApp Business API accounts and phone numbers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsAppAccountManagement />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Templates</CardTitle>
              <CardDescription>
                Manage and sync WhatsApp message templates approved by Meta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsAppTemplateManagement />
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Email Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <h2 className="text-2xl font-semibold">Email</h2>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Accounts</CardTitle>
              <CardDescription>
                Configure IMAP/POP3 and SMTP settings for email communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailAccountManagement />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Customize HTML templates for outgoing emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailTemplateSettings />
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-8" />

      {/* SMS Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-purple-600" />
          <h2 className="text-2xl font-semibold">SMS</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>SMS Accounts</CardTitle>
            <CardDescription>
              Configure Twilio and other SMS provider accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmsAccountManagement />
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Text Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Message Templates</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Text Message Templates</CardTitle>
            <CardDescription>
              Create and manage reusable message templates for quick responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateManagement />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
