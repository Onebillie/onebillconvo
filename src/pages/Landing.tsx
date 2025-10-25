import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Mail, Phone, Instagram, Facebook, Bot, Users, BarChart3, Lock, Zap, Globe, CheckCircle2, Clock, Shield, Workflow, FileText, Calendar, Bell, Search, Settings } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicHeader } from "@/components/PublicHeader";
const Landing = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const features = [{
    icon: MessageSquare,
    title: "Unified Inbox",
    description: "All your customer conversations in one place. No more switching between apps or missing important messages.",
    benefits: ["Single view for all channels", "Smart conversation threading", "Real-time message sync", "Collision detection prevents duplicate replies"]
  }, {
    icon: Bot,
    title: "AI Assistant",
    description: "Train your own AI to handle common queries, route conversations, and provide instant responses 24/7.",
    benefits: ["Natural language understanding", "Custom training on your FAQs", "Human-in-the-loop approval", "Multi-language support"]
  }, {
    icon: Users,
    title: "Team Collaboration",
    description: "Built for teams of any size. Assign conversations, share notes, and collaborate seamlessly.",
    benefits: ["Conversation assignment", "Internal notes & mentions", "Role-based permissions", "Team performance metrics"]
  }, {
    icon: Workflow,
    title: "Automation & Workflows",
    description: "Set up smart automations to route, categorize, and respond to messages automatically.",
    benefits: ["Auto-assign by channel or topic", "Triggered responses", "SLA monitoring", "Smart routing rules"]
  }, {
    icon: Phone,
    title: "WhatsApp Business API",
    description: "Official WhatsApp Business API integration with template management and bulk messaging.",
    benefits: ["Verified business account", "Template library", "Bulk messaging campaigns", "Rich media support"]
  }, {
    icon: Mail,
    title: "Email Integration",
    description: "Connect unlimited email accounts with full IMAP/SMTP support and shared inbox capabilities.",
    benefits: ["Multiple account support", "Two-way sync", "Email templates", "Threading & search"]
  }, {
    icon: Phone,
    title: "SMS Messaging",
    description: "Send and receive SMS messages with automatic country routing and delivery tracking.",
    benefits: ["Global coverage", "Delivery receipts", "Cost calculator", "Bulk SMS campaigns"]
  }, {
    icon: Instagram,
    title: "Instagram DMs",
    description: "Manage Instagram Direct Messages from your unified inbox with media support.",
    benefits: ["Media handling", "Story replies", "Quick replies", "Auto-sync conversations"]
  }, {
    icon: Facebook,
    title: "Facebook Messenger",
    description: "Connect Facebook Pages to handle Messenger conversations alongside other channels.",
    benefits: ["Page management", "Media attachments", "Quick responses", "Automated greetings"]
  }, {
    icon: Globe,
    title: "Website Widget",
    description: "Embeddable chat widget for your website with customizable branding and AI support.",
    benefits: ["Custom branding", "Pre-chat forms", "AI-powered triage", "Easy integration"]
  }, {
    icon: FileText,
    title: "Templates & Canned Responses",
    description: "Create reusable message templates and quick replies to respond faster.",
    benefits: ["Unlimited templates", "Variable placeholders", "Media attachments", "Team sharing"]
  }, {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description: "Track team performance, response times, and customer satisfaction metrics.",
    benefits: ["Response time tracking", "Team performance", "Message volume trends", "Export capabilities"]
  }, {
    icon: Calendar,
    title: "Tasks & Reminders",
    description: "Never miss a follow-up with built-in task management and calendar integration.",
    benefits: ["Task assignment", "Due date reminders", "Calendar sync", "Priority flagging"]
  }, {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get notified on your terms with customizable notification rules and preferences.",
    benefits: ["Push notifications", "Email digests", "Custom rules", "Do not disturb"]
  }, {
    icon: Search,
    title: "Advanced Search",
    description: "Find any message instantly with powerful search across all channels and time periods.",
    benefits: ["Full-text search", "Advanced filters", "Date ranges", "Export results"]
  }, {
    icon: Lock,
    title: "Security & Privacy",
    description: "Enterprise-grade security with GDPR compliance and data encryption.",
    benefits: ["End-to-end encryption", "GDPR compliant", "Role-based access", "Audit logs"]
  }, {
    icon: Zap,
    title: "Developer API",
    description: "Full REST API access to integrate with your existing tools and workflows.",
    benefits: ["RESTful API", "Webhooks", "SSO support", "Comprehensive docs"]
  }, {
    icon: Settings,
    title: "Customization",
    description: "Tailor the platform to your needs with custom statuses, tags, and workflows.",
    benefits: ["Custom fields", "Status management", "Tag system", "Branding options"]
  }];
  const channels = [{
    name: "WhatsApp Business",
    color: "bg-[#25D366]",
    icon: MessageSquare
  }, {
    name: "Email",
    color: "bg-[#e55436]",
    icon: Mail
  }, {
    name: "SMS",
    color: "bg-[#00C389]",
    icon: Phone
  }, {
    name: "Instagram DMs",
    color: "bg-[#F56040]",
    icon: Instagram
  }, {
    name: "Facebook Messenger",
    color: "bg-[#1877F2]",
    icon: Facebook
  }, {
    name: "Website Widget",
    color: "bg-[#6C63FF]",
    icon: Globe
  }];
  return <>
      <SEOHead title="À La Carte Chat - Unified Inbox for Business Messaging" description="Manage WhatsApp, Email, SMS, Instagram, and Facebook messages in one unified inbox. Pay-as-you-go pricing with AI-powered automation. Trusted by 1,000+ businesses worldwide." keywords={["unified inbox", "business messaging platform", "WhatsApp Business API", "multi-channel messaging", "customer service software", "AI chatbot", "email integration", "SMS management", "Instagram DM", "Facebook Messenger", "unified communications", "omnichannel support"]} canonical="/" />
      <StructuredData type="Organization" />
      <StructuredData type="SoftwareApplication" />
      <StructuredData type="BreadcrumbList" data={{
      items: [{
        name: "Home",
        url: "/"
      }]
    }} />

      <div className="min-h-screen bg-background overflow-x-hidden">
        <PublicHeader />

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center text-center px-4 sm:px-6 pt-16 sm:pt-0">
          <div className="mt-8 sm:mt-16 max-w-[1100px] relative z-10">
            <h1 className="text-[clamp(2rem,10vw,8rem)] leading-[0.95] sm:leading-[0.95] font-black tracking-tight uppercase">
              STOP JUGGLING
              <br />
              INBOXES.
              <br />
              START CLOSING
              <br />
              DEALS.
            </h1>
            <p className="mt-4 sm:mt-6 max-w-[760px] mx-auto text-muted-foreground text-sm sm:text-base px-2 md:text-2xl">
              An Unified Team Inbox For All Your Communication Channels With Your Very Own AI ChatBot Ready To Respond
              When Your Team Can't
            </p>
            <Button onClick={() => navigate(user ? "/dashboard" : "/signup")} className="mt-6 sm:mt-7 px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-lg">
              Try Free For 7 Days!
            </Button>
          </div>

          {/* Floating Icons */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {/* WhatsApp - top left */}
            <div className="absolute left-[4%] top-[12%] w-8 sm:w-12 md:w-16 lg:w-20 h-8 sm:h-12 md:h-16 lg:h-20 animate-float-a">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                <circle cx="32" cy="32" r="30" fill="#25D366" />
                <path fill="#fff" d="M45 33c0 7-6 12-13 12-2 0-5-.6-7-1.8L17 45l2.1-7c-1.3-2.1-2.1-4.5-2.1-7 0-7 6-13 13-13s15 6 15 14z" opacity=".95" />
                <path fill="#25D366" d="M27 24c-.6 0-1 .5-1 1 0 7 5 12 12 12 .6 0 1-.4 1-1v-2c0-.6-.4-1-1-1-1 0-2-.2-3-.6l-1-.4-1 .5c-.4.2-.8.1-1-.2l-2-2c-.3-.3-.3-.8-.1-1.1l.6-1c.1-.2.1-.5 0-.7l-1.1-2c-.2-.4-.6-.6-1-.6H27z" />
              </svg>
            </div>

            {/* Email - top right */}
            <div className="absolute right-[4%] top-[16%] w-8 sm:w-12 md:w-16 lg:w-20 h-8 sm:h-12 md:h-16 lg:h-20 animate-float-b">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                <rect x="6" y="14" width="52" height="36" rx="6" fill="#ffffff" stroke="#e55436" strokeWidth="4" />
                <path d="M8 18l24 18L56 18" fill="none" stroke="#e55436" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>

            {/* WhatsApp alt - bottom left */}
            <div className="absolute left-[6%] bottom-[18%] w-10 sm:w-14 md:w-18 lg:w-24 h-10 sm:h-14 md:h-18 lg:h-24 animate-float-c">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                <circle cx="32" cy="32" r="30" fill="#25D366" />
                <path fill="#fff" d="M45 33c0 7-6 12-13 12-2 0-5-.6-7-1.8L17 45l2.1-7c-1.3-2.1-2.1-4.5-2.1-7 0-7 6-13 13-13s15 6 15 14z" opacity=".95" />
              </svg>
            </div>

            {/* Instagram - bottom right */}
            <div className="absolute right-[6%] bottom-[14%] w-10 sm:w-14 md:w-18 lg:w-24 h-10 sm:h-14 md:h-18 lg:h-24 animate-float-d">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                <rect x="10" y="10" width="44" height="44" rx="12" fill="#F56040" />
                <circle cx="32" cy="32" r="10" fill="#fff" />
                <circle cx="44" cy="20" r="4" fill="#fff" />
              </svg>
            </div>

            {/* Facebook - center top */}
            <div className="absolute left-[50%] top-[24%] w-8 sm:w-12 md:w-16 lg:w-20 h-8 sm:h-12 md:h-16 lg:h-20 animate-float-e">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                <circle cx="32" cy="32" r="30" fill="#1877F2" />
                <path d="M36 22h-3c-2.2 0-3 .9-3 3v3h6l-1 6h-5v12h-6V34h-4v-6h4v-4c0-4.4 2.6-8 8-8h4v6z" fill="#fff" />
              </svg>
            </div>

            {/* SMS - center bottom */}
            <div className="absolute right-[44%] bottom-[18%] w-8 sm:w-12 md:w-16 lg:w-20 h-8 sm:h-12 md:h-16 lg:h-20 animate-float-f">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                <rect x="8" y="12" width="48" height="34" rx="8" fill="#00C389" />
                <path d="M22 52l10-6H44" fill="#00C389" />
                <circle cx="22" cy="29" r="3" fill="#fff" />
                <circle cx="32" cy="29" r="3" fill="#fff" />
                <circle cx="42" cy="29" r="3" fill="#fff" />
              </svg>
            </div>

            {/* ChatBot */}
            <div className="absolute left-[14%] top-[26%] w-10 sm:w-14 md:w-18 lg:w-24 h-10 sm:h-14 md:h-18 lg:h-24 animate-float-b">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                <rect x="10" y="18" width="44" height="30" rx="10" fill="#6C63FF" />
                <circle cx="26" cy="33" r="5" fill="#fff" />
                <circle cx="38" cy="33" r="5" fill="#fff" />
                <rect x="28" y="46" width="8" height="6" rx="3" fill="#6C63FF" />
                <rect x="30" y="12" width="4" height="6" rx="2" fill="#6C63FF" />
              </svg>
            </div>
          </div>
        </section>


        {/* Channels Overview */}
        <section className="py-20 px-6 bg-card">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-foreground">All Your Inbox Channels In One Place</h2>
            <p className="text-center text-muted-foreground mb-12 text-lg">
              Connect every communication channel your customers use
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map(channel => <div key={channel.name} className="bg-background rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all">
                  <div className={`${channel.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <channel.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-foreground">{channel.name}</h3>
                </div>)}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 px-6 bg-background">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-foreground">Built for Every Team</h2>
            <p className="text-center text-muted-foreground mb-12 text-lg">
              No matter your industry, we have you covered
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl p-8">
                <h3 className="font-bold text-xl mb-3 text-card-foreground">E-commerce</h3>
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
              
              <div className="bg-card rounded-xl p-8">
                <h3 className="font-bold text-xl mb-3 text-card-foreground">Professional Services</h3>
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
              
              <div className="bg-card rounded-xl p-8">
                <h3 className="font-bold text-xl mb-3 text-card-foreground">Customer Support</h3>
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

        {/* Feature Details Grid */}
        <section className="py-20 px-6">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-foreground">Powerful Features</h2>
            <p className="text-center text-muted-foreground mb-12 text-lg">
              Everything you need to manage customer conversations at scale
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map(feature => <div key={feature.title} className="bg-card rounded-xl p-8 shadow-lg hover:shadow-xl transition-all">
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
                    {feature.benefits.map(benefit => <li key={benefit} className="flex items-start gap-2 text-sm text-card-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>)}
                  </ul>
                </div>)}
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="bg-card py-12 sm:py-16 md:py-20 px-4 sm:px-6">
          <div className="max-w-[1200px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl sm:rounded-2xl bg-[#12b886] text-white p-6 sm:p-8 md:p-11 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">66%</div>
              <div className="text-xs sm:text-sm opacity-95 mt-1 sm:mt-2">Faster response times</div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-[#4dabf7] text-white p-6 sm:p-8 md:p-11 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">3x</div>
              <div className="text-xs sm:text-sm opacity-95 mt-1 sm:mt-2">More conversations handled</div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-[#ff922b] text-white p-6 sm:p-8 md:p-11 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">45%</div>
              <div className="text-xs sm:text-sm opacity-95 mt-1 sm:mt-2">Boost in customer satisfaction</div>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-[#e64980] text-white p-6 sm:p-8 md:p-11 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">6+</div>
              <div className="text-xs sm:text-sm opacity-95 mt-1 sm:mt-2">Channels unified</div>
            </div>
          </div>
        </section>

        {/* Integration Highlights */}
        <section className="py-20 px-6 bg-background">
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

        {/* Steps */}
        <section className="bg-card py-12 sm:py-16 md:py-20 px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-foreground">
            Get started in 5 minutes
          </h2>
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-background rounded-2xl shadow-lg p-6">
              <h4 className="font-bold text-lg mb-2 text-foreground">1. Connect channels</h4>
              <p className="text-muted-foreground">WhatsApp, Email, SMS, Instagram and Facebook in minutes.</p>
            </div>
            <div className="bg-background rounded-2xl shadow-lg p-6">
              <h4 className="font-bold text-lg mb-2 text-foreground">2. Train AI & add team</h4>
              <p className="text-muted-foreground">Import FAQs, set roles and automations. Keep humans in the loop.</p>
            </div>
            <div className="bg-background rounded-2xl shadow-lg p-6">
              <h4 className="font-bold text-lg mb-2 text-foreground">3. Start converting faster</h4>
              <p className="text-muted-foreground">Assign, collaborate and reply 3× faster with tidy workflows.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-[#0e0e10] text-white text-center">
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/signup")} className="rounded-full bg-white text-[#0e0e10] hover:bg-white/90 font-bold px-8 py-6">
                Start Free Trial
              </Button>
              <Button onClick={() => navigate("/pricing")} className="rounded-full bg-white text-[#0e0e10] hover:bg-white/90 font-bold px-8 py-6">
                View Pricing
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-11 px-6 text-center border-t">
          <p className="text-muted-foreground mb-4">© 2025 À La Carte Chat — All rights reserved.
An Al

        </p>
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
    </>;
};
export default Landing;