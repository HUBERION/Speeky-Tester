import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAppSettings, saveAppSettings } from '../db';
import {
  ThemeContext,
  applyResolvedTheme,
  getStoredThemePreference,
  getSystemTheme,
  resolveTheme,
  setThemePreference,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemePreference,
} from './core';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    getStoredThemePreference(),
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(getStoredThemePreference()),
  );

  useEffect(() => {
    void getAppSettings().then((settings) => {
      const stored = getStoredThemePreference();
      const fromDb = settings.theme ?? 'system';
      if (fromDb !== stored) {
        setThemePreference(fromDb);
        setPreferenceState(fromDb);
        setResolved(resolveTheme(fromDb));
        return;
      }
      if (settings.theme == null) {
        void saveAppSettings({ ...settings, theme: stored });
      }
    });
  }, []);

  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const next = getSystemTheme();
      setResolved(next);
      applyResolvedTheme(next);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    const nextResolved = setThemePreference(next);
    setPreferenceState(next);
    setResolved(nextResolved);
    void getAppSettings().then((settings) =>
      saveAppSettings({ ...settings, theme: next }),
    );
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
