import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";
import { useEffect, useRef } from "react";

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
    <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search in conversation... (Ctrl+F)"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-4 h-9 bg-background"
        />
      </div>
      
      {searchTerm && (
        <>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {matchCount > 0 ? `${currentIndex + 1}/${matchCount}` : 'No matches'}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={matchCount === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={matchCount === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClear();
              onClose?.();
            }}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
};