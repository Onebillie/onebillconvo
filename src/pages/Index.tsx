// Update this page (the content is just a fallback if you fail to update the page)

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-6">
            <MessageSquare className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4">
            Customer Service Portal
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Multi-agent WhatsApp Business messaging platform for seamless customer support
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="text-lg px-8 py-6"
          >
            Sign In
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 rounded-lg border border-border">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Multi-Agent Support</h3>
            <p className="text-muted-foreground">
              10 agents can collaborate from different locations with real-time messaging
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg border border-border">
            <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">WhatsApp Business</h3>
            <p className="text-muted-foreground">
              Full WhatsApp Business API integration with file sharing capabilities
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg border border-border">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure Access</h3>
            <p className="text-muted-foreground">
              Role-based authentication ensures only authorized agents can access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
