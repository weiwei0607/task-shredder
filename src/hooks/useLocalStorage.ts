import { useSyncExternalStore, useCallback } from 'react';

function getServerSnapshot<T>(initialValue: T): T {
  return initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return JSON.stringify(initialValue);
    const item = window.localStorage.getItem(key);
    return item ?? JSON.stringify(initialValue);
  }, [key, initialValue]);

  const subscribe = useCallback((callback: () => void) => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) callback();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  const storedString = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => JSON.stringify(initialValue)
  );

  let storedValue: T;
  try {
    storedValue = JSON.parse(storedString);
  } catch {
    storedValue = initialValue;
  }

  const setValue = useCallback((value: T | ((val: T) => T)) => {
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
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, [key, initialValue]);

  return [storedValue, setValue];
}
