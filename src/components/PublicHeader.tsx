import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Settings, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};
export const PublicHeader = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    user,
    profile,
    signOut
  } = useAuth();
  return <>
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => navigate("/")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-foreground">À La Carte Chat</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              
              <button onClick={() => navigate('/why-us')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Why Us
              </button>
              <button onClick={() => navigate('/pricing')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Pricing
              </button>
              <button onClick={() => navigate('/faq')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                FAQ
              </button>
              <button onClick={() => navigate('/guides')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Guides
              </button>
            </div>

            {/* Desktop CTA / Profile */}
            <div className="hidden md:flex items-center gap-3">
              {user ? <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={user?.email || "User"} />
                        <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/app/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> : <>
                  <Button onClick={() => navigate("/auth")} variant="ghost" className="rounded-full" size="sm">
                    Login
                  </Button>
                  <Button onClick={() => navigate("/signup")} className="rounded-full" size="sm">
                    Start Free Trial
                  </Button>
                </>}
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-foreground hover:text-primary transition-colors" aria-label="Toggle menu">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && <div className="md:hidden fixed top-16 left-0 right-0 z-40 border-b bg-background/95 backdrop-blur-md shadow-lg">
          <div className="px-4 py-4 flex flex-col gap-3 max-w-7xl mx-auto">
            <button onClick={() => {
          navigate('/features');
          setMobileMenuOpen(false);
        }} className="text-left text-foreground hover:text-primary transition-colors py-2 font-medium">
              Features
            </button>
            <button onClick={() => {
          navigate('/why-us');
          setMobileMenuOpen(false);
        }} className="text-left text-foreground hover:text-primary transition-colors py-2 font-medium">
              Why Us
            </button>
            <button onClick={() => {
          navigate('/pricing');
          setMobileMenuOpen(false);
        }} className="text-left text-foreground hover:text-primary transition-colors py-2 font-medium">
              Pricing
            </button>
            <button onClick={() => {
          navigate('/faq');
          setMobileMenuOpen(false);
        }} className="text-left text-foreground hover:text-primary transition-colors py-2 font-medium">
              FAQ
            </button>
            <button onClick={() => {
          navigate('/guides');
          setMobileMenuOpen(false);
        }} className="text-left text-foreground hover:text-primary transition-colors py-2 font-medium">
              Guides
            </button>
            {user ? <>
                <button onClick={() => {
            navigate('/app/dashboard');
            setMobileMenuOpen(false);
          }} className="text-left text-foreground hover:text-primary transition-colors py-2 font-medium">
                  Dashboard
                </button>
                <button onClick={() => {
            navigate('/app/settings');
            setMobileMenuOpen(false);
          }} className="text-left text-foreground hover:text-primary transition-colors py-2 font-medium">
                  Settings
                </button>
                <Button onClick={() => {
            signOut();
            setMobileMenuOpen(false);
          }} variant="outline" className="rounded-full mt-2 w-full">
                  Sign Out
                </Button>
              </> : <div className="flex flex-col gap-2 mt-2">
                <Button onClick={() => {
            navigate("/auth");
            setMobileMenuOpen(false);
          }} variant="outline" className="rounded-full w-full">
                  Login
                </Button>
                <Button onClick={() => {
            navigate("/signup");
            setMobileMenuOpen(false);
          }} className="rounded-full w-full">
                  Start Free Trial
                </Button>
              </div>}
          </div>
        </div>}
    </>;
};