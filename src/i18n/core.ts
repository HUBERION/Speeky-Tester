import { createContext, useContext } from 'react';
import { LANGS, resources, type Lang } from './translations';

export type { Lang } from './translations';
export { LANGS } from './translations';

const STORAGE_KEY = 'lang';
const LOCALES: Record<Lang, string> = { en: 'en-GB', de: 'de-DE' };

export type Vars = Record<string, string | number>;

function resolve(lang: Lang, key: string): string | undefined {
  const parts = key.split('.');
  let node: unknown = resources[lang];
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as object)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/** Translate a dot-path key for an explicit language (falls back to en, then the key). */
export function translate(lang: Lang, key: string, vars?: Vars): string {
  const text = resolve(lang, key) ?? resolve('en', key) ?? key;
  return interpolate(text, vars);
}

function detectInitialLang(): Lang {
  const stored = (typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY)
    : null) as Lang | null;
  if (stored && LANGS.includes(stored)) return stored;
  const nav =
    typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  return nav.startsWith('de') ? 'de' : 'en';
}

// Module-level current language so non-React code (db, exports) can localize too.
let currentLang: Lang = detectInitialLang();

export function getLang(): Lang {
  return currentLang;
}

/** Persist a new language and update the module-level state + document lang. */
export function setCurrentLang(lang: Lang): void {
  currentLang = lang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

/** Translate using the module-level current language (for use outside React). */
export function tGlobal(key: string, vars?: Vars): string {
  return translate(currentLang, key, vars);
}

export function localeFor(lang: Lang = currentLang): string {
  return LOCALES[lang];
}

/** Format an ISO timestamp as date+time in the current language's locale. */
export function fmtDateTime(iso: string, lang: Lang = currentLang): string {
  return new Date(iso).toLocaleString(LOCALES[lang]);
}

/** Format the current date as a short date in the current language's locale. */
export function fmtDateNow(lang: Lang = currentLang): string {
  return new Date().toLocaleDateString(LOCALES[lang]);
}

export interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useT must be used within a LanguageProvider');
  }
  return ctx;
}
