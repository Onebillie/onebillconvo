import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
const Landing = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  useEffect(() => {
    document.title = "À La Carte Chat — Unified Messaging Platform";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Bring WhatsApp Business API, email, SMS, Instagram and AI into one powerful inbox. Trusted by 1,000+ businesses worldwide.");
    }
  }, []);
  return <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80">
        <nav className="max-w-[1200px] mx-auto px-5 py-4 flex items-center gap-7">
          <div className="font-extrabold tracking-tight text-foreground">À La Carte Chat</div>
          <a href="#features" className="text-foreground hover:opacity-70 transition-opacity">Features</a>
          <a href="#pricing" className="text-foreground hover:opacity-70 transition-opacity">Pricing</a>
          <a href="#contact" className="text-foreground hover:opacity-70 transition-opacity">Contact</a>
          <div className="flex-1" />
          <Button onClick={() => navigate(user ? "/dashboard" : "/auth")} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6">
            {user ? "Dashboard" : "Book a demo"}
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-6">
        <div className="mt-16 max-w-[1100px] relative z-10">
          <h1 className="text-[clamp(3.2rem,11vw,8rem)] leading-[0.95] font-black tracking-tight uppercase">
            STOP JUGGLING<br />APPS.<br />START CLOSING<br />DEALS.
          </h1>
          <p className="mt-6 max-w-[760px] mx-auto text-muted-foreground text-lg">An Unified Team Inbox For All Your Communication Channels
