import { useState, useCallback, useEffect } from 'react';

export interface ConversationFilters {
  search: string;
  unread: boolean;
  statusIds: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  sortBy: 'priority' | 'newest' | 'oldest' | 'unread' | 'name_asc' | 'name_desc';
  platforms: string[];
  assignedTo: string | null;
}

const INITIAL_FILTERS: ConversationFilters = {
  search: '',
  unread: false,
  statusIds: [],
  dateRange: { from: null, to: null },
  sortBy: 'priority',
  platforms: [],
  assignedTo: null,
};

export const useConversationFilters = () => {
  const [filters, setFilters] = useState<ConversationFilters>(() => {
    const saved = localStorage.getItem('conversationFilters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_FILTERS,
          ...parsed,
          sortBy: INITIAL_FILTERS.sortBy, // Always use default sortBy (priority)
          dateRange: {
            from: parsed.dateRange?.from ? new Date(parsed.dateRange.from) : null,
            to: parsed.dateRange?.to ? new Date(parsed.dateRange.to) : null,
          },
        };
      } catch {
        return INITIAL_FILTERS;
      }
    }
    return INITIAL_FILTERS;
  });

  useEffect(() => {
    const { sortBy, ...filtersToSave } = filters; // Exclude sortBy from persistence
    const toSave = {
      ...filtersToSave,
      dateRange: {
        from: filters.dateRange.from?.toISOString() || null,
        to: filters.dateRange.to?.toISOString() || null,
      },
    };
    localStorage.setItem('conversationFilters', JSON.stringify(toSave));
  }, [filters]);

  const updateFilter = useCallback(<K extends keyof ConversationFilters>(
    key: K,
    value: ConversationFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.unread ||
    filters.statusIds.length > 0 ||
    filters.dateRange.from !== null ||
    filters.dateRange.to !== null ||
    filters.platforms.length > 0 ||
    filters.assignedTo !== null;

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
  };
};