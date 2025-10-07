import { useEffect, useRef } from 'react';
import { debounce } from 'lodash-es';

interface UseFormAutosaveOptions<T> {
  key: string;
  values: T;
  enabled?: boolean;
  debounceMs?: number;
}

export function useFormAutosave<T extends Record<string, any>>({
  key,
  values,
  enabled = true,
  debounceMs = 1000,
}: UseFormAutosaveOptions<T>) {
  const debouncedSaveRef = useRef<ReturnType<typeof debounce>>();

  useEffect(() => {
    if (!enabled) return;

    // Create debounced save function
    debouncedSaveRef.current = debounce((data: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to autosave form data:', error);
      }
    }, debounceMs);

    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [key, enabled, debounceMs]);

  // Save whenever values change
  useEffect(() => {
    if (!enabled || !debouncedSaveRef.current) return;
    debouncedSaveRef.current(values);
  }, [values, enabled]);

  // Load saved data
  const loadSavedData = (): Partial<T> | null => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load saved form data:', error);
      return null;
    }
  };

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear saved form data:', error);
    }
  };

  return { loadSavedData, clearSavedData };
}
