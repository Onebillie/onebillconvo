import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
const Landing = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return <>
      <SEOHead title="À La Carte Chat - Unified Inbox for Business Messaging" description="Manage WhatsApp, Email, SMS, Instagram, and Facebook messages in one unified inbox. Pay-as-you-go pricing with AI-powered automation. Trusted by 1,000+ businesses worldwide." keywords={['unified inbox', 'business messaging platform', 'WhatsApp Business API', 'multi-channel messaging', 'customer service software', 'AI chatbot', 'email integration', 'SMS management', 'Instagram DM', 'Facebook Messenger', 'unified communications', 'omnichannel support']} canonical="/" />
      <StructuredData type="Organization" />
      <StructuredData type="SoftwareApplication" />
      <StructuredData type="BreadcrumbList" data={{
      items: [{
        name: 'Home',
        url: '/'
      }]
    }} />
      
      <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
        <nav className="max-w-[1200px] mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
          <div className="font-extrabold tracking-tight text-foreground text-sm sm:text-base">
            À La Carte Chat
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/features" className="text-sm text-foreground hover:opacity-70 transition-opacity">Features</a>
            <a href="#pricing" className="text-sm text-foreground hover:opacity-70 transition-opacity">Pricing</a>
            <a href="/faq" className="text-sm text-foreground hover:opacity-70 transition-opacity">FAQ</a>
            <a href="/guides" className="text-sm text-foreground hover:opacity-70 transition-opacity">Guides</a>
            <Button onClick={() => navigate(user ? "/dashboard" : "/auth")} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 text-sm">
              {user ? "Dashboard" : "Login"}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-foreground" aria-label="Toggle menu">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md">
            <div className="px-4 py-3 flex flex-col gap-3">
              <a href="/features" className="text-foreground hover:opacity-70 transition-opacity py-2" onClick={() => setMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#pricing" className="text-foreground hover:opacity-70 transition-opacity py-2" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </a>
              <a href="#contact" className="text-foreground hover:opacity-70 transition-opacity py-2" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </a>
              <Button onClick={() => {
              navigate(user ? "/dashboard" : "/auth");
              setMobileMenuOpen(false);
            }} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold mt-2">
                {user ? "Dashboard" : "Login"}
              </Button>
            </div>
          </div>}
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-4 sm:px-6 pt-16 sm:pt-0">
        <div className="mt-8 sm:mt-16 max-w-[1100px] relative z-10">
          <h1 className="text-[clamp(2rem,10vw,8rem)] leading-[0.95] sm:leading-[0.95] font-black tracking-tight uppercase">
            STOP JUGGLING<br />INBOXES.<br />START CLOSING<br />DEALS.
          </h1>
          <p className="mt-4 sm:mt-6 max-w-[760px] mx-auto text-muted-foreground text-sm sm:text-base px-2 md:text-2xl">
            An Unified Team Inbox For All Your Communication Channels With Your Very Own AI ChatBot Ready To Respond When Your Team Can't
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

      {/* Ticker Belt */}
      

      {/* Channels Marquee */}
      <section className="bg-card py-12 sm:py-16 md:py-20 text-center px-4" id="features">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-foreground">All your channels in one place</h2>
        <div className="overflow-hidden mask-marquee">
          <div className="flex gap-3 sm:gap-4 animate-marquee">
            {["WhatsApp Business API", "SMS Messaging", "Email (IMAP/SMTP)", "Instagram DMs", "Facebook Messenger", "Website Chat Widget", "Voice & Files", "Team Collaboration", "AI Assistant", "REST API", "Embed Widget", "SSO Integration"].map((item, i) => <div key={i} className="min-w-[180px] sm:min-w-[240px] px-4 sm:px-6 py-6 sm:py-9 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground font-bold text-center shadow-md text-sm sm:text-base">
                {item}
              </div>)}
            {["WhatsApp Business API", "SMS Messaging", "Email (IMAP/SMTP)", "Instagram DMs", "Facebook Messenger", "Website Chat Widget", "Voice & Files", "Team Collaboration", "AI Assistant", "REST API", "Embed Widget", "SSO Integration"].map((item, i) => <div key={`dup-${i}`} className="min-w-[180px] sm:min-w-[240px] px-4 sm:px-6 py-6 sm:py-9 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground font-bold text-center shadow-md text-sm sm:text-base">
                {item}
              </div>)}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-2 text-card-foreground">Unified inbox</h3>
            <p className="text-muted-foreground">Every message in one place with assignments, internal notes and collision detection.</p>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-2 text-card-foreground">Automations & AI</h3>
            <p className="text-muted-foreground">Route by channel, language or topic. Train an AI assistant, set SLAs and trigger follow‑ups.</p>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-2 text-card-foreground">Privacy & compliance</h3>
            <p className="text-muted-foreground">GDPR‑ready data handling, role‑based permissions and exportable audit logs.</p>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-2 text-card-foreground">Built for teams</h3>
            <p className="text-muted-foreground">Shared inboxes, roles, templates, approvals and performance reporting.</p>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="bg-background py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl sm:rounded-2xl bg-[#12b886] text-white p-6 sm:p-8 md:p-11 text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">1k+</div>
            <div className="text-xs sm:text-sm opacity-95 mt-1 sm:mt-2">businesses</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-[#4dabf7] text-white p-6 sm:p-8 md:p-11 text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">5M+</div>
            <div className="text-xs sm:text-sm opacity-95 mt-1 sm:mt-2">messages processed</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-[#ff922b] text-white p-6 sm:p-8 md:p-11 text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">24/7</div>
            <div className="text-xs sm:text-sm opacity-95 mt-1 sm:mt-2">AI assistance</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-[#e64980] text-white p-6 sm:p-8 md:p-11 text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">200+</div>
            <div className="text-xs sm:text-sm opacity-95 mt-1 sm:mt-2">countries</div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-card py-12 sm:py-16 md:py-20 px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-foreground">Get started in 5 minutes</h2>
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <h4 className="font-bold text-lg mb-2 text-card-foreground">1. Connect channels</h4>
            <p className="text-muted-foreground">WhatsApp, Email, SMS, Instagram and Facebook in minutes.</p>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <h4 className="font-bold text-lg mb-2 text-card-foreground">2. Train AI & add team</h4>
            <p className="text-muted-foreground">Import FAQs, set roles and automations. Keep humans in the loop.</p>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <h4 className="font-bold text-lg mb-2 text-card-foreground">3. Start converting faster</h4>
            <p className="text-muted-foreground">Assign, collaborate and reply 3× faster with tidy workflows.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-background py-12 sm:py-16 md:py-24 px-4 sm:px-6 text-center" id="pricing">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8 text-foreground">Transparent pricing</h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-12 px-4">
          Choose a plan that fits your needs. All plans include core features with different usage limits.
        </p>
        
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-12 sm:mb-16">
          <div className="bg-card rounded-2xl shadow-lg p-6 text-left">
            <h3 className="font-bold text-xl mb-2 text-card-foreground">Free</h3>
            <div className="text-4xl font-extrabold my-3 text-foreground">$0</div>
            <p className="text-xs text-muted-foreground mb-4">Forever free</p>
            <ul className="space-y-2 text-card-foreground text-sm mb-4">
              <li>✓ 1 team member</li>
              <li>✓ 100 WhatsApp msgs/mo</li>
              <li>✓ Unlimited receiving</li>
              <li>✓ 5 basic templates</li>
              <li>✓ Email integration</li>
              <li>✓ Community support</li>
            </ul>
            <div className="border-t border-border pt-3 mb-4">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Overages:</p>
              <p className="text-xs text-muted-foreground">Additional messages: $0.10/msg</p>
            </div>
            <Button onClick={() => navigate("/signup")} className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Start Free
            </Button>
          </div>
          
          <div className="bg-black rounded-2xl shadow-lg p-6 text-left border-2 border-accent">
            <h3 className="font-bold text-xl mb-2 text-white">Starter</h3>
            <div className="text-4xl font-extrabold my-3 text-white">$29<span className="text-base font-medium">/mo</span></div>
            <p className="text-xs text-white/70 mb-4">Per account</p>
            <ul className="space-y-2 text-white text-sm mb-4">
              <li>✓ 2 team members</li>
              <li>✓ 1,000 WhatsApp msgs/mo</li>
              <li>✓ Unlimited receiving</li>
              <li>✓ 20 templates</li>
              <li>✓ Email + SMS integration</li>
              <li>✓ Email support</li>
            </ul>
            <div className="border-t border-white/20 pt-3 mb-4">
              <p className="text-xs text-white/90 font-semibold mb-1">Add-ons:</p>
              <p className="text-xs text-white/70">Extra team member: $10/mo</p>
              <p className="text-xs text-white/70">Extra 1,000 msgs: $15/mo</p>
            </div>
            <Button onClick={() => navigate("/pricing")} className="mt-4 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              Get Started
            </Button>
          </div>
          
          <div className="bg-card rounded-2xl shadow-lg p-6 text-left">
            <h3 className="font-bold text-xl mb-2 text-card-foreground">Professional</h3>
            <div className="text-4xl font-extrabold my-3 text-foreground">$79<span className="text-base font-medium">/mo</span></div>
            <p className="text-xs text-muted-foreground mb-4">Per account</p>
            <ul className="space-y-2 text-card-foreground text-sm mb-4">
              <li>✓ 10 team members</li>
              <li>✓ 10,000 WhatsApp msgs/mo</li>
              <li>✓ Unlimited templates</li>
              <li>✓ AI assistant (1,000 responses)</li>
              <li>✓ API access (10k calls/mo)</li>
              <li>✓ Priority support</li>
            </ul>
            <div className="border-t border-border pt-3 mb-4">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Add-ons:</p>
              <p className="text-xs text-muted-foreground">Extra team member: $7/mo</p>
              <p className="text-xs text-muted-foreground">Extra 5,000 msgs: $30/mo</p>
              <p className="text-xs text-muted-foreground">AI responses: $0.05/response</p>
            </div>
            <Button onClick={() => navigate("/pricing")} className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Choose Professional
            </Button>
          </div>
          
          <div className="bg-card rounded-2xl shadow-lg p-6 text-left">
            <h3 className="font-bold text-xl mb-2 text-card-foreground">Enterprise</h3>
            <div className="text-4xl font-extrabold my-3 text-foreground">$199<span className="text-base font-medium">/mo</span></div>
            <p className="text-xs text-muted-foreground mb-4">Per account</p>
            <ul className="space-y-2 text-card-foreground text-sm mb-4">
              <li>✓ Unlimited team members</li>
              <li>✓ Unlimited messages</li>
              <li>✓ AI assistant (unlimited)</li>
              <li>✓ Unlimited API calls</li>
              <li>✓ Custom integrations</li>
              <li>✓ 24/7 support + Account manager</li>
            </ul>
            <div className="border-t border-border pt-3 mb-4">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Includes:</p>
              <p className="text-xs text-muted-foreground">Custom SLA</p>
              <p className="text-xs text-muted-foreground">Dedicated infrastructure</p>
              <p className="text-xs text-muted-foreground">White-label options available</p>
            </div>
            <Button onClick={() => navigate("/pricing")} className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Contact Sales
            </Button>
          </div>
        </div>

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
                    <td className="py-3">WhatsApp messages/mo</td>
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
                Important: Our platform fees cover access to the À La Carte Chat platform only. 
                You must pay separately to third-party service providers for message delivery costs.
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
                  <p className="font-semibold mb-2">Facebook & Instagram (Meta):</p>
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
                  <li>• <strong className="text-foreground">Total: $79-$179/month</strong></li>
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
            All prices in USD. Billing is monthly. You can upgrade, downgrade, or cancel anytime. 
            7-day free trial available on all paid plans. No credit card required for Free plan.
          </p>
        </div>
      </section>

      {/* CTA Band */}
      <section className="bg-[#0e0e10] text-white py-20 px-6 text-center">
        <h2 className="text-4xl font-bold mb-4">Be ready on every channel</h2>
        <p className="text-lg mb-6">Switch to À La Carte Chat and keep every customer conversation in one place.</p>
        <Button onClick={() => navigate(user ? "/dashboard" : "/signup")} className="rounded-full bg-white text-[#0e0e10] hover:bg-white/90 font-bold px-8 py-6">
          Start free trial
        </Button>
      </section>

      {/* Footer */}
      <footer className="py-11 px-6 text-center text-muted-foreground" id="contact">
        © 2025 À La Carte Chat — All rights reserved.
      </footer>
    </div>
    </>;
};
export default Landing;