import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

export const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="p-4 shadow-lg border-2">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-sm">Cookie Notice</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleDecline}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          We use cookies to enhance your experience, analyze site traffic, and serve personalized content. By clicking "Accept", you consent to our use of cookies.{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Learn more
          </Link>
        </p>
        <div className="flex gap-2">
          <Button onClick={handleAccept} size="sm" className="flex-1">
            Accept
          </Button>
          <Button onClick={handleDecline} variant="outline" size="sm" className="flex-1">
            Decline
          </Button>
        </div>
      </Card>
    </div>
  );
};
