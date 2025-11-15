import { Input } from "@/components/ui/input";
import { formatPhone, toDisplay, toE164 } from "@/lib/phoneUtils";
import { useState, useEffect } from "react";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Auto-formatting phone input component
 * 
 * Features:
 * - Stores phone numbers in E.164 format (+353858007335)
 * - Displays in user-friendly format (+353 85 800 7335)
 * - Auto-formats on blur
 * - Allows typing in any format
 */
export const PhoneInput = ({ value, onValueChange, className, ...props }: PhoneInputProps) => {
  const [displayValue, setDisplayValue] = useState(() => {
    // Initialize with display format if value exists
    return value ? toDisplay(value) : '';
  });

  // Sync display value when external value changes
  useEffect(() => {
    if (value && toE164(displayValue) !== value) {
      setDisplayValue(toDisplay(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Allow user to type freely
    setDisplayValue(input);
    
    // Store in E.164 format
    const formatted = formatPhone(input);
    onValueChange(formatted.e164);
  };

  const handleBlur = () => {
    // Format on blur for nice display
    if (displayValue) {
      const formatted = toDisplay(value || displayValue);
      setDisplayValue(formatted);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all on focus for easy editing
    e.target.select();
  };

  return (
    <Input
      {...props}
      type="tel"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder="+353 85 800 7335"
      className={className}
    />
  );
};
