import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">À La Carte Chat</span>
          </div>
          <Button onClick={() => navigate("/")} variant="ghost">
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using À La Carte Chat ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="mb-4">
              À La Carte Chat provides a unified inbox platform for managing WhatsApp Business API, Email, SMS, Facebook Messenger, Instagram Direct Messages, and other customer communication channels. The Service includes message management, AI assistance, team collaboration tools, API access, embeddable widgets, and related features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="mb-4">You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your account information is accurate and up-to-date</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Subscription, Billing, and Usage Charges</h2>
            
            <h3 className="text-lg font-semibold mb-2 mt-4">4.1 Subscription Plans</h3>
            <p className="mb-4">
              Paid subscriptions are billed monthly in advance. By subscribing, you authorize us to charge your payment method. Subscriptions automatically renew unless cancelled. Message limits apply based on your subscription tier. Usage beyond your plan limits may result in additional charges or service restrictions.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-4">4.2 AI Assistant Pricing</h3>
            <p className="mb-4">
              Use of AI assistant features powered by third-party LLM providers (Lovable AI Gateway) incurs usage-based charges:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Professional Tier:</strong> Includes up to 1,000 AI responses per month. Additional AI responses: $0.02 per response.</li>
              <li><strong>Enterprise Tier:</strong> Unlimited AI responses included.</li>
              <li><strong>Free & Starter Tiers:</strong> AI assistant not available.</li>
            </ul>
            <p className="mb-4">
              AI usage charges are billed monthly in arrears based on actual consumption.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-4">4.3 SMS and Channel-Specific Charges</h3>
            <p className="mb-4">
              SMS sending is subject to carrier fees (average $0.01-$0.05 per message) which vary by destination country. Facebook Messenger and Instagram Direct Messages are included in your message limits. WhatsApp Business API messages are included in your subscription limits for sending; receiving is always unlimited.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-4">4.4 Credit System</h3>
            <p className="mb-4">
              Credits can be purchased in bundles and used for AI responses or additional message capacity. <strong>Credits expire 1 year from the purchase date and are non-refundable.</strong> You will receive email notifications when credits are approaching expiry (30, 14, 7, 3, and 1 days before expiration). Expired credits are automatically removed and cannot be recovered.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Send spam, unsolicited messages, or violate anti-spam laws (CAN-SPAM, GDPR)</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Violate WhatsApp's Terms of Service, Business Policy, or Meta's Platform Terms</li>
              <li>Share account credentials with unauthorized parties</li>
              <li>Use the service to harass, abuse, or harm others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. API Access and Rate Limiting</h2>
            
            <h3 className="text-lg font-semibold mb-2 mt-4">6.1 API Rate Limits</h3>
            <p className="mb-4">
              API requests are limited to 1,000 requests per hour per API key by default. Exceeding these limits will result in 429 (Too Many Requests) errors. Enterprise customers may request custom rate limit increases. Repeated violations may result in temporary or permanent API access suspension.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-4">6.2 API Key Security</h3>
            <p className="mb-4">
              You are responsible for keeping your API keys secure. Never share API keys publicly or commit them to version control systems. We are not liable for unauthorized access resulting from compromised API keys.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Webhooks and Data Delivery</h2>
            <p className="mb-4">
              Webhooks are delivered on a best-effort basis. We do not guarantee delivery timing, order, or exactly-once delivery. Implement retry logic and idempotency in your systems. Webhook failures due to your endpoint being unavailable are not grounds for service credits or refunds.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data and Privacy</h2>
            <p className="mb-4">
              Your use of the Service is subject to our Privacy Policy. We process your data in accordance with GDPR, CCPA, and applicable data protection laws. You retain ownership of your customer data. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data Export and Portability</h2>
            <p className="mb-4">
              You may export all your data in JSON format via the Settings interface. Allow up to 48 hours for export preparation for large datasets. Exports include customer data, conversations, messages, templates, and configuration settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Service Level Agreement (SLA)</h2>
            <p className="mb-4">
              <strong>Enterprise customers:</strong> 99.5% uptime SLA with service credits for verified outages.
            </p>
            <p className="mb-4">
              <strong>Free, Starter, and Professional plans:</strong> Best-effort availability with no uptime guarantee.
            </p>
            <p className="mb-4">
              Outages or service interruptions caused by third-party services (Meta WhatsApp API, Facebook, Instagram, Stripe, Supabase, email providers) are not covered by our SLA and do not qualify for service credits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Refund Policy</h2>
            <p className="mb-4">
              Monthly subscription fees: Pro-rated refunds available within 14 days of initial purchase for new customers only. Renewals are non-refundable.
            </p>
            <p className="mb-4">
              AI usage credits and credit bundles: Non-refundable in all cases.
            </p>
            <p className="mb-4">
              SMS carrier fees: Non-refundable as they are third-party charges.
            </p>
            <p className="mb-4">
              Refunds are processed within 7-10 business days to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Force Majeure</h2>
            <p className="mb-4">
              We are not liable for service interruptions, data loss, or performance issues caused by events beyond our reasonable control, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Meta WhatsApp API outages or policy changes</li>
              <li>Facebook or Instagram platform disruptions</li>
              <li>Third-party service provider failures (Stripe, Supabase, Twilio, email providers)</li>
              <li>Natural disasters, pandemics, or acts of government</li>
              <li>Internet service provider outages or network congestion</li>
              <li>Cyber attacks, DDoS attacks, or security incidents affecting third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Account Suspension and Termination</h2>
            <p className="mb-4">
              We reserve the right to suspend or terminate your account for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violations of these Terms of Service</li>
              <li>Non-payment or payment failure</li>
              <li>Abusive behavior towards our staff or other users</li>
              <li>Suspected fraudulent activity</li>
              <li>Violations of third-party terms (WhatsApp, Meta, etc.)</li>
            </ul>
            <p className="mb-4 mt-4">
              You may cancel your subscription at any time through your account settings or the Stripe Customer Portal. Upon cancellation, access continues until the end of your billing period. No partial refunds for unused time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Limitation of Liability</h2>
            <p className="mb-4">
              The Service is provided "as is" without warranties of any kind, express or implied. We are not liable for any indirect, incidental, consequential, punitive, or special damages arising from your use of the Service, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Lost revenue or profits</li>
              <li>Data loss or corruption</li>
              <li>Business interruption</li>
              <li>Missed customer communications</li>
              <li>Reputational damage</li>
            </ul>
            <p className="mb-4 mt-4">
              Our total liability for any claim related to the Service is limited to the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Intellectual Property</h2>
            <p className="mb-4">
              The Service, including its original content, features, and functionality, is owned by À La Carte Chat and is protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of the Service without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Changes to Terms</h2>
            <p className="mb-4">
              We may modify these Terms at any time. Material changes will be notified via email or in-app notification at least 30 days before taking effect. Continued use of the Service after changes constitutes acceptance of the modified Terms. If you do not agree to changes, you must cancel your subscription before the changes take effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Dispute Resolution and Governing Law</h2>
            <p className="mb-4">
              These Terms are governed by the laws of Ireland, without regard to conflict of law principles. Any disputes arising from these Terms or the Service will be resolved through binding arbitration in Dublin, Ireland, except where prohibited by law. You agree to waive any right to a jury trial or class action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Contact Information</h2>
            <p className="mb-4">
              For questions about these Terms, contact us at:
              <br />
              <strong>Email:</strong> support@alacartechat.com
              <br />
              <strong>Legal:</strong> legal@alacartechat.com
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
