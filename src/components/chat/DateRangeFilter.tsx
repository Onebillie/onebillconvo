import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface DateRangeFilterProps {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
}

export const DateRangeFilter = ({ from, to, onChange }: DateRangeFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: "Today", getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
    { label: "Yesterday", getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
    { label: "Last 7 days", getValue: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
    { label: "Last 30 days", getValue: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  ];

  const handlePreset = (getValue: () => { from: Date; to: Date }) => {
    const { from: newFrom, to: newTo } = getValue();
    onChange(newFrom, newTo);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null, null);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!from && !to) return "Date range";
    if (from && to) {
      return `${format(from, "MMM d")} - ${format(to, "MMM d")}`;
    }
    if (from) return `From ${format(from, "MMM d")}`;
    if (to) return `Until ${format(to, "MMM d")}`;
    return "Date range";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={from || to ? "default" : "outline"}
          size="sm"
          className="justify-start"
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-popover" align="start">
        <div className="p-3 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Quick select</span>
            {(from || to) && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handlePreset(preset.getValue)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="p-3">
          <Calendar
            mode="range"
            selected={{ from: from || undefined, to: to || undefined }}
            onSelect={(range) => {
              onChange(range?.from || null, range?.to || null);
            }}
            numberOfMonths={1}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};