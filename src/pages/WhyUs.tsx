import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicHeader } from "@/components/PublicHeader";
import { 
  CheckCircle2, 
  XCircle, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Users, 
  Zap,
  Brain,
  Shield,
  Globe,
  MessageSquare,
  BarChart3,
  AlertTriangle
} from "lucide-react";

export default function WhyUs() {
  const navigate = useNavigate();

  const faqItems = [
    {
      question: "Why do I need a unified inbox?",
      answer: "Because scattered inboxes cost businesses an average of $55 billion annually in lost productivity and customer churn. A unified inbox increases team productivity by 23% and reduces customer churn by 32%."
    },
    {
      question: "How does task switching affect my team?",
      answer: "Studies show that employees lose 5 working weeks per year (23% of productivity) to context switching. Every time someone switches between apps, they lose 23 minutes and 15 seconds to regain focus."
    },
    {
      question: "What is the ROI of a unified messaging platform?",
      answer: "Businesses typically see a payback period of less than 1 week, with monthly savings of $5,000-$15,000 depending on team size. You'll also see 62% higher revenue from real-time response capabilities."
    }
  ];

  return (
    <>
      <SEOHead
        title="Why Unified Inbox Software Increases Revenue by 62% | À La Carte Chat"
        description="Discover how scattered inboxes cost businesses $55B annually. Learn why 1,000+ teams switched to unified messaging and increased customer satisfaction by 3x."
        keywords={["unified inbox benefits", "customer service ROI", "reduce churn rate", "task switching costs", "multichannel messaging benefits", "business messaging platform advantages"]}
        canonical="https://alacartechat.com/why-us"
      />
      <StructuredData
        type="FAQPage"
        data={{
          questions: faqItems
        }}
      />

      <div className="min-h-screen bg-background">
        <PublicHeader />

        {/* Hero Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 text-center bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full text-sm font-medium mb-6">
              <AlertTriangle className="w-4 h-4" />
              The Silent Business Killer
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Your Scattered Inboxes Are <span className="text-destructive">Bleeding Money</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Every day, businesses lose thousands of dollars to missed messages, slow responses, and frustrated customers. 
              Here's the hidden cost you're probably ignoring.
            </p>
          </div>
        </section>

        {/* The Hidden Costs Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-card">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-foreground">
              What This Actually Costs You
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-6 border-destructive/20 bg-destructive/5">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center mb-4">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Silent Churn</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p><span className="text-2xl font-bold text-destructive">32%</span> of customers who don't receive a response within 1 hour will never do business with you again</p>
                  <p><span className="text-2xl font-bold text-destructive">61%</span> switch to competitors after just ONE bad service experience</p>
                  <p className="text-xs opacity-70">Source: Khoros 2024</p>
                </div>
              </Card>

              <Card className="p-6 border-destructive/20 bg-destructive/5">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Task-Switching Tax</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Employees lose <span className="text-2xl font-bold text-destructive">5 weeks/year</span> (23% of productivity) to context switching</p>
                  <p>Every app switch costs <span className="font-bold text-destructive">23 minutes</span> to regain focus</p>
                  <p className="text-xs opacity-70">Source: Harvard Business Review</p>
                </div>
              </Card>

              <Card className="p-6 border-destructive/20 bg-destructive/5">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Missed Revenue</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p><span className="text-2xl font-bold text-destructive">90%</span> of customers expect immediate response (within 10 minutes)</p>
                  <p>Real-time response = <span className="text-2xl font-bold text-destructive">62%</span> higher revenue</p>
                  <p className="text-xs opacity-70">Source: MIT CISR Research</p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* A Day in Your Business */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-foreground">
              A Day in Your Business
            </h2>
            <div className="space-y-6">
              {[
                { time: "9:00 AM", text: "Start with 47 unread emails, 23 WhatsApp messages, 8 Instagram DMs, 5 Facebook messages", icon: MessageSquare },
                { time: "10:00 AM", text: "Customer asks question on WhatsApp - your team doesn't see it because they're in email", icon: XCircle },
                { time: "12:00 PM", text: "Same customer asks again on Instagram - different team member gives conflicting answer", icon: XCircle },
                { time: "2:00 PM", text: "Team member spends 15 minutes finding a conversation that happened 'somewhere' last week", icon: Clock },
                { time: "4:00 PM", text: "Important message buried under spam - customer waits 6 hours for response", icon: AlertTriangle },
                { time: "6:00 PM", text: "Three team members accidentally replied to the same customer with different answers", icon: XCircle }
              ].map((item, idx) => (
                <Card key={idx} className="p-6 border-l-4 border-l-destructive">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-muted-foreground mb-1">{item.time}</div>
                      <p className="text-foreground">{item.text}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-12 text-center">
              <p className="text-xl font-semibold text-destructive">Sound familiar? This chaos is costing you customers every single day.</p>
            </div>
          </div>
        </section>

        {/* The Attention Economy */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-card">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6 text-foreground">
              Your Customers Live on Their Phones
            </h2>
            <p className="text-xl text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
              In today's attention economy, if you're not where your customers are, you don't exist.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { stat: "5B", label: "People use mobile devices worldwide" },
                { stat: "96x", label: "Average person checks phone per day" },
                { stat: "75%", label: "Prefer messaging over phone calls" },
                { stat: "66%", label: "Higher engagement when you meet them where they are" }
              ].map((item, idx) => (
                <Card key={idx} className="p-6 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">{item.stat}</div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </Card>
              ))}
            </div>
            <div className="mt-12 text-center">
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Instagram, WhatsApp, Facebook Messenger, Email - that's where your customers already are. 
                Meeting them there isn't optional anymore. <span className="font-bold text-foreground">It's survival.</span>
              </p>
            </div>
          </div>
        </section>

        {/* The Solution */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                The Solution
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
                One Inbox. One Team. Zero Chaos.
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Stop juggling apps. Start serving customers.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">For Business Owners</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Stop losing customers to slow responses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Increase revenue without hiring more staff</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Complete visibility into all conversations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Scale customer service as you grow</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">For Team Leaders</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>End app-switching madness (save 5 weeks/year per employee)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Assign conversations and track accountability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>See who's handling what in real-time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Collision detection (no duplicate replies)</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">For Team Members</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>One login, all channels</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Templates and quick replies for efficiency</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>AI assistance when you need it</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Less stress, more productivity</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* AI-Powered Support */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-card">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Brain className="w-4 h-4" />
                AI + Human Intelligence
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
                Your Team + AI = Unstoppable
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">The Reality:</h3>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">You can't hire enough staff to respond 24/7 to every channel</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Your team needs sleep, weekends, and vacation days</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Customers expect instant responses at 2 AM</span>
                  </li>
                </ul>

                <h3 className="text-2xl font-bold mb-4 text-foreground">The Solution:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Train an AI assistant on your FAQs, policies, and product knowledge</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">AI handles 70-80% of routine questions instantly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Human team focuses on complex issues and relationship building</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Seamless handoff when human touch is needed</span>
                  </li>
                </ul>
              </div>

              <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5">
                <h3 className="text-xl font-bold mb-6 text-foreground">Real Results:</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      <span className="text-3xl font-bold text-primary">24/7</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Instant responses on all channels</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      <span className="text-3xl font-bold text-primary">80%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Reduction in response time</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      <span className="text-3xl font-bold text-primary">3x</span>
                    </div>
                    <p className="text-sm text-muted-foreground">More customers served with same team size</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ROI Calculator */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-background">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-foreground">
              What This Means for Your Bottom Line
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="p-8 border-destructive/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Without Unified Inbox</h3>
                </div>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>5 team members × 5 hours/week wasted</span>
                    <span className="font-semibold">25 hrs/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span>@ $30/hour average cost</span>
                    <span className="font-semibold text-destructive">$3,000/month</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span>Customer churn from slow response (10%)</span>
                      <span className="font-semibold text-destructive">Lost revenue</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time searching for conversations</span>
                      <span className="font-semibold">15 hrs/week</span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-foreground">Monthly waste:</span>
                      <span className="text-destructive">$3,000+</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-8 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">With À La Carte Chat</h3>
                </div>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>23% productivity increase</span>
                    <span className="font-semibold text-primary">+11.5 hrs/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span>80% faster response time</span>
                    <span className="font-semibold text-primary">32% less churn</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span>AI handles 70% of routine queries</span>
                      <span className="font-semibold text-primary">3x capacity</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Instant conversation search</span>
                      <span className="font-semibold text-primary">0 hrs wasted</span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-foreground">Monthly savings:</span>
                      <span className="text-primary">$5,000-$15,000</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-lg">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold text-foreground">Payback Period: <span className="text-primary">Less than 1 week</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-card">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-foreground">
              Traditional Approach vs. Unified Inbox
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4 text-muted-foreground font-medium">Feature</th>
                    <th className="text-center py-4 px-4 text-destructive font-medium">Multiple Apps</th>
                    <th className="text-center py-4 px-4 text-primary font-medium">Unified Inbox</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Message Management", "Scattered across apps", "Single centralized view"],
                    ["Missed Messages", "Common occurrence", "Nothing falls through"],
                    ["Duplicate Responses", "Frequent accidents", "Collision detection"],
                    ["Team Visibility", "No oversight", "Complete transparency"],
                    ["Customer Support", "Manual only", "AI + Human hybrid"],
                    ["Customer History", "Fragmented by channel", "Unified customer view"],
                    ["Response Time", "Hours to days", "Minutes to seconds"],
                    ["Team Productivity", "23% lost to switching", "23% productivity gain"],
                    ["Scalability", "Hire more staff", "AI scales infinitely"]
                  ].map(([feature, traditional, unified], idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-4 px-4 font-medium text-foreground">{feature}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{traditional}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{unified}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-foreground">
              Enterprise-Grade Platform You Can Trust
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Shield, text: "GDPR compliant & enterprise-grade security" },
                { icon: TrendingUp, text: "99.9% uptime guarantee" },
                { icon: Clock, text: "No long-term contracts" },
                { icon: Globe, text: "Export your data anytime" },
                { icon: Users, text: "Role-based permissions and audit logs" },
                { icon: CheckCircle2, text: "Used by teams in 80+ countries" }
              ].map((item, idx) => (
                <Card key={idx} className="p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 sm:py-24 px-4 sm:px-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-bold mb-6 text-foreground">
              Stop Losing Customers to Chaos
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join 1,000+ businesses who stopped the chaos and started growing
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/signup')} className="text-lg px-8">
                Start Free Trial - No Credit Card Required
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/features')} className="text-lg px-8">
                See All Features
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              See the difference in 5 minutes • Cancel anytime • Full data export
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-card border-t py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
            <p>&copy; 2025 À La Carte Chat. All rights reserved.</p>
            <div className="flex justify-center gap-6 mt-4 flex-wrap">
              <button onClick={() => navigate('/features')} className="hover:text-primary transition-colors">Features</button>
              <button onClick={() => navigate('/why-us')} className="hover:text-primary transition-colors">Why Us</button>
              <button onClick={() => navigate('/pricing')} className="hover:text-primary transition-colors">Pricing</button>
              <button onClick={() => navigate('/faq')} className="hover:text-primary transition-colors">FAQ</button>
              <button onClick={() => navigate('/guides')} className="hover:text-primary transition-colors">Guides</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-primary transition-colors">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="hover:text-primary transition-colors">Terms of Service</button>
              <a href="mailto:support@alacartechat.com" className="hover:text-primary transition-colors">Contact Us</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
