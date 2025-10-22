import { useState, useCallback } from 'react';

/**
 * Hook for optimistic UI updates - shows changes immediately before server confirms
 */
export const useOptimisticUpdate = <T extends { id: string }>(
  items: T[],
  setItems: (items: T[]) => void
) => {
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  const optimisticUpdate = useCallback(
    (itemId: string, updates: Partial<T>, serverUpdate: () => Promise<void>) => {
      // Immediately update UI
      setItems(
        items.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );

      // Mark as pending
      setPendingUpdates(prev => new Set(prev).add(itemId));

      // Execute server update
      serverUpdate()
        .catch(error => {
          console.error('Optimistic update failed:', error);
          // Could revert here if needed
        })
        .finally(() => {
          setPendingUpdates(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        });
    },
    [items, setItems]
  );

  return { optimisticUpdate, pendingUpdates };
};
