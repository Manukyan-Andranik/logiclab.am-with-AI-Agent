import { LocalizedText } from "../api/types";

export const getLocalizedContent = (
  text?: LocalizedText | null,
  lang: keyof LocalizedText = "hy"
): string => {
  if (!text) return "";
  return text[lang] || text["en"] || "";
};
