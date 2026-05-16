import { LocalizedText } from "../api/types";

// Hardened against API-shape drift:
// - null / undefined → ""
// - bare string (legacy non-multilingual payload) → returned as-is
// - non-object / non-string → "" (never the literal "[object Object]")
// - non-string locale value → ""
export const getLocalizedContent = (
  text?: LocalizedText | string | null,
  lang: keyof LocalizedText = "hy"
): string => {
  if (text == null) return "";
  if (typeof text === "string") return text;
  if (typeof text !== "object") return "";
  const value = (text as LocalizedText)[lang] ?? (text as LocalizedText).en ?? "";
  return typeof value === "string" ? value : "";
};
