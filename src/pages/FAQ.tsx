import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquare } from "lucide-react";

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
          answer: "Yes! We offer credit bundles: Small (500 messages - $10), Medium (1,500 messages - $25), and Large (5,000 messages - $75). Credits never expire and can be used across any channel."
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <nav className="max-w-[1200px] mx-auto px-5 py-4 flex items-center gap-7">
          <div className="font-extrabold tracking-tight text-foreground cursor-pointer" onClick={() => navigate("/")}>
            À La Carte Chat
          </div>
          <a href="/#features" className="text-foreground hover:opacity-70 transition-opacity">Features</a>
          <a href="/#pricing" className="text-foreground hover:opacity-70 transition-opacity">Pricing</a>
          <a href="/faq" className="text-foreground hover:opacity-70 transition-opacity">FAQ</a>
          <a href="/guides" className="text-foreground hover:opacity-70 transition-opacity">Guides</a>
          <div className="flex-1" />
          <Button onClick={() => navigate(user ? "/dashboard" : "/auth")} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6">
            {user ? "Dashboard" : "Login"}
          </Button>
        </nav>
      </header>

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
        <p className="text-muted-foreground mb-2">© 2025 À La Carte Chat — All rights reserved.</p>
        <p className="text-sm text-muted-foreground">À La Carte Chat is a product of À La Carte SaaS</p>
      </footer>
    </div>
  );
};

export default FAQ;
