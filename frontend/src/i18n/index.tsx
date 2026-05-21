/**
 * i18n core — react-i18next under the hood, with a thin compatibility layer.
 *
 * Why this shape:
 *   - Production-grade engine (react-i18next) handles plurals, interpolation,
 *     namespacing, language detection, and SSR concerns without us reinventing
 *     them.
 *   - We expose the legacy API (`useT`, `useI18n`, `useLocalized`, `I18nProvider`)
 *     so existing call sites do not change. New code can also use the
 *     react-i18next `useTranslation()` hook directly.
 *   - Translation key paths remain strictly typed via the `Dict` shape — typos
 *     surface at compile time, just like before.
 *   - Resources are bundled (small total payload, no FOUC). When the catalogues
 *     grow we can switch to `i18next-http-backend` with a one-line change.
 */
import React, { useCallback, useEffect, useMemo } from "react";
import i18n from "i18next";
import {
  I18nextProvider,
  initReactI18next,
  useTranslation,
} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import type { Dict, Lang } from "./types";
import hy from "./locales/hy";
import en from "./locales/en";
import ru from "./locales/ru";

export const LANGS = ["hy", "en", "ru"] as const;
export const DEFAULT_LANG: Lang = "hy";
const NS = "translation";
const STORAGE_KEY = "lang";

/** Recursive key paths in a dict shape, joined by ".". */
type Leaves<T> = T extends string
  ? ""
  : {
      [K in keyof T & string]: T[K] extends string
        ? `${K}`
        : `${K}.${Leaves<T[K]>}`;
    }[keyof T & string];

export type TKey = Leaves<Dict>;
export type TVars = Record<string, string | number>;

/* ------------------------------------------------------------------ *
 * Engine initialisation (singleton)
 * ------------------------------------------------------------------ */

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        hy: { [NS]: hy },
        en: { [NS]: en },
        ru: { [NS]: ru },
      },
      fallbackLng: DEFAULT_LANG,
      supportedLngs: LANGS as unknown as string[],
      defaultNS: NS,
      ns: [NS],
      interpolation: {
        // React already escapes — disable double-escaping.
        escapeValue: false,
        // Match the legacy `{var}` placeholder syntax so existing keys keep working.
        prefix: "{",
        suffix: "}",
      },
      detection: {
        order: ["localStorage"],
        lookupLocalStorage: STORAGE_KEY,
        caches: ["localStorage"],
      },
      returnNull: false,
      // Loud-missing: render the key so QA can spot gaps instead of blanks.
      parseMissingKeyHandler: (key) => key,
    });
}

/* ------------------------------------------------------------------ *
 * Compatibility hooks — preserve the legacy surface used across the app.
 * ------------------------------------------------------------------ */

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  langs: readonly Lang[];
  t: (key: TKey, vars?: TVars) => string;
}

export function useI18n(): I18nContextValue {
  const { t: rawT, i18n: instance } = useTranslation();
  const lang = (instance.resolvedLanguage || instance.language || DEFAULT_LANG).slice(0, 2) as Lang;

  const setLang = useCallback(
    (next: Lang) => {
      if (!(LANGS as readonly string[]).includes(next)) return;
      void instance.changeLanguage(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private mode / quota — ignore */
      }
    },
    [instance],
  );

  const t = useCallback(
    (key: TKey, vars?: TVars): string => {
      const out = rawT(key as unknown as string, vars as Record<string, unknown> | undefined);
      return typeof out === "string" ? out : String(out);
    },
    [rawT],
  );

  return useMemo(
    () => ({ lang, setLang, langs: LANGS, t }),
    [lang, setLang, t],
  );
}

/** Convenience: just the typed `t` function. */
export function useT(): I18nContextValue["t"] {
  return useI18n().t;
}

/**
 * Resolve a multilingual JSON field ({hy, en, ru}) using the current UI lang.
 *
 * This is the canonical way to render dynamic API content in components — it
 * re-renders automatically when the user switches language. Accepts:
 *   - LocalizedText object  → picks current lang, with en→hy→ru fallback
 *   - plain string          → returned as-is (so legacy / not-yet-localized
 *                              fields like instructor.user.first_name keep
 *                              working until the backend migrates them)
 *   - null / undefined      → ""
 *
 * Empty-string locale values are treated as "missing" and fall through the
 * chain (matches getLocalizedContent in lib/localization.ts).
 */
export function useLocalized() {
  const { lang } = useI18n();
  return useCallback(
    (text: unknown): string => {
      if (text == null) return "";
      if (typeof text === "string") return text;
      if (typeof text !== "object") return "";
      const obj = text as Record<string, unknown>;
      const pick = (k: string) => {
        const v = obj[k];
        return typeof v === "string" && v.length > 0 ? v : undefined;
      };
      const out = pick(lang) ?? pick("en") ?? pick("hy") ?? pick("ru");
      if (out !== undefined) return out;
      // Unexpected locale keys: take any non-empty string value present.
      for (const v of Object.values(obj)) {
        if (typeof v === "string" && v.length > 0) return v;
      }
      return "";
    },
    [lang],
  );
}

/* ------------------------------------------------------------------ *
 * Provider — wires <html lang>, persists choice, ensures engine is ready.
 * ------------------------------------------------------------------ */

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Keep <html lang="…"> in sync — helps SR, SEO, and CSS hooks.
  useEffect(() => {
    const sync = () => {
      if (typeof document !== "undefined") {
        document.documentElement.lang = (i18n.resolvedLanguage || DEFAULT_LANG).slice(0, 2);
      }
    };
    sync();
    i18n.on("languageChanged", sync);
    return () => {
      i18n.off("languageChanged", sync);
    };
  }, []);

  // Cross-tab sync via the native `storage` event.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && (LANGS as readonly string[]).includes(e.newValue)) {
        void i18n.changeLanguage(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default i18n;
