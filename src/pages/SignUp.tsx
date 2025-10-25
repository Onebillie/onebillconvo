import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Check, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PRODUCTS, type SubscriptionTier, formatPrice } from "@/lib/stripeConfig";

const STEPS = [
  { id: 1, title: "Personal Information", description: "Tell us about yourself" },
  { id: 2, title: "Business Details", description: "Your business information" },
  { id: 3, title: "Choose Your Plan", description: "Select the perfect plan" },
  { id: 4, title: "Review & Confirm", description: "Review your selection" },
  { id: 5, title: "Create Account", description: "Set up your credentials" },
  { id: 6, title: "Payment", description: "Complete your subscription" },
];

interface SignUpData {
  firstName: string;
  lastName: string;
  contactPhone: string;
  accountType: "business" | "personal";
  businessName?: string;
  selectedPlan: SubscriptionTier | null;
  addOns: string[];
  agreedToRequirements: boolean;
  email: string;
  password: string;
}

export default function SignUp() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState<SignUpData>({
    firstName: "",
    lastName: "",
    contactPhone: "",
    accountType: "business",
    businessName: "",
    selectedPlan: null,
    addOns: [],
    agreedToRequirements: false,
    email: "",
    password: "",
  });

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && profile) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [authLoading, profile, navigate]);

  const updateFormData = (field: keyof SignUpData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.contactPhone) {
        toast({
          title: "Required fields",
          description: "Please fill in all personal information",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (currentStep === 2) {
      if (formData.accountType === "business" && !formData.businessName) {
        toast({
          title: "Business name required",
          description: "Please enter your business name",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === 3) {
      if (!formData.selectedPlan) {
        toast({
          title: "Plan selection required",
          description: "Please select a plan to continue",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === 4) {
      if (!formData.agreedToRequirements) {
        toast({
          title: "Agreement required",
          description: "Please confirm you understand the requirements",
          variant: "destructive",
        });
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handlePayment = async () => {
    if (!formData.selectedPlan) return;
    
    // If free plan, skip payment and go directly to completion
    if (formData.selectedPlan === 'free') {
      toast({
        title: "Free plan selected",
        description: "Welcome aboard! Redirecting to your dashboard...",
      });
      navigate("/app/onboarding");
      return;
    }
    
    setLoading(true);
    try {
      // Create Stripe checkout session for paid plans
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: STRIPE_PRODUCTS[formData.selectedPlan].priceId,
          quantity: 1,
        },
      });

      if (error) throw error;
      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Required fields",
        description: "Please enter email and password",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/app/dashboard`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            first_name: formData.firstName,
            last_name: formData.lastName,
            contact_phone: formData.contactPhone,
            account_type: formData.accountType,
            business_name: formData.businessName,
            selected_plan: formData.selectedPlan,
          },
        },
      });

      if (authError) throw authError;

      // Store pending subscription for payment completion after email verification
      if (authData.user && formData.selectedPlan && formData.selectedPlan !== 'free') {
        const { error: pendingError } = await supabase
          .from('pending_subscriptions')
          .insert({
            user_id: authData.user.id,
            email: formData.email,
            selected_plan: formData.selectedPlan,
          });

        if (pendingError) {
          console.error('Error storing pending subscription:', pendingError);
        }
      }

      // Check if we have a valid session (depends on email confirmation settings)
      if (!authData.session) {
        toast({
          title: "Email verification required",
          description: "Please verify your email by clicking the link we sent. After verification, sign in to complete your payment.",
          variant: "default",
        });
        // Redirect to sign in page
        navigate("/auth");
        return;
      }

      toast({
        title: "Account created!",
        description: "Now proceeding to payment...",
      });
      
      // Move to payment step (user has valid session)
      setCurrentStep(6);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!formData.selectedPlan) return 0;
    return STRIPE_PRODUCTS[formData.selectedPlan].price || 0;
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">À La Carte Chat</span>
          </div>
          <Button onClick={() => navigate("/auth")} variant="ghost">
            Already have an account? Sign In
          </Button>
        </div>
      </header>
      
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl">
                {STEPS[currentStep - 1].title}
              </CardTitle>
              <CardDescription>
                {STEPS[currentStep - 1].description}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Surname *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone Number *</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.contactPhone}
                  onChange={(e) => updateFormData("contactPhone", e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This is your personal contact number, not your WhatsApp API number
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Business Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Account Type *</Label>
                <RadioGroup
                  value={formData.accountType}
                  onValueChange={(value) => updateFormData("accountType", value as "business" | "personal")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="business" id="business" />
                    <Label htmlFor="business" className="cursor-pointer font-normal">Business</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="personal" id="personal" />
                    <Label htmlFor="personal" className="cursor-pointer font-normal">Personal</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.accountType === "business" && (
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => updateFormData("businessName", e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Choose Plan */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.entries(STRIPE_PRODUCTS) as [SubscriptionTier, typeof STRIPE_PRODUCTS[SubscriptionTier]][]).map(([tier, config]) => (
                  <Card
                    key={tier}
                    className={`relative p-6 cursor-pointer transition-all hover:shadow-lg ${
                      config.popular
                        ? "border-primary border-2 shadow-lg"
                        : formData.selectedPlan === tier
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => updateFormData("selectedPlan", tier)}
                  >
                    {config.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-pink-500 text-xs">
                        Popular
                      </Badge>
                    )}
                    {formData.selectedPlan === tier && !config.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-xs">
                        Selected
                      </Badge>
                    )}
                    
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">{config.name}</h3>
                      <div className="mb-1">
                        {config.price === 0 ? (
                          <span className="text-3xl font-bold">Free</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">
                              {formatPrice(config.price)}
                            </span>
                            <span className="text-muted-foreground text-sm">/{config.interval}</span>
                          </>
                        )}
                      </div>
                      {config.price > 0 && (
                        <p className="text-xs text-muted-foreground">per seat</p>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {config.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs">
                          <Check className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {config.features.length > 4 && (
                        <li className="text-xs text-muted-foreground">
                          + {config.features.length - 4} more
                        </li>
                      )}
                    </ul>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Plan:</span>
                      <span className="font-medium">
                        {formData.selectedPlan ? STRIPE_PRODUCTS[formData.selectedPlan].name : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-medium">${calculateTotal()}/{formData.selectedPlan ? STRIPE_PRODUCTS[formData.selectedPlan].interval : "month"}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold text-lg">${calculateTotal()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="requirements"
                      checked={formData.agreedToRequirements}
                      onCheckedChange={(checked) => 
                        updateFormData("agreedToRequirements", checked === true)
                      }
                    />
                    <label htmlFor="requirements" className="text-sm leading-relaxed cursor-pointer">
                      I understand I will need a separate Meta/WhatsApp Business API account, 
                      AI LLM membership, and Email account hosted elsewhere to connect to AlacarteChat *
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Create Account */}
          {currentStep === 5 && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Account Email (for MFA) *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
            </form>
          )}

          {/* Step 6: Payment */}
          {currentStep === 6 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Ready for Payment</h3>
              <p className="text-muted-foreground">
                Click below to proceed to secure payment with Stripe
              </p>
              <div className="p-4 bg-muted rounded-lg max-w-md mx-auto space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Plan:</span>
                    <span className="font-medium">
                      {formData.selectedPlan ? STRIPE_PRODUCTS[formData.selectedPlan].name : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>First Payment Due Now:</span>
                    <span className="text-lg">${calculateTotal()}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground text-left">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    <p>
                      <span className="font-semibold text-foreground">Ongoing Monthly Subscription:</span> Your payment will be processed immediately. You will be automatically charged ${calculateTotal()} every month until you cancel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            {currentStep > 1 && currentStep < 6 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            
            {currentStep < 5 && (
              <Button onClick={handleNext} className="ml-auto">
                Next
              </Button>
            )}

            {currentStep === 5 && (
              <Button onClick={handleCreateAccount} disabled={loading} className="ml-auto">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            )}

            {currentStep === 6 && (
              <Button onClick={handlePayment} disabled={loading} className="ml-auto">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Payment"
                )}
              </Button>
            )}
          </div>

          {/* Sign In Link */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
