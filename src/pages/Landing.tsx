import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users, Mail, Bell, Calendar, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    { icon: MessageSquare, title: "WhatsApp Business API", description: "Connect your official WhatsApp Business account" },
    { icon: Mail, title: "Email Integration", description: "Unified inbox for all your email communications" },
    { icon: Users, title: "Multi-Agent Support", description: "10 agents collaborating from different locations" },
    { icon: Bell, title: "Native Notifications", description: "Real-time push notifications across devices" },
    { icon: Calendar, title: "Calendar Sync", description: "Sync tasks and appointments automatically" },
    { icon: MessageSquare, title: "Train AI Chatbot", description: "Customize and train your AI assistant for automated responses" },
  ];

  const pricingTiers = [
    {
      name: "Free",
      price: "€0",
      period: "forever",
      description: "Single user only",
      features: ["1 User", "Basic features", "Community support"],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "Tier 1",
      price: "€30",
      period: "per month",
      description: "+ €7.50 per additional user + €0.01 per message",
      features: [
        "Multi-agent support (up to 10)",
        "€7.50 per additional user/month",
        "WhatsApp Business API",
        "Email integration",
        "Native notifications",
        "Task management",
        "Calendar sync",
        "Priority support",
        "72-hour free trial",
      ],
      cta: "Start Trial",
      highlighted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">À La Carte Chat</span>
          </div>
          {user ? (
            <Button onClick={() => navigate("/onebillchat")}>
              Go to App
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")} variant="outline">
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            À La Carte Chat
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Pulling all of your business conversations into one place
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all">
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
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all rounded-2xl border-2">
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: "1", title: "Connect Your Accounts", description: "Link your WhatsApp Business API and email accounts" },
              { step: "2", title: "Invite Your Team", description: "Add up to 10 agents to collaborate seamlessly" },
              { step: "3", title: "Start Conversations", description: "Manage all customer communications from one unified platform" },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-4 mx-auto">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo: Aggregated Inbox */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Unified Inbox in Action</h2>
          <p className="text-center text-muted-foreground mb-12">All channels, one place. Watch messages flow in real-time.</p>
          
          <div className="bg-card border rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-3 h-[500px]">
              {/* Inbox List */}
              <div className="col-span-1 border-r overflow-y-auto">
                <div className="p-4 border-b bg-muted/50">
                  <h3 className="font-semibold">Conversations (24)</h3>
                </div>
                <div className="space-y-2 p-2">
                  {[
                    { name: "Sarah Johnson", channel: "whatsapp", msg: "Can you help with my order?", time: "Just now", agent: "AI Bot", unread: true },
                    { name: "john@acme.com", channel: "email", msg: "Invoice inquiry", time: "2m ago", agent: "Maria", unread: true },
                    { name: "+1 555 0123", channel: "whatsapp", msg: "Delivery status?", time: "5m ago", agent: "AI Bot", unread: false },
                    { name: "support@client.com", channel: "email", msg: "Feature request", time: "12m ago", agent: "Tom", unread: false },
                    { name: "Lisa Chen", channel: "whatsapp", msg: "Thank you!", time: "18m ago", agent: "Maria", unread: false },
                    { name: "sales@company.co", channel: "email", msg: "Partnership opportunity", time: "25m ago", agent: "Tom", unread: false },
                  ].map((conv, i) => (
                    <div key={i} className={`p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all ${conv.unread ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
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
                    </div>
                  ))}
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
                    <input 
                      type="text" 
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border rounded-lg bg-background"
                      disabled
                    />
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
            {[
              { name: "Maria Rodriguez", avatar: "👩‍💼", status: "active", conversations: 8, avgResponse: "2m", channel: "email" },
              { name: "Tom Wilson", avatar: "👨‍💻", status: "active", conversations: 12, avgResponse: "1.5m", channel: "whatsapp" },
              { name: "AI Bot", avatar: "🤖", status: "active", conversations: 156, avgResponse: "3s", channel: "both" },
            ].map((agent, i) => (
              <div key={i} className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
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

                {agent.name === "AI Bot" && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <span>✓</span>
                      <span>Handling 89% of inquiries</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
      <section className="py-20 bg-secondary/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Start with a 72-hour free trial. Cancel anytime.
          </p>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className={`p-8 rounded-2xl ${
                  tier.highlighted
                    ? "border-4 border-primary shadow-2xl scale-105"
                    : "border-2"
                }`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">/{tier.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full rounded-xl"
                  variant={tier.highlighted ? "default" : "outline"}
                  size="lg"
                  onClick={() => navigate("/auth")}
                >
                  {tier.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-semibold">À La Carte Chat</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pulling all of your business conversations into one place
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Features</li>
                <li>Pricing</li>
                <li>API Documentation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li className="text-muted-foreground">Email: hello@alacartesaas.com</li>
                <li className="text-muted-foreground">Documentation</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/20 pt-8 text-center text-sm text-muted-foreground">
            © 2025 À La Carte Chat. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;