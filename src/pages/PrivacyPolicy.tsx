import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              We collect information you provide directly to us when you create an account, use our services, or communicate with us. This includes:
            </p>
            
            <h3 className="text-lg font-semibold mb-2 mt-4">1.1 Account Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personal details (name, email address, phone number)</li>
              <li>Business information (company name, industry, address)</li>
              <li>Payment and billing information (processed securely via Stripe)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4">1.2 Message Content and Conversation Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>WhatsApp Business API messages (inbound and outbound)</li>
              <li>Email messages from connected IMAP/SMTP accounts</li>
              <li>SMS messages sent/received via Twilio</li>
              <li>Facebook Messenger conversations</li>
              <li>Instagram Direct Messages</li>
              <li>Customer contact information (names, phone numbers, email addresses)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4">1.3 Voice Notes and File Attachments</h3>
            <p className="mb-4">
              Voice notes and file attachments (images, PDFs, videos, documents) sent or received through any channel are stored in Supabase Storage with encryption at rest. These files are retained for 90 days after conversation closure unless your business specifies a different retention period in settings.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-4">1.4 AI Processing Data</h3>
            <p className="mb-4">
              When you use the AI assistant feature, customer messages are processed by the Lovable AI Gateway (powered by Google Gemini) to generate responses. We do not use your data to train AI models. Messages sent to the AI service are deleted immediately after response generation (0-day retention). AI training data you manually provide (Q&A pairs, RAG documents) is stored in our database for AI customization purposes only.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-4">1.5 Usage Data and Analytics</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Message counts per channel and period</li>
              <li>Response times and conversation metrics</li>
              <li>Feature usage statistics</li>
              <li>Device information and IP addresses</li>
              <li>Browser type and version</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4">1.6 SMS Data Collection</h3>
            <p className="mb-4">
              When using SMS features, we collect phone numbers and message content. SMS messages are transmitted via Twilio, our SMS service provider. Twilio's privacy policy applies to SMS transmission. We store SMS message history in our database for conversation continuity and compliance purposes.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-4">1.7 Facebook and Instagram Data</h3>
            <p className="mb-4">
              When connecting Facebook or Instagram accounts, we store:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Facebook Page IDs and Instagram usernames</li>
              <li>Conversation data from Messenger and Instagram DMs</li>
              <li>Access tokens required by Meta Business Platform Terms</li>
              <li>Page/account settings and permissions</li>
            </ul>
            <p className="mb-4">
              This data is collected and processed in accordance with Meta's Platform Terms and Data Use Policy. We do not share this data with third parties beyond what is required for service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send transactional notifications</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Generate AI-powered responses (when enabled by you)</li>
              <li>Aggregate anonymized usage data for analytics and reporting</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
              <li>Develop new features and services based on user feedback</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data encrypted at rest using AES-256 encryption</li>
              <li>Data encrypted in transit using TLS 1.2+</li>
              <li>Access controls and role-based permissions</li>
              <li>Regular security audits and penetration testing</li>
              <li>API keys hashed using bcrypt with salt</li>
              <li>Admin session tracking with device fingerprinting</li>
              <li>Automated security updates and patch management</li>
            </ul>
            <p className="mb-4">
              Your data is stored securely using Supabase (PostgreSQL database and object storage), which provides enterprise-grade security infrastructure hosted on AWS with SOC 2 Type II compliance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services and Data Sharing</h2>
            <p className="mb-4">We use the following third-party services to operate our platform:</p>
            
            <h3 className="text-lg font-semibold mb-2 mt-4">4.1 Infrastructure and Data Providers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase:</strong> Database storage, authentication, and file storage (AWS-hosted, GDPR/SOC 2 compliant)</li>
              <li><strong>Stripe:</strong> Payment processing (PCI DSS Level 1 certified)</li>
              <li><strong>Resend:</strong> Transactional email delivery</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4">4.2 Communication Channel Providers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Meta WhatsApp Business API:</strong> WhatsApp message transmission (Meta Platform Terms apply)</li>
              <li><strong>Meta Business Platform:</strong> Facebook Messenger and Instagram DM integration</li>
              <li><strong>Twilio:</strong> SMS sending and receiving</li>
              <li><strong>IMAP/SMTP Email Providers:</strong> Your connected email accounts (Gmail, Outlook, custom servers)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4">4.3 AI and Processing Services</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Lovable AI Gateway (Google Gemini):</strong> AI response generation (0-day data retention, no training on your data)</li>
            </ul>

            <p className="mb-4 mt-4">
              We do not sell your personal data to third parties. Data is only shared with the above services as necessary to provide our platform functionality. Each service provider is bound by their own privacy policies and data protection agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies and Tracking Technologies</h2>
            
            <h3 className="text-lg font-semibold mb-2 mt-4">5.1 Cookie Usage</h3>
            <p className="mb-4">We use cookies and similar tracking technologies for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Authentication:</strong> Session cookies to keep you logged in (essential)</li>
              <li><strong>Security:</strong> Device fingerprinting for admin login security (essential)</li>
              <li><strong>Analytics:</strong> Anonymized usage tracking to improve service (optional)</li>
              <li><strong>Preferences:</strong> Storing user interface preferences (optional)</li>
            </ul>
            <p className="mb-4">
              You can control non-essential cookies via our Cookie Consent banner. Disabling cookies may affect certain functionality.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-4">5.2 Do Not Track</h3>
            <p className="mb-4">
              We do not currently respond to "Do Not Track" signals as there is no industry standard for compliance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            
            <h3 className="text-lg font-semibold mb-2 mt-4">6.1 Retention Periods</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Active conversations:</strong> Retained indefinitely until you delete them</li>
              <li><strong>Closed conversations:</strong> 90 days after closure (configurable in business settings)</li>
              <li><strong>Deleted account data:</strong> 30-day soft delete period, then permanently deleted</li>
              <li><strong>Backup retention:</strong> Up to 90 days in encrypted backups</li>
              <li><strong>Voice notes and attachments:</strong> 90 days after conversation closure</li>
              <li><strong>AI processing data:</strong> 0 days (immediate deletion after response)</li>
              <li><strong>Billing and tax records:</strong> 7 years (legal requirement)</li>
              <li><strong>API logs:</strong> 30 days</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4">6.2 Configurable Retention</h3>
            <p className="mb-4">
              Enterprise customers can configure custom retention periods for conversations and attachments via Settings. Minimum retention is 30 days; maximum is indefinite.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights (GDPR Compliance)</h2>
            <p className="mb-4">Under the General Data Protection Regulation (GDPR), you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right to Access:</strong> Request a copy of all personal data we hold about you</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your personal data</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we process your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format (JSON)</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
            </ul>
            <p className="mb-4 mt-4">
              To exercise these rights, contact us at <strong>privacy@alacartechat.com</strong>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. California Privacy Rights (CCPA Compliance)</h2>
            <p className="mb-4">
              California residents have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Know:</strong> What personal information we collect, use, and share</li>
              <li><strong>Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Opt-Out:</strong> Opt-out of the sale of personal information (we do not sell data)</li>
              <li><strong>Non-Discrimination:</strong> Not be discriminated against for exercising CCPA rights</li>
            </ul>
            <p className="mb-4 mt-4">
              To exercise CCPA rights, email <strong>privacy@alacartechat.com</strong> with "CCPA Request" in the subject line. We will verify your identity and respond within 45 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Right to Be Forgotten (Data Deletion Process)</h2>
            <p className="mb-4">
              You can request complete data deletion via:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Navigate to Settings → Business → Privacy → Delete Account</li>
              <li>Or email <strong>privacy@alacartechat.com</strong></li>
            </ol>
            <p className="mb-4 mt-4">
              Upon deletion request:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your account will be immediately deactivated</li>
              <li>Personal data deleted within 30 days</li>
              <li>Backups purged within 90 days</li>
              <li>Legal/tax records retained for 7 years (required by law)</li>
              <li>Anonymized usage statistics may be retained for analytics</li>
            </ul>
            <p className="mb-4 mt-4">
              Note: Data deletion is irreversible. You cannot recover conversations or customer data after deletion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="mb-4">
              Your data may be transferred to and processed in countries outside your country of residence, including the United States (AWS/Supabase infrastructure). We ensure appropriate safeguards are in place, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>EU-US Data Privacy Framework participation (where applicable)</li>
              <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
              <li>Data processing agreements with all subprocessors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children's Privacy</h2>
            <p className="mb-4">
              Our Service is not intended for children under 16. We do not knowingly collect personal information from children. If you believe we have collected data from a child, contact us immediately at <strong>privacy@alacartechat.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. Material changes will be notified via:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email notification to your registered email address</li>
              <li>In-app notification banner</li>
              <li>Updated "Last updated" date at the top of this policy</li>
            </ul>
            <p className="mb-4">
              Continued use of the Service after changes constitutes acceptance of the updated Privacy Policy. If you do not agree, you must discontinue use and delete your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy or wish to exercise your privacy rights, please contact us at:
            </p>
            <p className="mb-4">
              <strong>Email:</strong> privacy@alacartechat.com
              <br />
              <strong>Data Protection Officer:</strong> dpo@alacartechat.com
              <br />
              <strong>Address:</strong> À La Carte Chat, Dublin, Ireland
            </p>
            <p className="mb-4">
              <strong>EU Representative (GDPR Inquiries):</strong> gdpr@alacartechat.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Supervisory Authority</h2>
            <p className="mb-4">
              If you are located in the European Economic Area (EEA), you have the right to lodge a complaint with your local data protection authority if you believe we have violated your privacy rights under GDPR.
            </p>
            <p className="mb-4">
              <strong>Ireland Data Protection Commission:</strong> <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.dataprotection.ie</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
