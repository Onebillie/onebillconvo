import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DollarSign, MessageSquare, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

// Twilio SMS pricing (approximate, per message)
const SMS_PRICING: Record<string, { cost: number; currency: string; segments: number }> = {
  US: { cost: 0.0079, currency: "USD", segments: 1 },
  CA: { cost: 0.0075, currency: "USD", segments: 1 },
  GB: { cost: 0.04, currency: "USD", segments: 1 },
  AU: { cost: 0.083, currency: "USD", segments: 1 },
  DE: { cost: 0.075, currency: "EUR", segments: 1 },
  FR: { cost: 0.075, currency: "EUR", segments: 1 },
  ES: { cost: 0.075, currency: "EUR", segments: 1 },
  IT: { cost: 0.075, currency: "EUR", segments: 1 },
  IN: { cost: 0.008, currency: "USD", segments: 1 },
  BR: { cost: 0.03, currency: "USD", segments: 1 },
  MX: { cost: 0.015, currency: "USD", segments: 1 },
  ZA: { cost: 0.025, currency: "USD", segments: 1 },
  NG: { cost: 0.08, currency: "USD", segments: 1 },
  KE: { cost: 0.08, currency: "USD", segments: 1 },
  CN: { cost: 0.06, currency: "USD", segments: 1 },
  JP: { cost: 0.08, currency: "USD", segments: 1 },
  SG: { cost: 0.05, currency: "USD", segments: 1 },
  AE: { cost: 0.04, currency: "USD", segments: 1 },
  OTHER: { cost: 0.05, currency: "USD", segments: 1 },
};

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "OTHER", name: "Other Countries" },
];

interface SmsCostCalculatorProps {
  messageLength?: number;
  onCostCalculated?: (cost: number, country: string) => void;
}

export function SmsCostCalculator({ messageLength = 0, onCostCalculated }: SmsCostCalculatorProps) {
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [customMessageLength, setCustomMessageLength] = useState(messageLength);
  const [estimatedCost, setEstimatedCost] = useState(0);

  // SMS segments: 160 chars for GSM-7, 70 for Unicode
  const calculateSegments = (length: number) => {
    const hasUnicode = /[^\x00-\x7F]/.test(String(length));
    const segmentSize = hasUnicode ? 70 : 160;
    return Math.ceil(length / segmentSize) || 1;
  };

  useEffect(() => {
    const pricing = SMS_PRICING[selectedCountry];
    const segments = calculateSegments(customMessageLength);
    const cost = pricing.cost * segments;
    setEstimatedCost(cost);
    
    if (onCostCalculated) {
      onCostCalculated(cost, selectedCountry);
    }
  }, [selectedCountry, customMessageLength, onCostCalculated]);

  const segments = calculateSegments(customMessageLength);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          SMS Cost Calculator
        </CardTitle>
        <CardDescription>
          Estimate SMS costs before sending (Twilio pricing)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="country">Destination Country</Label>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message-length">Message Length</Label>
          <Input
            id="message-length"
            type="number"
            min="0"
            value={customMessageLength}
            onChange={(e) => setCustomMessageLength(parseInt(e.target.value) || 0)}
            placeholder="Enter character count"
          />
          <p className="text-xs text-muted-foreground">
            Current message: {customMessageLength} characters
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">SMS Segments:</span>
            <Badge variant="secondary">
              <MessageSquare className="w-3 h-3 mr-1" />
              {segments} segment{segments > 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Cost per segment:</span>
            <span className="text-sm font-medium">
              ${SMS_PRICING[selectedCountry].cost.toFixed(4)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Estimated Total Cost:</span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-primary">
                ${estimatedCost.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              * Prices are approximate and based on Twilio's standard rates. Actual costs may vary.
              {segments > 1 && (
                <span className="block mt-1">
                  Messages over 160 chars (GSM-7) or 70 chars (Unicode) are split into multiple segments.
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
