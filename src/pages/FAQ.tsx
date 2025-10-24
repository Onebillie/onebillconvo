import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquare } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicHeader } from "@/components/PublicHeader";

const FAQ = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const faqCategories = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "How do I get started with À La Carte Chat?",
          answer: "Simply sign up for a free account, connect your first communication channel (WhatsApp, Email, or SMS), and start managing conversations. The entire setup takes less than 5 minutes."
        },
        {
          question: "Do I need a credit card for the free plan?",
          answer: "No! Our free plan is completely free forever with no credit card required. You get 100 WhatsApp messages per month, unlimited email receiving, and access to basic features."
        },
        {
          question: "Can I switch plans at any time?",
          answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated accordingly."
        },
        {
          question: "How long does setup take?",
          answer: "Initial setup takes 5-10 minutes. Connecting your first channel (email or WhatsApp) is instant. More complex integrations like Instagram or Facebook may take 15-20 minutes including verification."
        },
        {
          question: "Do you offer a free trial of paid features?",
          answer: "Yes! All paid plans come with a 14-day free trial. No credit card required for the trial. You get full access to Professional or Enterprise features during the trial period."
        },
        {
          question: "Can I migrate from another platform?",
          answer: "Absolutely! We offer free migration assistance on Professional and Enterprise plans. We can help you import contacts, conversation history, templates, and settings from platforms like Zendesk, Intercom, or Freshdesk."
        }
      ]
    },
    {
      category: "Messaging Channels",
      questions: [
        {
          question: "Which messaging channels do you support?",
          answer: "We support WhatsApp Business API, Email (IMAP/SMTP), SMS (via Twilio), Instagram Direct Messages, Facebook Messenger, and our own embeddable website chat widget. All channels appear in one unified inbox."
        },
        {
          question: "How do I connect my WhatsApp Business account?",
          answer: "You'll need a WhatsApp Business API account (not the regular WhatsApp Business app). Go to Settings → Channels → WhatsApp, and follow our setup wizard. We support both Meta's Business API and third-party providers."
        },
        {
          question: "Can I connect multiple email accounts?",
          answer: "Yes! You can connect unlimited email accounts on all paid plans. We support Gmail, Outlook, and any custom domain with IMAP/SMTP access. OAuth2 authentication is supported for Gmail and Outlook."
        },
        {
          question: "How does SMS pricing work?",
          answer: "SMS messages are sent through Twilio. You'll need your own Twilio account, and messages are charged at Twilio's standard rates. Our platform provides the interface and management tools."
        },
        {
          question: "Are Instagram and Facebook messages really supported?",
          answer: "Yes! Both Instagram Direct Messages and Facebook Messenger are fully supported. Connect your Facebook Page or Instagram Business account in Settings → Channels, and all messages will flow into your unified inbox."
        }
      ]
    },
    {
      category: "Pricing & Billing",
      questions: [
        {
          question: "What counts as a 'message' in my plan?",
          answer: "Only outbound WhatsApp messages count toward your monthly limit. Receiving messages, emails (in/out), SMS, Instagram, and Facebook messages are billed separately or through your provider (e.g., Twilio for SMS)."
        },
        {
          question: "What happens if I exceed my message limit?",
          answer: "You'll receive a notification when you reach 80% of your limit. After that, you can purchase credit bundles or upgrade your plan. Messages won't be blocked; overage charges apply at $0.10 per message for Free plan users."
        },
        {
          question: "Can I purchase additional message credits?",
          answer: "Yes! We offer credit bundles: Small (500 messages - $10), Medium (1,500 messages - $25), and Large (5,000 messages - $75). Credits expire 1 year from purchase date and are non-refundable."
        },
        {
          question: "Do you offer refunds?",
          answer: "We offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact support within 7 days for a full refund."
        },
        {
          question: "Is there a discount for annual billing?",
          answer: "Yes! Contact our sales team for annual billing options with up to 20% discount on Enterprise plans."
        }
      ]
    },
    {
      category: "Features & Functionality",
      questions: [
        {
          question: "How does the AI Assistant work?",
          answer: "Our AI Assistant learns from your FAQs, previous conversations, and uploaded documents. It can suggest responses, auto-reply to common questions (with approval), and route conversations to the right team members. Available on Professional and Enterprise plans."
        },
        {
          question: "Can multiple team members use the same account?",
          answer: "Yes! All plans support multiple team members. Free (1 seat), Starter (2 seats), Professional (10 seats), Enterprise (unlimited). Additional seats can be purchased on Starter and Professional plans."
        },
        {
          question: "What are internal notes and how do they work?",
          answer: "Internal notes let your team collaborate on conversations without customers seeing the messages. Add notes, @mention teammates, and keep context—perfect for handoffs and complex issues."
        },
        {
          question: "Can I assign conversations to specific team members?",
          answer: "Yes! Manually assign conversations or set up auto-assignment rules based on channel, keywords, language, or customer tags. Track workload distribution in real-time."
        },
        {
          question: "How do templates and canned responses work?",
          answer: "Create reusable message templates with variable placeholders (e.g., {{customer_name}}). Use keyboard shortcuts or the template picker to insert them instantly. Templates can include attachments and are shared across your team."
        }
      ]
    },
    {
      category: "AI & Automation",
      questions: [
        {
          question: "How does the AI Assistant learn about my business?",
          answer: "The AI learns from three sources: (1) Documents you upload (FAQs, product manuals, policies), (2) Your past conversations and how your team responds, (3) Training you provide through the AI settings. It continuously improves as it observes successful conversations."
        },
        {
          question: "Can the AI send messages without my approval?",
          answer: "You have full control! Choose between: (1) Suggestion Mode—AI suggests responses for your review, (2) Auto-reply with Approval—AI sends pre-approved responses to common questions, (3) Fully Automated—AI handles conversations within parameters you set. You can adjust per channel or conversation type."
        },
        {
          question: "What languages does the AI support?",
          answer: "The AI supports 95+ languages including English, Spanish, French, German, Portuguese, Arabic, Chinese, Japanese, Hindi, and more. It can detect the customer's language and respond accordingly."
        },
        {
          question: "Can I train the AI on my specific products/services?",
          answer: "Yes! Upload your product catalogs, service descriptions, pricing sheets, FAQs, and policy documents. The AI will use this information to answer customer questions accurately. You can update training materials anytime."
        },
        {
          question: "How accurate is the AI?",
          answer: "Our AI achieves 85-95% accuracy on trained topics. For best results, provide comprehensive training documents and review initial responses. The AI will notify you when it's unsure and escalate to a human agent."
        },
        {
          question: "Can the AI handle multiple conversations simultaneously?",
          answer: "Yes! The AI can manage unlimited simultaneous conversations across all channels. This allows you to serve more customers without hiring additional staff."
        },
        {
          question: "What automation rules can I set up?",
          answer: "You can automate: (1) Conversation routing based on keywords, language, or channel, (2) Auto-assignment to specific team members, (3) Status changes based on triggers, (4) Follow-up messages after X hours of inactivity, (5) Tagging based on message content, (6) After-hours auto-replies."
        }
      ]
    },
    {
      category: "Team Collaboration",
      questions: [
        {
          question: "How do team members avoid responding to the same customer?",
          answer: "À La Carte Chat shows real-time indicators when a teammate is viewing or typing in a conversation. You'll see '[Name] is typing...' to prevent duplicate responses. Conversations can also be assigned to specific team members."
        },
        {
          question: "Can I @mention teammates in conversations?",
          answer: "Yes! Use internal notes to @mention teammates. They'll receive a notification and can see your message. Customers never see internal notes—they're for team collaboration only."
        },
        {
          question: "How do permissions work for team members?",
          answer: "Set role-based permissions: (1) Admin—full access to everything, (2) Manager—can manage conversations, view reports, assign work, (3) Agent—can manage assigned conversations only, (4) Read-only—can view but not respond. Custom roles available on Enterprise plans."
        },
        {
          question: "Can I see what my team is working on?",
          answer: "Yes! The dashboard shows: (1) Who's online/offline, (2) Active conversations per agent, (3) Response time metrics, (4) Conversation load distribution, (5) Real-time activity feed. Managers can view any conversation."
        },
        {
          question: "How do handoffs work between team members?",
          answer: "Use the 'Transfer' or 'Assign' feature. Add an internal note explaining the context, select the recipient team member, and they'll be notified immediately. All conversation history transfers with the assignment."
        },
        {
          question: "Can different team members handle different channels?",
          answer: "Absolutely! Assign team members to specific channels. For example, your social media specialist can handle Instagram/Facebook while your support team manages email and WhatsApp."
        }
      ]
    },
    {
      category: "Analytics & Reporting",
      questions: [
        {
          question: "What metrics can I track?",
          answer: "Track: (1) Response time (first response & average), (2) Resolution time, (3) Messages per channel, (4) Customer satisfaction scores, (5) Agent performance, (6) Peak hours and volume trends, (7) AI vs human response rates, (8) Conversation tags and categories."
        },
        {
          question: "Can I export reports?",
          answer: "Yes! Export reports as CSV, Excel, or PDF. Schedule automatic weekly or monthly reports sent to your email. All plans include basic reports; Professional and Enterprise get advanced analytics."
        },
        {
          question: "How do I measure team performance?",
          answer: "View individual agent metrics: (1) Conversations handled, (2) Average response time, (3) Resolution rate, (4) Customer satisfaction scores, (5) Active hours. Use leaderboards to gamify performance and motivate your team."
        },
        {
          question: "Can I see which channels perform best?",
          answer: "Yes! The channel performance report shows: (1) Volume by channel, (2) Response time by channel, (3) Resolution rate, (4) Customer satisfaction per channel. Use this data to optimize your communication strategy."
        },
        {
          question: "Do you track customer satisfaction?",
          answer: "Yes! Send automatic satisfaction surveys after conversations are resolved. Track CSAT (Customer Satisfaction Score) and NPS (Net Promoter Score). View trends over time and identify areas for improvement."
        }
      ]
    },
    {
      category: "Task Management",
      questions: [
        {
          question: "How does task management work?",
          answer: "Create tasks directly from conversations. Set due dates, assign to team members, add priority levels, and attach related conversations. Tasks appear in the task dashboard and send reminders before they're due."
        },
        {
          question: "Can tasks be linked to specific conversations?",
          answer: "Yes! When you create a task from a conversation, it's automatically linked. Team members can click the task to jump directly to the related conversation. Update the task status and add notes as you progress."
        },
        {
          question: "What types of tasks can I create?",
          answer: "Common task types: (1) Follow-up with customer, (2) Internal research/investigation, (3) Escalation to management, (4) Schedule callback, (5) Process refund/order, (6) Custom task types you define."
        },
        {
          question: "Do tasks integrate with calendars?",
          answer: "Yes! Tasks with due dates automatically sync to your calendar (Google Calendar, Outlook, iCal). Set up calendar integration in Settings → Calendar to sync tasks and appointments."
        },
        {
          question: "Can I see overdue tasks?",
          answer: "Yes! The dashboard highlights overdue tasks in red. Filter the task list by 'Overdue,' 'Due Today,' or 'Upcoming.' Team members receive notifications for tasks approaching their due date."
        }
      ]
    },
    {
      category: "Mobile & Desktop Apps",
      questions: [
        {
          question: "Do you have mobile apps?",
          answer: "Yes! Download our Progressive Web App (PWA) for iOS and Android. It works offline, sends push notifications, and provides the full desktop experience on mobile. Install from your browser: click 'Add to Home Screen' when prompted."
        },
        {
          question: "Do I get push notifications?",
          answer: "Yes! Enable push notifications in Settings → Notifications. You'll receive alerts for: (1) New messages, (2) @mentions, (3) Assigned conversations, (4) Task reminders, (5) AI escalations. Customize notification preferences per channel."
        },
        {
          question: "Can I use it offline?",
          answer: "The mobile app caches recent conversations for offline viewing. You can read messages and compose drafts offline. Once you reconnect, drafts are sent automatically. Real-time features require an internet connection."
        },
        {
          question: "Is there a desktop app?",
          answer: "À La Carte Chat is a web application accessible from any browser. For a desktop app experience, install our PWA: click the install icon in your browser's address bar (Chrome, Edge, Safari). It runs like a native app with keyboard shortcuts."
        }
      ]
    },
    {
      category: "Integration & API",
      questions: [
        {
          question: "Do you have an API?",
          answer: "Yes! Professional and Enterprise plans include full REST API access with comprehensive documentation at /api-docs. Manage customers, send messages, retrieve conversations, and more—all programmatically."
        },
        {
          question: "Can I embed the chat widget on my website?",
          answer: "Absolutely! Go to Settings → Website Widget to customize your chat widget (colors, messages, behavior) and get the embed code. Takes less than 2 minutes to add to any website."
        },
        {
          question: "Does the API support webhooks?",
          answer: "Yes! Set up webhooks to receive real-time notifications when messages are received, sent, or when conversation status changes. Perfect for integrating with your CRM or ticketing system."
        },
        {
          question: "Can I integrate with my existing CRM?",
          answer: "Yes! Use our REST API to sync customers, export conversations, and trigger actions in your CRM. We also support custom integrations—contact our team for assistance."
        },
        {
          question: "Do you support Single Sign-On (SSO)?",
          answer: "Yes! Enterprise plans include SSO support for seamless integration with your existing identity provider. Contact sales for configuration details."
        }
      ]
    },
    {
      category: "Enterprise Features",
      questions: [
        {
          question: "What's included in the Enterprise plan?",
          answer: "Enterprise includes: (1) Unlimited team members, (2) Advanced AI with custom training, (3) SSO (Single Sign-On), (4) Custom branding (white-label), (5) Dedicated account manager, (6) Priority 24/7 support, (7) Custom integrations, (8) Data residency options, (9) SLA guarantees, (10) Custom contract terms."
        },
        {
          question: "Do you offer white-label solutions?",
          answer: "Yes! Enterprise customers can remove all À La Carte Chat branding and add their own logo, colors, and domain. Perfect for agencies managing clients or businesses wanting a fully branded experience."
        },
        {
          question: "What are your SLA guarantees?",
          answer: "Enterprise SLA includes: (1) 99.9% uptime guarantee, (2) <100ms response time, (3) 1-hour response for critical support issues, (4) Scheduled maintenance windows, (5) Financial credits for downtime. Custom SLAs available."
        },
        {
          question: "Can I get a dedicated server or instance?",
          answer: "Enterprise customers can request dedicated infrastructure for enhanced security and compliance. This includes isolated databases, dedicated compute resources, and custom data residency (EU, US, Asia-Pacific, etc.)."
        },
        {
          question: "Do you support custom integrations?",
          answer: "Yes! Enterprise plans include custom integration development. We can build connectors to your CRM, ERP, ticketing systems, or proprietary software. Contact our team to discuss your requirements."
        }
      ]
    },
    {
      category: "Security & Compliance",
      questions: [
        {
          question: "Is my data secure?",
          answer: "Yes! We use industry-standard encryption (TLS 1.3 for data in transit, AES-256 for data at rest), role-based access controls, and regular security audits. All data is stored in SOC 2 compliant data centers."
        },
        {
          question: "Are you GDPR compliant?",
          answer: "Yes! We're fully GDPR compliant. You can export or delete customer data at any time, and we provide data processing agreements (DPA) for Enterprise customers."
        },
        {
          question: "Where is my data stored?",
          answer: "Data is stored in secure AWS data centers in the US (us-east-1) by default. Enterprise customers can request data residency in EU regions for GDPR compliance."
        },
        {
          question: "Can I export my data?",
          answer: "Yes! Export conversations in JSON or CSV format at any time. Use our API for automated backups. All plans include full data export capabilities."
        }
      ]
    },
    {
      category: "Troubleshooting & Technical",
      questions: [
        {
          question: "Why aren't my messages sending?",
          answer: "Common causes: (1) Invalid channel credentials—verify API keys in Settings, (2) Message limit reached—check your plan usage, (3) Provider issues—check status.alacartechat.com, (4) Invalid recipient—verify phone number/email format, (5) Template required—WhatsApp requires templates for initial messages."
        },
        {
          question: "Messages aren't appearing in my inbox. Why?",
          answer: "Troubleshooting steps: (1) Check webhook configuration for the channel, (2) Verify permissions haven't been revoked (Facebook/Instagram), (3) Check spam/filter rules, (4) Confirm sync is running (Settings → Channels), (5) Test with a manual sync, (6) Contact support if issue persists."
        },
        {
          question: "How do I recover a deleted conversation?",
          answer: "Deleted conversations are moved to 'Trash' for 30 days. Go to Conversations → View Trash → Restore. After 30 days, conversations are permanently deleted and cannot be recovered. Export important conversations regularly."
        },
        {
          question: "Why is my email sync so slow?",
          answer: "Email syncs every 5 minutes automatically. For faster sync: (1) Use OAuth2 instead of IMAP (Gmail/Outlook), (2) Reduce folder count—sync only Inbox and Sent, (3) Check your email provider's rate limits, (4) Verify IMAP credentials are valid, (5) Clear sync errors in Settings → Email."
        },
        {
          question: "Can I increase my API rate limits?",
          answer: "Default limits: 100 requests/minute for Professional, 500 for Enterprise. To increase: (1) Upgrade to Enterprise, (2) Contact support with your use case, (3) We'll review and adjust limits accordingly. Rate limits prevent abuse and ensure platform stability."
        },
        {
          question: "How do I report a bug?",
          answer: "Report bugs via: (1) In-app chat widget, (2) Email: support@alacartechat.com, (3) Include screenshots, error messages, and steps to reproduce. Critical bugs receive priority attention within 1 hour (Enterprise) or 24 hours (other plans)."
        }
      ]
    },
    {
      category: "Technical Support",
      questions: [
        {
          question: "What support do you offer?",
          answer: "Free plan includes community support (help center + forums). Starter includes email support (48h response). Professional gets priority email support (24h response). Enterprise includes 24/7 phone + chat support with a dedicated account manager."
        },
        {
          question: "Do you offer training or onboarding?",
          answer: "Yes! All paid plans include access to our training videos and documentation. Professional and Enterprise plans include personalized onboarding sessions and ongoing training webinars."
        },
        {
          question: "What if I need help migrating from another platform?",
          answer: "We offer migration assistance! Contact our team, and we'll help you import your contacts, templates, and conversation history. Enterprise customers get dedicated migration support."
        }
      ]
    }
  ];

  // Flatten all questions for FAQ schema
  const allQuestions = faqCategories.flatMap(cat => cat.questions);

  return (
    <>
      <SEOHead 
        title="FAQ - À La Carte Chat"
        description="Frequently asked questions about À La Carte Chat. Learn about features, pricing, integrations, security, and support for our unified business messaging platform."
        keywords={[
          'unified inbox FAQ',
          'WhatsApp Business API questions',
          'messaging platform help',
          'multi-channel messaging FAQ',
          'customer service software questions',
          'business messaging support',
        ]}
        canonical="/faq"
      />
      <StructuredData 
        type="FAQPage" 
        data={{ questions: allQuestions }} 
      />
      <StructuredData 
        type="BreadcrumbList" 
        data={{
          items: [
            { name: 'Home', url: '/' },
            { name: 'FAQ', url: '/faq' }
          ]
        }} 
      />
      
      <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6 text-center bg-gradient-to-b from-background to-card">
        <div className="max-w-[1200px] mx-auto">
          <MessageSquare className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 text-foreground">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-[700px] mx-auto">
            Everything you need to know about À La Carte Chat
          </p>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-12 px-6">
        <div className="max-w-[900px] mx-auto">
          {faqCategories.map((category, idx) => (
            <div key={idx} className="mb-12">
              <h2 className="text-3xl font-bold mb-6 text-foreground">{category.category}</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {category.questions.map((item, qIdx) => (
                  <AccordionItem key={qIdx} value={`${idx}-${qIdx}`} className="bg-card rounded-lg px-6 border">
                    <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-card text-center">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-foreground">Still Have Questions?</h2>
          <p className="text-lg mb-8 text-muted-foreground">
            Our team is here to help you get started with À La Carte Chat
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate("/signup")} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8 py-6">
              Start Free Trial
            </Button>
            <Button onClick={() => navigate("/guides")} variant="outline" className="rounded-full font-bold px-8 py-6">
              Read Our Guides
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-11 px-6 text-center border-t">
        <p className="text-muted-foreground mb-4">© 2025 À La Carte Chat — All rights reserved.</p>
        <div className="flex justify-center gap-6 flex-wrap text-sm text-muted-foreground mb-4">
          <button onClick={() => navigate('/features')} className="hover:text-primary transition-colors">Features</button>
          <button onClick={() => navigate('/why-us')} className="hover:text-primary transition-colors">Why Us</button>
          <button onClick={() => navigate('/pricing')} className="hover:text-primary transition-colors">Pricing</button>
          <button onClick={() => navigate('/faq')} className="hover:text-primary transition-colors">FAQ</button>
          <button onClick={() => navigate('/guides')} className="hover:text-primary transition-colors">Guides</button>
          <button onClick={() => navigate('/privacy')} className="hover:text-primary transition-colors">Privacy</button>
          <button onClick={() => navigate('/terms')} className="hover:text-primary transition-colors">Terms</button>
        </div>
        <p className="text-sm text-muted-foreground">À La Carte Chat is a product of À La Carte SaaS</p>
      </footer>
    </div>
    </>
  );
};

export default FAQ;