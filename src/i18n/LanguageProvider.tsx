import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  I18nContext,
  getLang,
  setCurrentLang,
  translate,
  type I18nContextValue,
  type Lang,
} from './core';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang());

  const setLang = useCallback((next: Lang) => {
    setCurrentLang(next);
    setLangState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
