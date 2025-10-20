import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface FilterSettings {
  dateRange: DateRange | undefined;
  channel: string;
  status: string;
  assignedTo: string;
  priority: string;
}

interface AdvancedFiltersProps {
  onApplyFilters: (filters: FilterSettings) => void;
  onClearFilters: () => void;
}

export function AdvancedFilters({ onApplyFilters, onClearFilters }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterSettings>({
    dateRange: undefined,
    channel: "all",
    status: "all",
    assignedTo: "all",
    priority: "all",
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const handleApplyFilters = () => {
    let count = 0;
    if (filters.dateRange) count++;
    if (filters.channel !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.assignedTo !== "all") count++;
    if (filters.priority !== "all") count++;
    
    setActiveFiltersCount(count);
    onApplyFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters({
      dateRange: undefined,
      channel: "all",
      status: "all",
      assignedTo: "all",
      priority: "all",
    });
    setActiveFiltersCount(0);
    onClearFilters();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Advanced Message Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount} active</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Filter conversations by date, channel, status, assignment, and priority
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                        {format(filters.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange?.from}
                  selected={filters.dateRange}
                  onSelect={(range) => setFilters({ ...filters, dateRange: range })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Channel Filter */}
          <div className="space-y-2">
            <Label htmlFor="channel-filter">Channel</Label>
            <Select
              value={filters.channel}
              onValueChange={(value) => setFilters({ ...filters, channel: value })}
            >
              <SelectTrigger id="channel-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="facebook">Facebook Messenger</SelectItem>
                <SelectItem value="instagram">Instagram DM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger id="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assigned To Filter */}
          <div className="space-y-2">
            <Label htmlFor="assigned-filter">Assigned To</Label>
            <Select
              value={filters.assignedTo}
              onValueChange={(value) => setFilters({ ...filters, assignedTo: value })}
            >
              <SelectTrigger id="assigned-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="me">Assigned to Me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="ai">AI Bot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label htmlFor="priority-filter">Priority</Label>
            <Select
              value={filters.priority}
              onValueChange={(value) => setFilters({ ...filters, priority: value })}
            >
              <SelectTrigger id="priority-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            disabled={activeFiltersCount === 0}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button onClick={handleApplyFilters}>
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>
        </div>

        {activeFiltersCount > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied. 
              Results will be filtered automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
