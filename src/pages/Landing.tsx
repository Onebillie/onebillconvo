import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Mail, Bell, Calendar, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
const Landing = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  useEffect(() => {
    // SEO Meta Tags
    document.title = "À La Carte Chat - WhatsApp Business API & Combined Inbox Platform | Manage All Customer Messages";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Unified inbox for WhatsApp Business API, Email, and SMS. Multi-agent collaboration, AI chatbot, full API access. Facebook & Instagram coming Q1 2026. Install as PWA on any device.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Manage WhatsApp Business API, email, and all customer messages in one aggregated inbox. Meta Business integration for multi-agent teams. Talk to your customers in one place with AI-powered responses.';
      document.head.appendChild(meta);
    }

    // Additional SEO meta tags
    const keywords = document.querySelector('meta[name="keywords"]');
    if (keywords) {
      keywords.setAttribute('content', 'WhatsApp Business API, Meta Business, combined inbox, aggregated inbox, manage messages, customer messaging platform, WhatsApp business management, unified inbox, multi-agent support, AI chatbot');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'WhatsApp Business API, Meta Business, combined inbox, aggregated inbox, manage messages, customer messaging platform, WhatsApp business management, unified inbox, multi-agent support, AI chatbot';
      document.head.appendChild(meta);
    }

    // Open Graph tags
    const ogTags = [{
      property: 'og:title',
      content: 'À La Carte Chat - WhatsApp Business API & Combined Inbox Platform'
    }, {
      property: 'og:description',
      content: 'Manage all customer messages in one aggregated inbox. WhatsApp Business API, email integration, and AI-powered responses.'
    }, {
      property: 'og:type',
      content: 'website'
    }, {
      property: 'og:image',
      content: `${window.location.origin}/favicon-192x192.png`
    }];
    ogTags.forEach(tag => {
      let element = document.querySelector(`meta[property="${tag.property}"]`);
      if (element) {
        element.setAttribute('content', tag.content);
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute('property', tag.property);
        meta.content = tag.content;
        document.head.appendChild(meta);
      }
    });

    // Structured Data (JSON-LD)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "À La Carte Chat",
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "Offer",
        "price": "29",
        "priceCurrency": "USD"
      },
      "description": "Combined inbox platform for managing WhatsApp Business API, email, and all customer messages. Meta Business integration with AI chatbot and multi-agent support.",
      "operatingSystem": "Web Browser",
      "featureList": ["WhatsApp Business API Integration", "Meta Business Platform", "Combined Inbox", "Aggregated Inbox", "Email Integration", "AI Chatbot", "Multi-Agent Support", "Unified Customer Messaging"]
    };
    let scriptTag = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script') as HTMLScriptElement;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);
  }, []);
  const features = [{
    icon: MessageSquare,
    title: "WhatsApp Business API",
    description: "Official Meta verification • Send 100,000+ messages/month • Template management with approval tracking • Button click analytics • Unlimited receiving",
    status: "active"
  }, {
    icon: Mail,
    title: "Email Integration",
    description: "Connect unlimited Gmail, Outlook, custom domains • OAuth 2.0 security • Auto-sync every 5 min • Rich HTML support • Attachment handling",
    status: "active"
  }, {
    icon: MessageSquare,
    title: "SMS Messaging",
    description: "Global SMS via Twilio • Reach 200+ countries • Automatic cost calculator • Conversation threading • Delivery tracking",
    status: "active"
  }, {
    icon: MessageSquare,
    title: "Facebook Messenger",
    description: "Facebook Page integration • Auto-sync messages • Automated responses • File sharing • Typing indicators",
    status: "coming_soon"
  }, {
    icon: MessageSquare,
    title: "Instagram DMs",
    description: "Business account integration • Story reply handling • Media support • Auto-assignment to agents",
    status: "coming_soon"
  }, {
    icon: Users,
    title: "Multi-Agent Collaboration",
    description: "10 agents (Professional) or unlimited (Enterprise) • Smart assignment rules • Workload balancing • Performance metrics • Internal notes",
    status: "active"
  }, {
    icon: MessageSquare,
    title: "AI Assistant That Learns",
    description: "Train on YOUR FAQs and docs • Auto-respond instantly or queue for approval • Works 24/7 or business hours • Supports 50+ languages • Custom personality",
    status: "active"
  }, {
    icon: MessageSquare,
    title: "Full REST API",
    description: "Sync CRM data bidirectionally • Send/receive programmatically • Webhook notifications • 1000 req/hour (Pro) • OpenAPI documentation",
    status: "active"
  }, {
    icon: MessageSquare,
    title: "Embeddable Chat Widget",
    description: "Add live chat to ANY website • Match your brand colors • SSO login • Mobile responsive • Works with WordPress, Shopify, custom sites",
    status: "active"
  }, {
    icon: MessageSquare,
    title: "Voice Notes & All Files",
    description: "Voice recordings • Images • PDFs • Videos • Documents up to 100MB • Automatic malware scanning • Cloud storage",
    status: "active"
  }, {
    icon: Calendar,
    title: "Task & Calendar Automation",
    description: "Auto-create tasks from statuses • Export to Google Calendar • Outlook sync • ICS download • Follow-up reminders",
    status: "active"
  }, {
    icon: Bell,
    title: "Install as Mobile App (PWA)",
    description: "Works on iPhone, Android, Desktop • Add to home screen • Push notifications • Works offline • No app store downloads",
    status: "active"
  }];
  const pricingTiers = [{
    name: "Free",
    price: "Free",
    period: "forever",
    description: "Get started",
    features: ["1 team member", "100 WhatsApp messages/month", "Unlimited receiving", "Email integration", "Community support"],
    cta: "Start Free",
    highlighted: false,
    tier: "free"
  }, {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "per seat",
    features: ["2 team members", "1,000 messages/month", "All channels", "Email support", "Basic templates"],
    cta: "Subscribe",
    highlighted: true,
    tier: "starter"
  }, {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "per seat",
    features: ["10 team members", "10,000 messages/month", "AI assistant (1,000 responses)", "API access", "Priority support"],
    cta: "Subscribe",
    highlighted: false,
    tier: "professional"
  }, {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "per seat",
    features: ["Unlimited everything", "AI assistant (unlimited)", "Dedicated support", "Custom integrations", "Account manager"],
    cta: "Contact Sales",
    highlighted: false,
    tier: "enterprise"
  }];
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">À La Carte Chat</span>
          </div>
      <div className="flex items-center gap-2">
            {user ? <>
                <Button onClick={() => navigate("/app/dashboard")} variant="outline">
                  Dashboard
                </Button>
                <Button onClick={() => navigate("/auth")} variant="ghost">
                  Log Out
                </Button>
              </> : <Button onClick={() => navigate("/auth")}>
                Sign In
              </Button>}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-rainbow bg-clip-text text-transparent">
                Stop Juggling Apps. Start Closing Deals.
              </h1>
              <p className="text-xl md:text-2xl mb-4 text-foreground font-semibold">
                WhatsApp Business API • Email • SMS • AI Chatbot <span className="text-muted-foreground text-lg">• Facebook & Instagram (Q1 2026)</span>
              </p>
              <p className="text-lg mb-8 text-muted-foreground leading-relaxed">
                <strong>Your customers message you everywhere.</strong> WhatsApp for quick questions, email for quotes, SMS for confirmations, Instagram for inquiries. You're drowning in tabs, missing messages, and losing sales.
              </p>
              <p className="text-lg mb-8 text-muted-foreground leading-relaxed">
                <strong>À La Carte Chat fixes this.</strong> Every channel flows into ONE unified inbox. Your team sees every conversation, AI handles routine questions 24/7, and you never miss another opportunity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => navigate("/signup")} className="text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                  Start Free - No Credit Card
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-2xl">
                  See How It Works
                </Button>
              </div>
              
            </div>
            <div className="relative">
              <div className="rounded-2xl shadow-2xl w-full bg-gradient-rainbow-vertical border-2 border-primary/30 p-8 aspect-video flex items-center justify-center backdrop-blur-sm bg-opacity-10">
                <div className="text-center space-y-4 bg-background/95 p-6 rounded-xl">
                  <MessageSquare className="w-20 h-20 text-primary mx-auto" />
                  <p className="text-2xl font-semibold text-foreground">Unified Inbox Dashboard</p>
                  <p className="text-muted-foreground">All channels in one place</p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-card border-2 border-primary rounded-xl p-4 shadow-xl">
                <p className="text-sm font-semibold text-primary">↑ 127% faster response time</p>
              </div>
              <div className="absolute -top-6 -right-6 bg-card border-2 border-green-500 rounded-xl p-4 shadow-xl">
                <p className="text-sm font-semibold text-green-600">↑ 43% more conversions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">The Real Cost of Scattered Messages</h2>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="bg-card p-6 rounded-xl border-2 border-destructive/20">
                <div className="text-4xl mb-3">❌</div>
                <h3 className="font-semibold text-lg mb-2">Missed Revenue</h3>
                <p className="text-muted-foreground">Customer asks about pricing on WhatsApp. You see it 3 hours later. They bought from a competitor.</p>
              </div>
              <div className="bg-card p-6 rounded-xl border-2 border-destructive/20">
                <div className="text-4xl mb-3">😓</div>
                <h3 className="font-semibold text-lg mb-2">Team Chaos</h3>
                <p className="text-muted-foreground">Sarah checks email, Tom monitors WhatsApp, Lisa watches Instagram. Nobody knows who's handling what.</p>
              </div>
              <div className="bg-card p-6 rounded-xl border-2 border-destructive/20">
                <div className="text-4xl mb-3">⏰</div>
                <h3 className="font-semibold text-lg mb-2">Wasted Time</h3>
                <p className="text-muted-foreground">Your team spends 2+ hours daily switching between apps, copying messages, and hunting for conversations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">One Platform. Every Channel. Zero Chaos.</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Stop switching tabs. À La Carte Chat brings WhatsApp Business API, email, SMS, Facebook, Instagram, and AI into one powerful unified inbox.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => <Card key={index} className="p-6 hover:shadow-lg transition-all rounded-2xl border-2 relative">
                <feature.icon className="w-12 h-12 text-primary mb-4" aria-hidden="true" />
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  {feature.status === 'coming_soon'}
                </div>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Visual Demo Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <Badge className="mb-4">SEE IT IN ACTION</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Your Entire Inbox. One Beautiful Dashboard.</h2>
              <p className="text-lg text-muted-foreground mb-6">
                WhatsApp messages appear next to emails. Instagram DMs thread with SMS. Your team sees everything without switching apps.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Unified conversation view:</strong> See all messages from a customer across every channel in one thread
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Smart agent assignment:</strong> Automatically route conversations to the right team member
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Real-time collaboration:</strong> See who's typing, mark conversations as resolved, leave internal notes
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-2xl shadow-2xl w-full bg-gradient-to-br from-secondary/10 via-background to-muted border-2 border-border p-8 aspect-video flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Mail className="w-20 h-20 text-primary mx-auto" />
                  <p className="text-2xl font-semibold text-foreground">Aggregated Inbox
