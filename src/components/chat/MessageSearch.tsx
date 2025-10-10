import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MessageSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  matchCount: number;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onClear: () => void;
  onClose?: () => void;
}

export const MessageSearch = ({
  searchTerm,
  onSearchChange,
  matchCount,
  currentIndex,
  onNext,
  onPrevious,
  onClear,
  onClose,
}: MessageSearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        onClear();
        onClose?.();
      }
      if (e.key === 'Enter' && searchTerm) {
        e.preventDefault();
        if (e.shiftKey) {
          onPrevious();
        } else {
          onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, onNext, onPrevious, onClear, onClose]);

  return (
    <div className="flex items-center gap-1 md:gap-2 p-2 border-b border-border bg-muted/30">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={isMobile ? "Search..." : "Search in conversation... (Ctrl+F)"}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-7 md:pl-9 pr-2 h-8 md:h-9 bg-background text-sm"
        />
      </div>
      
      {searchTerm && (
        <>
          <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
            {matchCount > 0 ? `${currentIndex + 1}/${matchCount}` : 'None'}
          </span>
          <div className="flex gap-0.5 md:gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={matchCount === 0}
              className="h-7 w-7 md:h-8 md:w-8 p-0"
              title="Previous match"
            >
              <ChevronUp className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={matchCount === 0}
              className="h-7 w-7 md:h-8 md:w-8 p-0"
              title="Next match"
            >
              <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClear();
              onClose?.();
            }}
            className="h-7 w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
            title="Close search"
          >
            <X className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </>
      )}
    </div>
  );
};