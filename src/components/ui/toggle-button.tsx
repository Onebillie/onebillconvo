import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

export const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ className, pressed, onPressedChange, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          pressed
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted hover:text-muted-foreground",
          className
        )}
        data-state={pressed ? "on" : "off"}
        onClick={() => onPressedChange?.(!pressed)}
        {...props}
      />
    );
  }
);

ToggleButton.displayName = "ToggleButton";
