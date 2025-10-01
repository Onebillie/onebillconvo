import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StatusTag {
  id: string;
  name: string;
  color: string;
}

interface ConversationFiltersProps {
  onFilterChange: (filters: {
    unread: boolean;
    statusIds: string[];
  }) => void;
}

export const ConversationFilters = ({ onFilterChange }: ConversationFiltersProps) => {
  const [statusTags, setStatusTags] = useState<StatusTag[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  useEffect(() => {
    fetchStatusTags();
  }, []);

  useEffect(() => {
    onFilterChange({
      unread: showUnreadOnly,
      statusIds: selectedStatuses,
    });
  }, [showUnreadOnly, selectedStatuses, onFilterChange]);

  const fetchStatusTags = async () => {
    const { data } = await supabase
      .from("conversation_status_tags")
      .select("*")
      .order("name");
    
    setStatusTags(data || []);
  };

  const toggleStatus = (statusId: string) => {
    setSelectedStatuses(prev =>
      prev.includes(statusId)
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const clearFilters = () => {
    setShowUnreadOnly(false);
    setSelectedStatuses([]);
  };

  const hasActiveFilters = showUnreadOnly || selectedStatuses.length > 0;

  return (
    <div className="px-4 py-2 border-b border-border bg-background space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Unread filter */}
        <Button
          variant={showUnreadOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
        >
          Unread
        </Button>

        {/* Status filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusTags.map((status) => (
              <DropdownMenuItem
                key={status.id}
                onClick={() => toggleStatus(status.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <Badge
                    style={{
                      backgroundColor: `${status.color}20`,
                      borderColor: status.color,
                      color: status.color,
                    }}
                    variant="outline"
                  >
                    {status.name}
                  </Badge>
                  {selectedStatuses.includes(status.id) && (
                    <span className="text-primary">✓</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {selectedStatuses.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedStatuses.map((statusId) => {
            const status = statusTags.find(s => s.id === statusId);
            if (!status) return null;
            return (
              <Badge
                key={statusId}
                style={{
                  backgroundColor: `${status.color}20`,
                  borderColor: status.color,
                  color: status.color,
                }}
                variant="outline"
                className="cursor-pointer"
                onClick={() => toggleStatus(statusId)}
              >
                {status.name}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
