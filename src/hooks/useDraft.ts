import { useEffect, useState } from "react";

export function useDraft<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [key, value]);

  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return [value, setValue, clear];
}
