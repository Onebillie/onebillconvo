import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { STRIPE_PRODUCTS, type SubscriptionTier } from "@/lib/stripeConfig";

const STEPS = [
  { id: 1, title: "Personal Information", description: "Tell us about yourself" },
  { id: 2, title: "Business Details", description: "Your business information" },
  { id: 3, title: "Choose Your Plan", description: "Select the perfect plan" },
  { id: 4, title: "Review & Confirm", description: "Review your selection" },
  { id: 5, title: "Payment", description: "Complete your subscription" },
  { id: 6, title: "Create Account", description: "Set up your credentials" },
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
    
    // If free plan (Starter), skip payment and go directly to account creation
    if (formData.selectedPlan === 'starter') {
      toast({
        title: "Free plan selected",
        description: "No payment required. Let's create your account!",
      });
      setCurrentStep(6); // Skip payment and go to account creation
      return;
    }
    
    setLoading(true);
    try {
      // Create Stripe checkout session for paid plans
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: STRIPE_PRODUCTS[formData.selectedPlan].priceId,
          quantity: 1,
          metadata: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            contactPhone: formData.contactPhone,
            accountType: formData.accountType,
            businessName: formData.businessName,
          },
        },
      });

      if (error) throw error;

      if (data.url) {
        // Store form data in sessionStorage before redirecting
        sessionStorage.setItem("signupData", JSON.stringify(formData));
        window.open(data.url, '_blank');
        
        // Move to next step after opening payment in new tab
        toast({
          title: "Payment window opened",
          description: "Complete payment in the new window, then return to create your account",
        });
        setCurrentStep(6);
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
      const redirectUrl = `${window.location.origin}/app/onboarding`;
      
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

      // Clear stored data
      sessionStorage.removeItem("signupData");

      // Check if user is immediately confirmed (email confirmation disabled)
      if (authData.user && authData.session) {
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully",
        });
        // User is logged in, redirect to onboarding
        navigate("/app/onboarding");
      } else {
        // Email confirmation required
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account, then you can sign in",
        });
        // Redirect to auth page to allow sign in after verification
        navigate("/auth");
      }
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
    return STRIPE_PRODUCTS[formData.selectedPlan].price;
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
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
            <div className="space-y-4">
              <div className="grid gap-4">
                {(Object.entries(STRIPE_PRODUCTS) as [SubscriptionTier, typeof STRIPE_PRODUCTS[SubscriptionTier]][]).map(([tier, config]) => (
                  <div
                    key={tier}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.selectedPlan === tier
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => updateFormData("selectedPlan", tier)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold">{config.name}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold">${config.price}</span>
                          <span className="text-muted-foreground">/{config.interval}</span>
                        </div>
                      </div>
                      {formData.selectedPlan === tier && (
                        <Badge className="bg-primary">Selected</Badge>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {config.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Ready for Payment</h3>
              <p className="text-muted-foreground">
                Click below to proceed to secure payment with Stripe
              </p>
              <div className="p-4 bg-muted rounded-lg max-w-md mx-auto">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Plan:</span>
                    <span className="font-medium">
                      {formData.selectedPlan ? STRIPE_PRODUCTS[formData.selectedPlan].name : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-lg">${calculateTotal()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Create Account */}
          {currentStep === 6 && (
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

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            {currentStep > 1 && currentStep < 5 && (
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

            {currentStep === 6 && (
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
          </div>

          {/* Sign In Link */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/auth" className="text-primary hover:underline font-medium">
                Sign in here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
