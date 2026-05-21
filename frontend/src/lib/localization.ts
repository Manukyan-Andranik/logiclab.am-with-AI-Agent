import type { LocalizedText } from "../api/types";
import type { Lang } from "../i18n/types";

/**
 * Resolve a multilingual API field for a specific language.
 *
 * Most React code should NOT call this directly — use the `useLocalized()`
 * hook from `@/i18n` instead so the result re-renders on language switch.
 * This function exists for non-component contexts (route loaders, utilities)
 * where the active language is known explicitly. The `lang` argument is now
 * REQUIRED to prevent the silent "always Armenian" bug we were hitting before.
 *
 * Hardened against API shape drift:
 *   - null / undefined        → ""
 *   - bare string (legacy)    → returned as-is (back-compat with old payloads)
 *   - non-object / non-string → ""
 *   - non-string locale value → ""
 *
 * Fallback chain: requested lang → en → hy → ru → first non-empty locale.
 */
export const getLocalizedContent = (
  text: LocalizedText | string | null | undefined,
  lang: Lang,
): string => {
  if (text == null) return "";
  if (typeof text === "string") return text;
  if (typeof text !== "object") return "";

  const obj = text as Partial<Record<Lang, string>>;
  const candidates: (string | undefined)[] = [obj[lang], obj.en, obj.hy, obj.ru];
  for (const v of candidates) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  // Last-ditch: first non-empty string value (handles unexpected locale keys).
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
};
