import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      metaDescription.setAttribute('content', 'Manage WhatsApp Business API, email, and all customer messages in one aggregated inbox. Meta Business integration for multi-agent teams. Talk to your customers in one place with AI-powered responses.');
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
      content: '/placeholder.svg'
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
        "price": "30",
        "priceCurrency": "EUR"
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
    description: "Official Meta Business Platform integration for WhatsApp Business API with full message management"
  }, {
    icon: Mail,
    title: "Combined Email Inbox",
    description: "Manage messages from multiple email accounts in one aggregated inbox"
  }, {
    icon: Users,
    title: "Multi-Agent Support",
    description: "Up to 10 agents can manage customer conversations from different locations simultaneously"
  }, {
    icon: Bell,
    title: "Real-Time Notifications",
    description: "Never miss a customer message with instant push notifications across all devices"
  }, {
    icon: Calendar,
    title: "Task & Calendar Sync",
    description: "Automatically sync customer appointments and follow-ups to your calendar"
  }, {
    icon: MessageSquare,
    title: "AI Chatbot Training",
    description: "Train your AI assistant to handle customer inquiries and manage WhatsApp Business messages automatically"
  }];
  const pricingTiers = [{
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "per seat",
    features: [
      "2 team members",
      "1,000 messages/month",
      "Basic templates",
      "Email support",
      "WhatsApp integration"
    ],
    cta: "Subscribe",
    highlighted: false
  }, {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "per seat",
    features: [
      "10 team members",
      "10,000 messages/month",
      "Advanced templates",
      "AI assistant",
      "Priority support",
      "API access",
      "Email integration"
    ],
    cta: "Subscribe",
    highlighted: true
  }, {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "per seat",
    features: [
      "Unlimited team members",
      "Unlimited messages",
      "Custom templates",
      "AI assistant",
      "24/7 premium support",
      "Full API access",
      "Custom integrations",
      "Dedicated account manager"
    ],
    cta: "Subscribe",
    highlighted: false
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
            {user ? (
              <>
                <Button onClick={() => navigate("/app/dashboard")} variant="outline">
                  Dashboard
                </Button>
                <Button onClick={() => navigate("/auth")} variant="ghost">
                  Log Out
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Manage Your Conversations From One Place: WhatsApp / Email / AI ChatBot
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-foreground">
            The ultimate combined inbox for WhatsApp Business API, email, and customer conversations. Talk to your customers from one aggregated inbox with Meta Business integration and AI-powered automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/signup")} className="text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-2xl">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Everything You Need to Manage Customer Messages</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Our aggregated inbox combines WhatsApp Business, email, and all channels. Talk to your customers in one place with powerful Meta Business integration.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => <Card key={index} className="p-6 hover:shadow-lg transition-all rounded-2xl border-2">
                <feature.icon className="w-12 h-12 text-primary mb-4" aria-hidden="true" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How to Manage WhatsApp Business in 3 Steps</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Set up your combined inbox and start managing all customer messages from WhatsApp Business API, email, and more
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[{
            step: "1",
            title: "Connect WhatsApp Business API",
            description: "Link your Meta Business Platform account and WhatsApp Business API to your aggregated inbox"
          }, {
            step: "2",
            title: "Add Your Team Agents",
            description: "Invite up to 10 agents to manage messages and talk to customers collaboratively"
          }, {
            step: "3",
            title: "Manage All Messages",
            description: "Handle WhatsApp, email, and all customer communications from one combined inbox with AI assistance"
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
          <p className="text-center text-muted-foreground mb-12">Integrate with your existing tools in minutes</p>
          
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

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-secondary/5 to-primary/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Choose Your Plan</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Select the perfect plan for your business needs
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
                <Button 
                  className="w-full rounded-lg py-6 text-base font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90" 
                  size="lg" 
                  onClick={() => navigate(user ? "/pricing" : "/auth")}
                >
                  {tier.cta}
                </Button>
              </Card>)}
          </div>
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
                The leading combined inbox platform for WhatsApp Business API and customer message management. Talk to your customers in one place with Meta Business integration.
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
                <li>How to Manage WhatsApp Business</li>
                <li>API Documentation</li>
                <li>Pricing</li>
                <li>Use Cases</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li>Email: hello@alacartesaas.com</li>
                <li>Knowledge Base</li>
                <li>Contact Us</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-foreground/60">
            <p className="mb-2">© 2025 À La Carte Chat. All rights reserved.</p>
            <p className="text-xs">WhatsApp Business API | Meta Business Platform | Combined Inbox | Aggregated Messaging | Customer Message Management</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;