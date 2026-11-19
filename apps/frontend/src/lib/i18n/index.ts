// apps/frontend/src/lib/i18n/index.ts
import { useCallback, useMemo } from 'react';
import en from '../../locales/en.json';

export type TranslationParams = Record<string, string | number>;

type Messages = Record<string, unknown>;

const DEFAULT_LOCALE = 'en';

const messages: Messages = en as Messages;

/**
 * Resolve a dot-separated key path against a nested messages object.
 * Returns `undefined` when any segment is missing.
 */
function resolveKey(source: Messages, key: string): unknown {
  if (!key) {
    return undefined;
  }

  const segments = key.split('.');
  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Replace `{name}` style placeholders in a template with values from `params`.
 * Unknown placeholders are left untouched so missing params are visible.
 */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(params, name)) {
      return String(params[name]);
    }
    return match;
  });
}

/**
 * Translate a key into the current locale's string.
 * Falls back to the key itself when the key is missing or not a string.
 */
export function t(key: string, params?: TranslationParams): string {
  const value = resolveKey(messages, key);

  if (typeof value !== 'string') {
    return key;
  }

  return interpolate(value, params);
}

export interface UseTranslationResult {
  t: (key: string, params?: TranslationParams) => string;
  locale: string;
}

/**
 * Hook access point for components. Returns a stable `t` function so it can
 * be safely used in dependency arrays.
 */
export function useTranslation(): UseTranslationResult {
  const translate = useCallback(
    (key: string, params?: TranslationParams) => t(key, params),
    [],
  );

  return useMemo(
    () => ({
      t: translate,
      locale: DEFAULT_LOCALE,
    }),
    [translate],
  );
}

export default t;