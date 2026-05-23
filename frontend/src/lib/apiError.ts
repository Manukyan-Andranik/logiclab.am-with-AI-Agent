/** Normalize FastAPI / generic API error payloads into a user-facing string. */
export function formatApiErrorDetail(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const loc = "loc" in item && Array.isArray(item.loc) ? item.loc.join(".") : "";
          return loc ? `${loc}: ${String((item as { msg: string }).msg)}` : String((item as { msg: string }).msg);
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return String(detail);
}

export const mutationErrorToast =
  (title = "Error") =>
  (error: Error) => ({
    title,
    description: error.message || "Request failed",
    variant: "destructive" as const,
  });