With Your Very Own AI ChatBot Ready To Respond When Your Team Cant
        </p>
          <Button onClick={() => navigate(user ? "/dashboard" : "/signup")} className="mt-7 px-8 py-6 text-base rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-lg">
            Try Free For 7 Days!
          </Button>
        </div>

        {/* Floating Icons */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* WhatsApp - top left */}
          <div className="absolute left-[6%] top-[10%] w-20 h-20 animate-float-a">
            <svg viewBox="0 0 64 64" className="w-full h-full">
              <circle cx="32" cy="32" r="30" fill="#25D366" />
              <path fill="#fff" d="M45 33c0 7-6 12-13 12-2 0-5-.6-7-1.8L17 45l2.1-7c-1.3-2.1-2.1-4.5-2.1-7 0-7 6-13 13-13s15 6 15 14z" opacity=".95" />
              <path fill="#25D366" d="M27 24c-.6 0-1 .5-1 1 0 7 5 12 12 12 .6 0 1-.4 1-1v-2c0-.6-.4-1-1-1-1 0-2-.2-3-.6l-1-.4-1 .5c-.4.2-.8.1-1-.2l-2-2c-.3-.3-.3-.8-.1-1.1l.6-1c.1-.2.1-.5 0-.7l-1.1-2c-.2-.4-.6-.6-1-.6H27z" />
            </svg>
          </div>

          {/* Email - top right */}
          <div className="absolute right-[8%] top-[14%] w-20 h-20 animate-float-b">
            <svg viewBox="0 0 64 64" className="w-full h-full">
              <rect x="6" y="14" width="52" height="36" rx="6" fill="#ffffff" stroke="#e55436" strokeWidth="4" />
              <path d="M8 18l24 18L56 18" fill="none" stroke="#e55436" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          {/* WhatsApp alt - bottom left */}
          <div className="absolute left-[10%] bottom-[16%] w-24 h-24 animate-float-c">
            <svg viewBox="0 0 64 64" className="w-full h-full">
              <circle cx="32" cy="32" r="30" fill="#25D366" />
              <path fill="#fff" d="M45 33c0 7-6 12-13 12-2 0-5-.6-7-1.8L17 45l2.1-7c-1.3-2.1-2.1-4.5-2.1-7 0-7 6-13 13-13s15 6 15 14z" opacity=".95" />
            </svg>
          </div>

          {/* Instagram - bottom right */}
          <div className="absolute right-[12%] bottom-[12%] w-24 h-24 animate-float-d">
            <svg viewBox="0 0 64 64" className="w-full h-full">
              <rect x="10" y="10" width="44" height="44" rx="12" fill="#F56040" />
              <circle cx="32" cy="32" r="10" fill="#fff" />
              <circle cx="44" cy="20" r="4" fill="#fff" />
            </svg>
          </div>

          {/* Facebook - center top */}
          <div className="absolute left-[50%] top-[22%] w-20 h-20 animate-float-e">
            <svg viewBox="0 0 64 64" className="w-full h-full">
              <circle cx="32" cy="32" r="30" fill="#1877F2" />
              <path d="M36 22h-3c-2.2 0-3 .9-3 3v3h6l-1 6h-5v12h-6V34h-4v-6h4v-4c0-4.4 2.6-8 8-8h4v6z" fill="#fff" />
            </svg>
          </div>

          {/* SMS - center bottom */}
          <div className="absolute right-[44%] bottom-[16%] w-20 h-20 animate-float-f">
            <svg viewBox="0 0 64 64" className="w-full h-full">
              <rect x="8" y="12" width="48" height="34" rx="8" fill="#00C389" />
              <path d="M22 52l10-6H44" fill="#00C389" />
              <circle cx="22" cy="29" r="3" fill="#fff" />
              <circle cx="32" cy="29" r="3" fill="#fff" />
              <circle cx="42" cy="29" r="3" fill="#fff" />
            </svg>
          </div>

          {/* ChatBot */}
          <div className="absolute left-[18%] top-[24%] w-24 h-24 animate-float-b">
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
      <section className="relative h-40 flex items-center overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-foreground/8" />
        <div className="whitespace-nowrap text-[clamp(1.6rem,5vw,2.4rem)] font-extrabold text-foreground/90 animate-scroll">
          UNIFY • SIMPLIFY • RESPOND FASTER • DELIGHT CUSTOMERS • UNIFY • SIMPLIFY • RESPOND FASTER • DELIGHT CUSTOMERS •
        </div>
      </section>

      {/* Channels Marquee */}
      <section className="bg-card py-20 text-center" id="features">
        <h2 className="text-4xl font-bold mb-8 text-foreground">All your channels in one place</h2>
        <div className="overflow-hidden mask-marquee">
          <div className="flex gap-4 animate-marquee">
            {["WhatsApp Business", "SMS", "Email", "Instagram DMs", "Facebook Messenger", "Website Widget", "Voice & Files", "Team & Tasks", "AI Assistant", "Developer API"].map((item, i) => <div key={i} className="min-w-[240px] px-6 py-9 rounded-2xl bg-primary text-primary-foreground font-bold text-center shadow-md">
                {item}
              </div>)}
            {["WhatsApp Business", "SMS", "Email", "Instagram DMs", "Facebook Messenger", "Website Widget", "Voice & Files", "Team & Tasks", "AI Assistant", "Developer API"].map((item, i) => <div key={`dup-${i}`} className="min-w-[240px] px-6 py-9 rounded-2xl bg-primary text-primary-foreground font-bold text-center shadow-md">
                {item}
              </div>)}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
      <section className="bg-background py-20 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#12b886] text-white p-11 text-center">
            <div className="text-4xl font-bold">1k+</div>
            <div className="text-sm opacity-95 mt-2">businesses</div>
          </div>
          <div className="rounded-2xl bg-[#4dabf7] text-white p-11 text-center">
            <div className="text-4xl font-bold">5M+</div>
            <div className="text-sm opacity-95 mt-2">messages processed</div>
          </div>
          <div className="rounded-2xl bg-[#ff922b] text-white p-11 text-center">
            <div className="text-4xl font-bold">24/7</div>
            <div className="text-sm opacity-95 mt-2">AI assistance</div>
          </div>
          <div className="rounded-2xl bg-[#e64980] text-white p-11 text-center">
            <div className="text-4xl font-bold">200+</div>
            <div className="text-sm opacity-95 mt-2">countries</div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-card py-20 px-6 text-center">
        <h2 className="text-4xl font-bold mb-8 text-foreground">Get started in 5 minutes</h2>
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
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
      <section className="bg-background py-24 px-6 text-center" id="pricing">
        <h2 className="text-4xl font-bold mb-8 text-foreground">Simple pricing</h2>
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-card rounded-2xl shadow-lg p-6 text-left">
            <h3 className="font-bold text-xl mb-2 text-card-foreground">Free</h3>
            <div className="text-4xl font-extrabold my-3 text-foreground">$0</div>
            <ul className="space-y-2 text-card-foreground text-sm">
              <li>1 team member</li>
              <li>100 WhatsApp msgs/mo</li>
              <li>Unlimited receiving</li>
              <li>5 basic templates</li>
              <li>Email integration</li>
              <li>Community support</li>
            </ul>
            <Button onClick={() => navigate("/signup")} className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Start Free
            </Button>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-6 text-left border-2 border-accent">
            <h3 className="font-bold text-xl mb-2 text-card-foreground">Starter</h3>
            <div className="text-4xl font-extrabold my-3 text-foreground">$29<span className="text-base font-medium">/mo</span></div>
            <ul className="space-y-2 text-card-foreground text-sm">
              <li>2 team members</li>
              <li>1,000 WhatsApp msgs/mo</li>
              <li>Unlimited receiving</li>
              <li>20 basic templates</li>
              <li>Email integration</li>
              <li>Email support</li>
            </ul>
            <Button onClick={() => navigate("/pricing")} className="mt-4 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              Get Started
            </Button>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-6 text-left">
            <h3 className="font-bold text-xl mb-2 text-card-foreground">Professional</h3>
            <div className="text-4xl font-extrabold my-3 text-foreground">$79<span className="text-base font-medium">/mo</span></div>
            <ul className="space-y-2 text-card-foreground text-sm">
              <li>10 team members</li>
              <li>10,000 WhatsApp msgs/mo</li>
              <li>Unlimited templates</li>
              <li>AI assistant (1,000 responses)</li>
              <li>API access</li>
              <li>Priority support</li>
            </ul>
            <Button onClick={() => navigate("/pricing")} className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Choose Professional
            </Button>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-6 text-left">
            <h3 className="font-bold text-xl mb-2 text-card-foreground">Enterprise</h3>
            <div className="text-4xl font-extrabold my-3 text-foreground">$199<span className="text-base font-medium">/mo</span></div>
            <ul className="space-y-2 text-card-foreground text-sm">
              <li>Unlimited team members</li>
              <li>Unlimited messages</li>
              <li>AI assistant (unlimited)</li>
              <li>24/7 premium support</li>
              <li>Custom integrations</li>
              <li>Account manager</li>
            </ul>
            <Button onClick={() => navigate("/pricing")} className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Contact Sales
            </Button>
          </div>
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
    </div>;
};
export default Landing;