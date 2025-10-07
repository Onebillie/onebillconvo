import { useState, useEffect } from "react";

export interface CountryInfo {
  country: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  NGN: "₦",
  ZAR: "R",
  KES: "KSh",
  GHS: "₵",
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Europe
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", PT: "EUR", GR: "EUR", IE: "EUR", FI: "EUR", LU: "EUR",
  
  // UK
  GB: "GBP",
  
  // India
  IN: "INR",
  
  // Africa
  NG: "NGN",
  ZA: "ZAR",
  KE: "KES",
  GH: "GHS",
  
  // Default to USD for other countries
};

export function useCountryPricing() {
  const [countryInfo, setCountryInfo] = useState<CountryInfo>({
    country: "United States",
    countryCode: "US",
    currency: "USD",
    currencySymbol: "$",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Check if we have cached country info
        const cached = localStorage.getItem("countryInfo");
        if (cached) {
          setCountryInfo(JSON.parse(cached));
          setLoading(false);
          return;
        }

        // Fetch country info from ipapi.co (free, no API key needed)
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("Failed to fetch country info");
        
        const data = await response.json();
        
        const currency = COUNTRY_CURRENCY_MAP[data.country_code] || "USD";
        const info: CountryInfo = {
          country: data.country_name || "United States",
          countryCode: data.country_code || "US",
          currency,
          currencySymbol: CURRENCY_SYMBOLS[currency] || "$",
        };

        // Cache for 24 hours
        localStorage.setItem("countryInfo", JSON.stringify(info));
        setCountryInfo(info);
      } catch (error) {
        console.error("Error detecting country:", error);
        // Default to US
        const defaultInfo: CountryInfo = {
          country: "United States",
          countryCode: "US",
          currency: "USD",
          currencySymbol: "$",
        };
        setCountryInfo(defaultInfo);
      } finally {
        setLoading(false);
      }
    };

    detectCountry();
  }, []);

  return { countryInfo, loading };
}
