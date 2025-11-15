import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Filter, Search, ArrowUpDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DateRangeFilter } from "./DateRangeFilter";
import { ConversationFilters as FilterType } from "@/types/chat";

interface StatusTag {
  id: string;
  name: string;
  color: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

interface ConversationFiltersProps {
  onFilterChange: (filters: FilterType) => void;
  currentFilters: FilterType;
}

export const ConversationFilters = ({ onFilterChange, currentFilters }: ConversationFiltersProps) => {
  const [statusTags, setStatusTags] = useState<StatusTag[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchStatusTags();
    fetchStaffMembers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentFilters.search) {
        onFilterChange({ ...currentFilters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchStatusTags = async () => {
    const { data } = await supabase
      .from("conversation_status_tags")
      .select("*")
      .order("priority_score", { ascending: false, nullsFirst: false })
      .order("name");
    
    setStatusTags(data || []);
  };

  const fetchStaffMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    
    setStaffMembers(data || []);
  };

  const toggleStatus = (statusId: string) => {
    const newStatuses = currentFilters.statusIds.includes(statusId)
      ? currentFilters.statusIds.filter(id => id !== statusId)
      : [...currentFilters.statusIds, statusId];
    onFilterChange({ ...currentFilters, statusIds: newStatuses });
  };

  const togglePlatform = (platform: string) => {
    const newPlatforms = currentFilters.platforms.includes(platform)
      ? currentFilters.platforms.filter(p => p !== platform)
      : [...currentFilters.platforms, platform];
    onFilterChange({ ...currentFilters, platforms: newPlatforms });
  };

  const clearFilters = () => {
    setSearchInput('');
    onFilterChange({
      search: '',
      unread: false,
      statusIds: [],
      dateRange: { from: null, to: null },
      sortBy: 'newest',
      platforms: [],
      assignedTo: null,
    });
  };

  const hasActiveFilters = 
    currentFilters.search !== '' ||
    currentFilters.unread ||
    currentFilters.statusIds.length > 0 ||
    currentFilters.dateRange.from !== null ||
    currentFilters.dateRange.to !== null ||
    currentFilters.platforms.length > 0 ||
    currentFilters.assignedTo !== null;

  const platforms = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
  ];

  const sortOptions: Array<{ value: FilterType['sortBy'], label: string }> = [
    { value: 'priority', label: 'Priority' },
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'unread', label: 'Most unread' },
    { value: 'name_asc', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
  ];

  const allFilters = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Sort By</label>
        <Select
          value={currentFilters.sortBy}
          onValueChange={(value: any) => 
            onFilterChange({ ...currentFilters, sortBy: value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Date Range</label>
        <DateRangeFilter
          from={currentFilters.dateRange.from}
          to={currentFilters.dateRange.to}
          onChange={(from, to) => 
            onFilterChange({ ...currentFilters, dateRange: { from, to } })
          }
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Status</label>
        <div className="flex flex-wrap gap-2">
          {statusTags.map((status) => (
            <Badge
              key={status.id}
              style={{
                backgroundColor: currentFilters.statusIds.includes(status.id) ? `${status.color}40` : `${status.color}20`,
                borderColor: status.color,
                color: status.color,
              }}
              variant="outline"
              className="cursor-pointer"
              onClick={() => toggleStatus(status.id)}
            >
              {status.name}
              {currentFilters.statusIds.includes(status.id) && ' ✓'}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Channel</label>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <Badge
              key={platform.value}
              variant={currentFilters.platforms.includes(platform.value) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => togglePlatform(platform.value)}
            >
              {platform.label}
              {currentFilters.platforms.includes(platform.value) && ' ✓'}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Assigned To</label>
        <Select
          value={currentFilters.assignedTo || 'all'}
          onValueChange={(value) => 
            onFilterChange({ ...currentFilters, assignedTo: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Assigned" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All assigned</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {staffMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="px-3 py-2 border-b border-border bg-background space-y-2">
        {/* Search always visible */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Quick filters row */}
        <div className="flex items-center gap-2">
          <Button
            variant={currentFilters.unread ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange({ ...currentFilters, unread: !currentFilters.unread })}
            className="text-xs h-8"
          >
            Unread
          </Button>

          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-8">
                <Filter className="h-3 w-3 mr-1" />
                Filters
                {hasActiveFilters && ` (${currentFilters.statusIds.length + currentFilters.platforms.length + (currentFilters.assignedTo ? 1 : 0) + (currentFilters.dateRange.from ? 1 : 0)})`}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto max-h-[calc(85vh-100px)]">
                {allFilters}
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    clearFilters();
                    setIsFilterOpen(false);
                  }}
                  className="w-full mt-4"
                >
                  Clear all filters
                </Button>
              )}
            </SheetContent>
          </Sheet>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs h-8 p-2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Active filter badges on mobile */}
        {(currentFilters.statusIds.length > 0 || currentFilters.platforms.length > 0) && (
          <div className="flex items-center gap-1 flex-wrap">
            {currentFilters.statusIds.slice(0, 2).map((statusId) => {
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
                  className="text-[10px] h-5 px-1.5"
                >
                  {status.name}
                </Badge>
              );
            })}
            {currentFilters.statusIds.length > 2 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                +{currentFilters.statusIds.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="px-4 py-3 border-b border-border bg-background space-y-3">
      {/* First row: Search, Date, Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <DateRangeFilter
          from={currentFilters.dateRange.from}
          to={currentFilters.dateRange.to}
          onChange={(from, to) => 
            onFilterChange({ ...currentFilters, dateRange: { from, to } })
          }
        />

        <Select
          value={currentFilters.sortBy}
          onValueChange={(value: any) => 
            onFilterChange({ ...currentFilters, sortBy: value })
          }
        >
          <SelectTrigger className="w-[140px] h-9">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Second row: Quick filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={currentFilters.unread ? "default" : "outline"}
          onClick={() => onFilterChange({ ...currentFilters, unread: !currentFilters.unread })}
          className="h-4 px-1.5 py-0 text-[10px]"
        >
          Unread
        </Button>

        {/* Top 5 Status Quick Filters (excluding "Unread" status to avoid confusion) */}
        {statusTags
          .filter(status => status.name.toLowerCase() !== 'unread')
          .slice(0, 5)
          .map((status) => {
            const isActive = currentFilters.statusIds.includes(status.id);
            return (
              <Button
                key={status.id}
                variant="outline"
                onClick={() => toggleStatus(status.id)}
                className="h-4 px-1.5 py-0 text-[10px]"
                style={{
                  backgroundColor: isActive ? status.color : `${status.color}15`,
                  borderColor: status.color,
                  color: isActive ? '#fff' : status.color,
                }}
              >
                {status.name}
              </Button>
            );
          })}

        {/* All Status filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
              <Filter className="h-3 w-3 mr-1" />
              More Status {currentFilters.statusIds.length > 0 && `(${currentFilters.statusIds.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover z-50">
            <DropdownMenuLabel>All Statuses</DropdownMenuLabel>
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
                  {currentFilters.statusIds.includes(status.id) && (
                    <span className="text-primary">✓</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-popover z-50">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onFilterChange({ ...currentFilters, sortBy: option.value })}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  {currentFilters.sortBy === option.value && (
                    <span className="text-primary">✓</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Platform filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
              Channel {currentFilters.platforms.length > 0 && `(${currentFilters.platforms.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-popover">
            <DropdownMenuLabel>Filter by Channel</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {platforms.map((platform) => (
              <DropdownMenuItem
                key={platform.value}
                onClick={() => togglePlatform(platform.value)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span>{platform.label}</span>
                  {currentFilters.platforms.includes(platform.value) && (
                    <span className="text-primary">✓</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assigned filter */}
        <Select
          value={currentFilters.assignedTo || 'all'}
          onValueChange={(value) => 
            onFilterChange({ ...currentFilters, assignedTo: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-[140px] h-4 text-[10px]">
            <SelectValue placeholder="Assigned" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All assigned</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {staffMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="h-4 px-1.5 py-0 text-[10px] text-muted-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {(currentFilters.statusIds.length > 0 || currentFilters.platforms.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {currentFilters.statusIds.map((statusId) => {
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
          {currentFilters.platforms.map((platform) => {
            const platformLabel = platforms.find(p => p.value === platform)?.label;
            return (
              <Badge
                key={platform}
                variant="outline"
                className="cursor-pointer"
                onClick={() => togglePlatform(platform)}
              >
                {platformLabel}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
