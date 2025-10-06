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
      description: "+ €0.01 per message",
      features: [
        "Multi-agent support (up to 10)",
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