AI powered reponses
                </p>
                  <p className="text-muted-foreground">WhatsApp • Email • SMS • Facebook • Instagram</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="rounded-2xl shadow-2xl w-full bg-gradient-to-br from-primary/5 via-background to-secondary/10 border-2 border-border p-8 aspect-video flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Users className="w-20 h-20 text-primary mx-auto" />
                  <p className="text-2xl font-semibold text-foreground">AI-Powered Assistant</p>
                  <p className="text-muted-foreground">24/7 automated responses</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Badge className="mb-4">AI THAT WORKS FOR YOU</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Your AI Assistant Answers While You Sleep</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Train the AI on YOUR business docs, FAQs, and policies. It responds instantly to common questions—even at 2 AM—while you decide if sensitive replies need human approval.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Instant training:</strong> Upload your FAQ, paste your knowledge base, and the AI learns your business
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Approval queue:</strong> AI drafts responses for pricing/refunds, you approve before sending
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Multi-language support:</strong> Automatically responds in 50+ languages to reach global customers
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Get Started in 5 Minutes</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            No technical skills required. Connect your WhatsApp Business API, email, and other channels in minutes—not weeks.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[{
            step: "1",
            title: "Connect Your Channels",
            description: "Link WhatsApp Business API, Gmail, SMS, Facebook, Instagram—all in under 5 minutes with step-by-step wizards"
          }, {
            step: "2",
            title: "Train Your AI & Add Team",
            description: "Upload FAQs to train AI assistant. Invite team members. Set up auto-assignment rules. You're ready to go."
          }, {
            step: "3",
            title: "Start Converting Faster",
            description: "Messages pour into ONE inbox. AI handles routine questions. Your team focuses on closing deals. Watch revenue grow."
          }].map((step, index) => <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-4 mx-auto" aria-label={`Step ${step.step}`}>
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* Demo: Aggregated Inbox */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Your Aggregated Inbox in Action</h2>
          <p className="text-center text-muted-foreground mb-12">See how WhatsApp Business API and email messages flow into one combined inbox. Manage all customer conversations in one place.</p>
          
          <div className="bg-card border rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-3 h-[500px]">
              {/* Inbox List */}
              <div className="col-span-1 border-r overflow-y-auto">
                <div className="p-4 border-b bg-muted/50">
                  <h3 className="font-semibold">Conversations (24)</h3>
                </div>
                <div className="space-y-2 p-2">
                  {[{
                  name: "Sarah Johnson",
                  channel: "whatsapp",
                  msg: "Can you help with my order?",
                  time: "Just now",
                  agent: "AI Bot",
                  unread: true
                }, {
                  name: "john@acme.com",
                  channel: "email",
                  msg: "Invoice inquiry",
                  time: "2m ago",
                  agent: "Maria",
                  unread: true
                }, {
                  name: "+1 555 0123",
                  channel: "whatsapp",
                  msg: "Delivery status?",
                  time: "5m ago",
                  agent: "AI Bot",
                  unread: false
                }, {
                  name: "support@client.com",
                  channel: "email",
                  msg: "Feature request",
                  time: "12m ago",
                  agent: "Tom",
                  unread: false
                }, {
                  name: "Lisa Chen",
                  channel: "whatsapp",
                  msg: "Thank you!",
                  time: "18m ago",
                  agent: "Maria",
                  unread: false
                }, {
                  name: "sales@company.co",
                  channel: "email",
                  msg: "Partnership opportunity",
                  time: "25m ago",
                  agent: "Tom",
                  unread: false
                }].map((conv, i) => <div key={i} className={`p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all ${conv.unread ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{conv.name}</span>
                        <span className="text-xs text-muted-foreground">{conv.time}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${conv.channel === 'whatsapp' ? 'bg-green-500/20 text-green-700' : 'bg-blue-500/20 text-blue-700'}`}>
                          {conv.channel === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'}
                        </span>
                        <span className="text-xs text-muted-foreground">→ {conv.agent}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.msg}</p>
                    </div>)}
                </div>
              </div>

              {/* Conversation View */}
              <div className="col-span-2 flex flex-col">
                <div className="p-4 border-b bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Sarah Johnson</h3>
                      <p className="text-sm text-muted-foreground">📱 WhatsApp • Managed by AI Bot</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-green-500/20 text-green-700 rounded-full text-sm">🤖 AI Active</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 max-w-[70%]">
                      <p className="text-sm">Hi! I ordered a product 3 days ago and haven't received tracking info yet. Order #12345</p>
                      <span className="text-xs text-muted-foreground">10:32 AM</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[70%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs opacity-80">🤖 AI Bot</span>
                      </div>
                      <p className="text-sm">Hello Sarah! I've located your order #12345. It was shipped yesterday via FedEx. Your tracking number is FDX789456123. It should arrive by tomorrow. Is there anything else I can help you with?</p>
                      <span className="text-xs opacity-80">10:32 AM</span>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 max-w-[70%]">
                      <p className="text-sm">Perfect! Thank you so much 😊</p>
                      <span className="text-xs text-muted-foreground">10:33 AM</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[70%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs opacity-80">🤖 AI Bot</span>
                      </div>
                      <p className="text-sm">You're welcome! Feel free to reach out if you need anything else. Have a great day! 🎉</p>
                      <span className="text-xs opacity-80">10:33 AM</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Type a message..." className="flex-1 px-4 py-2 border rounded-lg bg-background" disabled />
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo: Team Management */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Multi-Agent Dashboard</h2>
          <p className="text-center text-muted-foreground mb-12">See how your team collaborates in real-time</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[{
            name: "Maria Rodriguez",
            avatar: "👩‍💼",
            status: "active",
            conversations: 8,
            avgResponse: "2m",
            channel: "email"
          }, {
            name: "Tom Wilson",
            avatar: "👨‍💻",
            status: "active",
            conversations: 12,
            avgResponse: "1.5m",
            channel: "whatsapp"
          }, {
            name: "AI Bot",
            avatar: "🤖",
            status: "active",
            conversations: 156,
            avgResponse: "3s",
            channel: "both"
          }].map((agent, i) => <div key={i} className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">{agent.avatar}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{agent.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-sm text-muted-foreground capitalize">{agent.status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active chats</span>
                    <span className="font-semibold">{agent.conversations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg. response</span>
                    <span className="font-semibold">{agent.avgResponse}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Channels</span>
                    <span className="font-semibold capitalize">{agent.channel}</span>
                  </div>
                </div>

                {agent.name === "AI Bot" && <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <span>✓</span>
                      <span>Handling 89% of inquiries</span>
                    </div>
                  </div>}
              </div>)}
          </div>
        </div>
      </section>

      {/* Demo: API Integration */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Developer-Friendly API</h2>
          <p className="text-center text-muted-foreground mb-4">Integrate with your existing tools in minutes</p>
          
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Two Ways to Integrate</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="text-2xl">🔗</span>
                    Embed Link
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Simply embed our chat widget into your existing website or app. Add a single line of code and your customers can start chatting through WhatsApp and email directly from your site.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    REST API
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Use our comprehensive REST API to connect your CRM, e-commerce platform, or custom applications. Send messages, manage customers, and sync conversations programmatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Send a Message</h3>
              <pre className="bg-muted/50 p-4 rounded text-sm overflow-x-auto">
                <code>{`POST /api/messages
{
  "customerId": "uuid",
  "content": "Hello!",
  "channel": "whatsapp"
}`}</code>
              </pre>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Fetch Conversations</h3>
              <pre className="bg-muted/50 p-4 rounded text-sm overflow-x-auto">
                <code>{`GET /api/conversations
{
  "conversations": [...],
  "total": 156,
  "unread": 24
}`}</code>
              </pre>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Create Customer</h3>
              <pre className="bg-muted/50 p-4 rounded text-sm overflow-x-auto">
                <code>{`POST /api/customers
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}`}</code>
              </pre>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Webhook Events</h3>
              <pre className="bg-muted/50 p-4 rounded text-sm overflow-x-auto">
                <code>{`message.received
message.sent
conversation.created
ai.response.completed`}</code>
              </pre>
            </div>
          </div>

          <div className="text-center mt-8">
            <a href="#" className="inline-flex items-center gap-2 text-primary hover:underline">
              View Full API Documentation →
            </a>
          </div>
        </div>
      </section>

      {/* PWA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-3xl font-bold mb-4">Works as Progressive Web App (PWA)</h2>
          <p className="text-xl mb-6 max-w-2xl mx-auto">
            Install À La Carte Chat on any device - iPhone, Android, Windows, Mac, Linux.
            No app store required. Works offline. Always up-to-date.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Badge variant="outline" className="text-lg py-2 px-4">No App Store</Badge>
            <Badge variant="outline" className="text-lg py-2 px-4">Works Offline</Badge>
            <Badge variant="outline" className="text-lg py-2 px-4">Cross-Platform</Badge>
          </div>
        </div>
      </section>

      {/* Competitor Comparison Table */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose À La Carte Chat?</h2>
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold">À La Carte Chat</th>
                  <th className="text-center p-4 font-semibold">Typical Competitor</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="p-4">WhatsApp + Email + SMS + FB + IG</td><td className="text-center p-4">✅ All included</td><td className="text-center p-4">❌ Pick 1-2 channels</td></tr>
                <tr className="border-b"><td className="p-4">AI Chatbot (Custom Training)</td><td className="text-center p-4">✅ Included (Pro+)</td><td className="text-center p-4">💰 Extra $50-200/mo</td></tr>
                <tr className="border-b"><td className="p-4">Full REST API Access</td><td className="text-center p-4">✅ Free (Pro+)</td><td className="text-center p-4">💰 $99-299/mo</td></tr>
                <tr className="border-b"><td className="p-4">Embeddable Widget</td><td className="text-center p-4">✅ Included</td><td className="text-center p-4">⚠️ Limited customization</td></tr>
                <tr className="border-b"><td className="p-4">Works as PWA (No App Store)</td><td className="text-center p-4">✅ Yes</td><td className="text-center p-4">❌ Native apps only</td></tr>
                <tr className="border-b"><td className="p-4">Voice Notes + File Sharing</td><td className="text-center p-4">✅ All formats</td><td className="text-center p-4">⚠️ Limited formats</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">See It in Action</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">Screenshots from our platform</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[{
            title: "Unified Inbox",
            description: "All channels in one place",
            icon: "🖼️"
          }, {
            title: "AI Assistant",
            description: "Auto-respond feature",
            icon: "🤖"
          }, {
            title: "Team Collaboration",
            description: "Work together",
            icon: "👥"
          }, {
            title: "Button Analytics",
            description: "Track engagement",
            icon: "📊"
          }, {
            title: "Mobile PWA",
            description: "Any device",
            icon: "📱"
          }, {
            title: "API Dashboard",
            description: "Monitor integrations",
            icon: "⚡"
          }].map((item, i) => <Card key={i} className="p-6">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-4 flex items-center justify-center text-6xl">{item.icon}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Customer Reviews</h2>
          <p className="text-center text-muted-foreground mb-12">What businesses say about us</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[{
            name: "Sarah J.",
            role: "Manager",
            avatar: "👩‍💼",
            quote: "All channels in one inbox. AI handles 80% automatically!"
          }, {
            name: "Michael C.",
            role: "Director",
            avatar: "👨‍💻",
            quote: "Seamless WhatsApp API integration. Great analytics."
          }, {
            name: "Emma R.",
            role: "CEO",
            avatar: "👩‍🚀",
            quote: "Best investment. Easy setup, fair pricing."
          }].map((t, i) => <Card key={i} className="p-6">
                <div className="flex gap-3 mb-3">
                  <div className="text-3xl">{t.avatar}</div>
                  <div><h3 className="font-semibold">{t.name}</h3><p className="text-sm text-muted-foreground">{t.role}</p></div>
                </div>
                <div className="flex gap-1 mb-2">{[1, 2, 3, 4, 5].map(s => <span key={s}>⭐</span>)}</div>
                <p className="text-sm italic">"{t.quote}"</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-secondary/5 to-primary/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Pricing That Grows With You</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Start free. Upgrade when ready. Cancel anytime. No contracts, no surprises.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) => <Card key={index} className={`p-8 rounded-xl transition-all hover:shadow-xl ${tier.highlighted ? "border-primary border-2 shadow-lg" : "border"}`}>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-4">{tier.name}</h3>
                  <div className="mb-2">
                    <span className="text-5xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground text-lg">{tier.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, featureIndex) => <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-sm">{feature}</span>
                    </li>)}
                </ul>
                <Button className="w-full rounded-lg py-6 text-base font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90" size="lg" onClick={() => navigate(user ? "/pricing" : "/auth")}>
                  {tier.cta}
                </Button>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
                </div>
                <span className="font-semibold">À La Carte Chat</span>
              </div>
              <p className="text-sm text-foreground/70">
                Transform customer conversations into revenue. À La Carte Chat aggregates WhatsApp, email, SMS, Facebook, Instagram into one powerful platform. Never miss a message. Never lose a sale.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li>WhatsApp Business API</li>
                <li>Meta Business Integration</li>
                <li>Combined Inbox</li>
                <li>Aggregated Messaging</li>
                <li>AI Chatbot</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><a href="/pricing" className="hover:text-primary">Pricing</a></li>
                <li><a href="/api-docs" className="hover:text-primary">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><a href="/privacy" className="hover:text-primary">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-primary">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-foreground/60">
            <div className="flex justify-between items-center mb-2">
              <p>© 2025 À La Carte Chat. All rights reserved.</p>
              <a href="/admin/login" className="text-xs hover:text-primary">Admin</a>
            </div>
            <p className="text-xs">Unified Inbox • WhatsApp Business API • Email Aggregation • SMS Messaging • Facebook Messenger • Instagram DMs • AI Assistant • Multi-Channel Customer Communication</p>
          </div>
        </div>
      </footer>

      {/* Embed Chat Widget for Support */}
      <div id="alacarte-chat-widget"></div>
      <script dangerouslySetInnerHTML={{
      __html: `
        (function() {
          var script = document.createElement('script');
          script.src = '/embed-widget.js';
          script.onload = function() {
            if (window.AlacarteChatWidget) {
              window.AlacarteChatWidget.init({
                token: 'support-landing-page',
                apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1',
                customer: {},
                position: 'bottom-right',
                primaryColor: '#6366f1',
                welcomeMessage: 'Hi! Need help? Chat with our support team.'
              });
            }
          };
          document.head.appendChild(script);
        })();
      `
    }} />
    </div>;
};
export default Landing;