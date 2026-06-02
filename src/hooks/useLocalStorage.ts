import { useState, useEffect, useCallback, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Always start with initialValue to avoid SSR hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const broadcastChannel = useRef<BroadcastChannel | null>(null);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch {
      // ignore parse errors
    }
    setIsHydrated(true);

    // Listen for changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const current = (() => {
        const item = window.localStorage.getItem(key);
        if (!item) return initialValue;
        try {
          return JSON.parse(item);
        } catch {
          return initialValue;
        }
      })();

      const valueToStore = value instanceof Function ? value(current) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      setStoredValue(valueToStore);

      // Dispatch a custom event so other hooks in the SAME tab are notified
      window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key } }));
    } catch (err) {
      console.error('useLocalStorage setValue error:', err);
    }
  }, [key, initialValue]);

  return [isHydrated ? storedValue : initialValue, setValue];
}
