'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** The user's selection. 'system' follows the OS preference. */
  choice: ThemeChoice;
  setChoice: (c: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';

function systemDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve a choice to the concrete theme that gets written to <html data-theme>. */
function resolve(choice: ThemeChoice): 'light' | 'dark' {
  return choice === 'system' ? (systemDark() ? 'dark' : 'light') : choice;
}

function apply(choice: ThemeChoice) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolve(choice));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default 'system' on first render; the inline no-FOUC script in layout has
  // already set <html data-theme> before paint, so this never flashes.
  const [choice, setChoiceState] = useState<ThemeChoice>('system');

  // Hydrate the choice from localStorage once on mount.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeChoice | null) ?? 'system';
    setChoiceState(stored);
    apply(stored);
  }, []);

  // When following the system, react to OS theme changes live.
  useEffect(() => {
    if (choice !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [choice]);

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c);
    localStorage.setItem(STORAGE_KEY, c);
    apply(c);
  }, []);

  return (
    <ThemeContext.Provider value={{ choice, setChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
