import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { WhatsAppAccountManagement } from "./WhatsAppAccountManagement";
import { WhatsAppTemplateManagement } from "./WhatsAppTemplateManagement";
import { EmailAccountManagement } from "./EmailAccountManagement";
import { EmailTemplateSettings } from "./EmailTemplateSettings";
import { SmsAccountManagement } from "./SmsAccountManagement";
import { TemplateManagement } from "./TemplateManagement";
import { FacebookAccountManagement } from "./FacebookAccountManagement";
import { InstagramAccountManagement } from "./InstagramAccountManagement";
import { MessageSquare, Mail, Phone, MessageCircle, Instagram } from "lucide-react";

export function ChannelSettings() {
  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full">
        {/* WhatsApp Section */}
        <AccordionItem value="whatsapp">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold">WhatsApp</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
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
          </AccordionContent>
        </AccordionItem>

        {/* Email Section */}
        <AccordionItem value="email">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Email</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
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
          </AccordionContent>
        </AccordionItem>

        {/* SMS Section */}
        <AccordionItem value="sms">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold">SMS</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4">
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
          </AccordionContent>
        </AccordionItem>

        {/* Facebook Messenger Section */}
        <AccordionItem value="facebook">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Facebook Messenger</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Messenger Accounts</CardTitle>
                  <CardDescription>
                    Connect Facebook Business Pages to receive and send messages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FacebookAccountManagement />
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Instagram Section */}
        <AccordionItem value="instagram">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Instagram className="w-5 h-5 text-pink-600" />
              <h2 className="text-xl font-semibold">Instagram</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Instagram Accounts</CardTitle>
                  <CardDescription>
                    Connect Instagram Business accounts for direct messaging
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InstagramAccountManagement />
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Message Templates Section */}
        <AccordionItem value="templates">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Message Templates</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
