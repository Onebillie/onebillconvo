import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Mail, Phone, Instagram, Facebook, Bot, Users, BarChart3, Lock, Zap, Globe, CheckCircle2, Clock, Shield, Workflow, FileText, Calendar, Bell, Search, Settings } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicHeader } from "@/components/PublicHeader";

const Features = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: MessageSquare,
      title: "Unified Inbox",
      description: "All your customer conversations in one place. No more switching between apps or missing important messages.",
      benefits: [
        "Single view for all channels",
        "Smart conversation threading",
        "Real-time message sync",
        "Collision detection prevents duplicate replies"
      ]
    },
    {
      icon: Bot,
      title: "AI Assistant",
      description: "Train your own AI to handle common queries, route conversations, and provide instant responses 24/7.",
      benefits: [
        "Natural language understanding",
        "Custom training on your FAQs",
        "Human-in-the-loop approval",
        "Multi-language support"
      ]
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Built for teams of any size. Assign conversations, share notes, and collaborate seamlessly.",
      benefits: [
        "Conversation assignment",
        "Internal notes & mentions",
        "Role-based permissions",
        "Team performance metrics"
      ]
    },
    {
      icon: Workflow,
      title: "Automation & Workflows",
      description: "Set up smart automations to route, categorize, and respond to messages automatically.",
      benefits: [
        "Auto-assign by channel or topic",
        "Triggered responses",
        "SLA monitoring",
        "Smart routing rules"
      ]
    },
    {
      icon: Phone,
      title: "WhatsApp Business API",
      description: "Official WhatsApp Business API integration with template management and bulk messaging.",
      benefits: [
        "Verified business account",
        "Template library",
        "Bulk messaging campaigns",
        "Rich media support"
      ]
    },
    {
      icon: Mail,
      title: "Email Integration",
      description: "Connect unlimited email accounts with full IMAP/SMTP support and shared inbox capabilities.",
      benefits: [
        "Multiple account support",
        "Two-way sync",
        "Email templates",
        "Threading & search"
      ]
    },
    {
      icon: Phone,
      title: "SMS Messaging",
      description: "Send and receive SMS messages with automatic country routing and delivery tracking.",
      benefits: [
        "Global coverage",
        "Delivery receipts",
        "Cost calculator",
        "Bulk SMS campaigns"
      ]
    },
    {
      icon: Instagram,
      title: "Instagram DMs",
      description: "Manage Instagram Direct Messages from your unified inbox with media support.",
      benefits: [
        "Media handling",
        "Story replies",
        "Quick replies",
        "Auto-sync conversations"
      ]
    },
    {
      icon: Facebook,
      title: "Facebook Messenger",
      description: "Connect Facebook Pages to handle Messenger conversations alongside other channels.",
      benefits: [
        "Page management",
        "Media attachments",
        "Quick responses",
        "Automated greetings"
      ]
    },
    {
      icon: Globe,
      title: "Website Widget",
      description: "Embeddable chat widget for your website with customizable branding and AI support.",
      benefits: [
        "Custom branding",
        "Pre-chat forms",
        "AI-powered triage",
        "Easy integration"
      ]
    },
    {
      icon: FileText,
      title: "Templates & Canned Responses",
      description: "Create reusable message templates and quick replies to respond faster.",
      benefits: [
        "Unlimited templates",
        "Variable placeholders",
        "Media attachments",
        "Team sharing"
      ]
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      description: "Track team performance, response times, and customer satisfaction metrics.",
      benefits: [
        "Response time tracking",
        "Team performance",
        "Message volume trends",
        "Export capabilities"
      ]
    },
    {
      icon: Calendar,
      title: "Tasks & Reminders",
      description: "Never miss a follow-up with built-in task management and calendar integration.",
      benefits: [
        "Task assignment",
        "Due date reminders",
        "Calendar sync",
        "Priority flagging"
      ]
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Get notified on your terms with customizable notification rules and preferences.",
      benefits: [
        "Push notifications",
        "Email digests",
        "Custom rules",
        "Do not disturb"
      ]
    },
    {
      icon: Search,
      title: "Advanced Search",
      description: "Find any message instantly with powerful search across all channels and time periods.",
      benefits: [
        "Full-text search",
        "Advanced filters",
        "Date ranges",
        "Export results"
      ]
    },
    {
      icon: Lock,
      title: "Security & Privacy",
      description: "Enterprise-grade security with GDPR compliance and data encryption.",
      benefits: [
        "End-to-end encryption",
        "GDPR compliant",
        "Role-based access",
        "Audit logs"
      ]
    },
    {
      icon: Zap,
      title: "Developer API",
      description: "Full REST API access to integrate with your existing tools and workflows.",
      benefits: [
        "RESTful API",
        "Webhooks",
        "SSO support",
        "Comprehensive docs"
      ]
    },
    {
      icon: Settings,
      title: "Customization",
      description: "Tailor the platform to your needs with custom statuses, tags, and workflows.",
      benefits: [
        "Custom fields",
        "Status management",
        "Tag system",
        "Branding options"
      ]
    }
  ];

  const channels = [
    { name: "WhatsApp Business", color: "bg-[#25D366]", icon: MessageSquare },
    { name: "Email", color: "bg-[#e55436]", icon: Mail },
    { name: "SMS", color: "bg-[#00C389]", icon: Phone },
    { name: "Instagram DMs", color: "bg-[#F56040]", icon: Instagram },
    { name: "Facebook Messenger", color: "bg-[#1877F2]", icon: Facebook },
    { name: "Website Widget", color: "bg-[#6C63FF]", icon: Globe }
  ];

  return (
    <>
      <SEOHead 
        title="Features - À La Carte Chat"
        description="Explore all features of À La Carte Chat: Unified Inbox, AI Assistant, Multi-channel messaging, Team collaboration, Analytics, and more. Everything you need to manage customer conversations."
        keywords={[
          'unified inbox features',
          'multi-channel messaging',
          'WhatsApp Business API features',
          'AI chatbot features',
          'customer service automation',
          'team collaboration tools',
          'message templates',
          'real-time notifications',
          'conversation management',
          'business messaging features',
        ]}
        canonical="/features"
      />
      <StructuredData 
        type="BreadcrumbList" 
        data={{
          items: [
            { name: 'Home', url: '/' },
            { name: 'Features', url: '/features' }
          ]
        }} 
      />
      <StructuredData 
        type="WebPage" 
        data={{
          name: 'Features - À La Carte Chat',
          description: 'Comprehensive features for managing customer conversations across all channels',
          url: 'https://alacartechat.com/features'
        }} 
      />
      
      <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 text-center bg-gradient-to-b from-background to-card">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 text-foreground">
            Everything You Need<br />to Delight Customers
          </h1>
          <p className="text-xl text-muted-foreground max-w-[700px] mx-auto mb-8">
            A complete platform for managing customer conversations across all channels. 
            No more juggling apps or missing messages.
          </p>
          <Button onClick={() => navigate("/signup")} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8 py-6 text-lg">
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Channels Overview */}
      <section className="py-20 px-6 bg-card">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">All Your Channels</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Connect every communication channel your customers use
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel) => (
              <div key={channel.name} className="bg-background rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all hover-scale">
                <div className={`${channel.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <channel.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-foreground">{channel.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Details Grid */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">Powerful Features</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Everything you need to manage customer conversations at scale
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-card rounded-xl p-8 shadow-lg hover:shadow-xl transition-all animate-fade-in">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 text-card-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                  </div>
                </div>
                <ul className="space-y-2 ml-16">
                  {feature.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm text-card-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-6 bg-card">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-foreground">Built for Every Team</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            No matter your industry, we have you covered
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-background rounded-xl p-8">
              <h3 className="font-bold text-xl mb-3 text-foreground">E-commerce</h3>
              <p className="text-muted-foreground mb-4">
                Handle order inquiries, shipping updates, and returns across WhatsApp, email, and social media.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-card-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Faster response times</span>
                </li>
                <li className="flex items-center gap-2 text-card-foreground">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span>Increased conversion rates</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-background rounded-xl p-8">
              <h3 className="font-bold text-xl mb-3 text-foreground">Professional Services</h3>
              <p className="text-muted-foreground mb-4">
                Manage client communications, appointments, and follow-ups with task management integration.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-card-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Appointment scheduling</span>
                </li>
                <li className="flex items-center gap-2 text-card-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Secure client data</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-background rounded-xl p-8">
              <h3 className="font-bold text-xl mb-3 text-foreground">Customer Support</h3>
              <p className="text-muted-foreground mb-4">
                Scale your support team with AI assistance, automation, and comprehensive reporting.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-card-foreground">
                  <Bot className="w-4 h-4 text-primary" />
                  <span>24/7 AI coverage</span>
                </li>
                <li className="flex items-center gap-2 text-card-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Team collaboration</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Highlights */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-foreground">Seamless Integrations</h2>
          <p className="text-muted-foreground mb-12 text-lg">
            Connect with your existing tools and workflows
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-xl p-6">
              <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold mb-2 text-card-foreground">REST API</h3>
              <p className="text-sm text-muted-foreground">Full programmatic access</p>
            </div>
            <div className="bg-card rounded-xl p-6">
              <Bell className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold mb-2 text-card-foreground">Webhooks</h3>
              <p className="text-sm text-muted-foreground">Real-time event notifications</p>
            </div>
            <div className="bg-card rounded-xl p-6">
              <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold mb-2 text-card-foreground">SSO</h3>
              <p className="text-sm text-muted-foreground">Single sign-on support</p>
            </div>
            <div className="bg-card rounded-xl p-6">
              <Calendar className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold mb-2 text-card-foreground">Calendar Sync</h3>
              <p className="text-sm text-muted-foreground">Google Calendar integration</p>
            </div>
          </div>
        </div>
      </section>

          {/* Detailed Pricing Breakdown */}
          <div className="max-w-5xl mx-auto mt-16 text-left">
            <h3 className="text-2xl font-bold mb-6 text-foreground text-center">Detailed pricing breakdown</h3>

            {/* Features & Costs Table */}
            <div className="bg-card rounded-xl shadow-lg p-6 mb-8">
              <h4 className="font-bold text-lg mb-4 text-card-foreground">Platform features & costs</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 text-card-foreground font-semibold">Feature</th>
                      <th className="text-left py-3 text-card-foreground font-semibold">Free</th>
                      <th className="text-left py-3 text-card-foreground font-semibold">Starter</th>
                      <th className="text-left py-3 text-card-foreground font-semibold">Professional</th>
                      <th className="text-left py-3 text-card-foreground font-semibold">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-3">Team members</td>
                      <td className="py-3">1</td>
                      <td className="py-3">2 (+$10/extra)</td>
                      <td className="py-3">10 (+$7/extra)</td>
                      <td className="py-3">Unlimited</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3">100</td>
                      <td className="py-3">1,000</td>
                      <td className="py-3">10,000</td>
                      <td className="py-3">Unlimited</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3">Message templates</td>
                      <td className="py-3">5 basic</td>
                      <td className="py-3">20 basic</td>
                      <td className="py-3">Unlimited</td>
                      <td className="py-3">Unlimited</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3">AI assistant responses</td>
                      <td className="py-3">-</td>
                      <td className="py-3">-</td>
                      <td className="py-3">1,000/mo</td>
                      <td className="py-3">Unlimited</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3">API calls/month</td>
                      <td className="py-3">-</td>
                      <td className="py-3">-</td>
                      <td className="py-3">10,000</td>
                      <td className="py-3">Unlimited</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3">Email integration</td>
                      <td className="py-3">✓</td>
                      <td className="py-3">✓</td>
                      <td className="py-3">✓</td>
                      <td className="py-3">✓</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3">SMS integration</td>
                      <td className="py-3">-</td>
                      <td className="py-3">✓</td>
                      <td className="py-3">✓</td>
                      <td className="py-3">✓</td>
                    </tr>
                    <tr>
                      <td className="py-3">Support level</td>
                      <td className="py-3">Community</td>
                      <td className="py-3">Email</td>
                      <td className="py-3">Priority</td>
                      <td className="py-3">24/7 + Manager</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Overage & Add-on Costs */}
            <div className="bg-card rounded-xl shadow-lg p-6 mb-8">
              <h4 className="font-bold text-lg mb-4 text-card-foreground">Overage & add-on pricing</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-card-foreground mb-2">Message overages:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Free plan: $0.10 per message</li>
                    <li>• Starter plan: $0.015 per message (or $15/1,000 bundle)</li>
                    <li>• Professional plan: $0.006 per message (or $30/5,000 bundle)</li>
                    <li>• Enterprise: Unlimited included</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-card-foreground mb-2">Extra team members:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Starter: $10/month per user</li>
                    <li>• Professional: $7/month per user</li>
                    <li>• Enterprise: Unlimited included</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-card-foreground mb-2">AI assistant:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Professional: $0.05 per response after 1,000</li>
                    <li>• Enterprise: Unlimited included</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-card-foreground mb-2">API access:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Professional: $0.002 per call after 10,000</li>
                    <li>• Enterprise: Unlimited included</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Third-Party Service Provider Costs - IMPORTANT DISCLAIMER */}
            <div className="bg-accent/10 border-2 border-accent rounded-xl shadow-lg p-6 mb-8">
              <h4 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
                <span className="text-accent">⚠️</span> Third-party service provider costs
              </h4>
              <div className="space-y-4 text-sm text-foreground">
                <p className="font-semibold">
                  Important: Our platform fees cover access to the À La Carte Chat platform only. You must pay
                  separately to third-party service providers for message delivery costs.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-background/50 rounded-lg p-4">
                    <p className="font-semibold mb-2">WhatsApp Business API (Meta):</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Business-initiated: $0.005-$0.15/msg (varies by country)</li>
                      <li>• User-initiated (24hr window): Free</li>
                      <li>• Template messages: Varies by country</li>
                      <li>• You pay Meta directly via their billing</li>
                    </ul>
                  </div>

                  <div className="bg-background/50 rounded-lg p-4">
                    <p className="font-semibold mb-2">SMS (Twilio/Similar):</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• US/Canada: ~$0.0075/msg</li>
                      <li>• International: $0.05-$0.50/msg</li>
                      <li>• Short codes: Additional fees apply</li>
                      <li>• You pay your SMS provider directly</li>
                    </ul>
                  </div>

                  <div className="bg-background/50 rounded-lg p-4">
                    <p className="font-semibold mb-2">Email (Your SMTP provider):</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Usually free or very low cost</li>
                      <li>• Gmail/Outlook: Included with account</li>
                      <li>• SendGrid/Mailgun: Pay per volume</li>
                      <li>• You manage your own email accounts</li>
                    </ul>
                  </div>

                  <div className="bg-background/50 rounded-lg p-4">
                    <p className="font-semibold mb-2">
                      All prices in USD. Billing is monthly. You can upgrade, downgrade, or cancel anytime. 7-day free
                      trial available on all paid plans. Additional costs from the individual service provider apply.
                      For some integrations you may need to updrade yourservice with the third party provider. 
                    </p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Currently free for most use cases</li>
                      <li>• Subject to Meta's policies</li>
                      <li>• May incur costs for ads/promotions</li>
                      <li>• Check Meta's current pricing</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-accent/20 rounded-lg p-4 mt-4">
                  <p className="font-semibold text-foreground mb-2">💡 Cost estimate example:</p>
                  <p className="text-muted-foreground">
                    A business on the Starter plan ($29/mo) sending 1,000 WhatsApp messages might pay:
                  </p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• À La Carte Chat platform: $29/month</li>
                    <li>• WhatsApp (Meta): ~$50-$150/month (depending on message types & countries)</li>
                    <li>
                      • <strong className="text-foreground">Total: $79-$179/month</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Extra Features Costs */}
            <div className="bg-card rounded-xl shadow-lg p-6">
              <h4 className="font-bold text-lg mb-4 text-card-foreground">Premium features & extras</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-card-foreground mb-2">Advanced features:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Custom white-label branding: Contact sales</li>
                    <li>• Dedicated infrastructure: Contact sales</li>
                    <li>• Custom SLA agreements: Contact sales</li>
                    <li>• On-premise deployment: Contact sales</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-card-foreground mb-2">Professional services:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Implementation support: $500-$2,000</li>
                    <li>• Custom integration development: $1,500+</li>
                    <li>• Team training sessions: $300/session</li>
                    <li>• Data migration assistance: $500+</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Note */}
          <div className="max-w-3xl mx-auto mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All prices in USD. Billing is monthly. You can upgrade, downgrade, or cancel anytime. 7-day free trial
              available on all paid plans. No credit card required for Free plan.
            </p>
          </div>
        </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-[#0e0e10] text-white text-center">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join 1,000+ businesses using À La Carte Chat to manage customer conversations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate("/signup")} className="rounded-full bg-white text-[#0e0e10] hover:bg-white/90 font-bold px-8 py-6">
              Start Free Trial
            </Button>
            <Button onClick={() => navigate("/pricing")} variant="outline" className="rounded-full border-white text-white hover:bg-white/10 font-bold px-8 py-6">
              View Pricing
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

export default Features;