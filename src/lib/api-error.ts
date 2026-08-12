export function apiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const message = typeof value.message === "string" ? value.message.trim() : "";
    const details = typeof value.details === "string" ? value.details.trim() : "";
    const hint = typeof value.hint === "string" ? value.hint.trim() : "";
    const code = typeof value.code === "string" ? value.code.trim() : "";
    const joined = [message, details, hint].filter(Boolean).join(" · ");
    if (joined) return code ? `${joined} (${code})` : joined;
  }
  return fallback;
}

export function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as Record<string, unknown>;
  const code = String(value.code || "");
  const text = `${String(value.message || "")} ${String(value.details || "")} ${String(value.hint || "")}`.toLowerCase();
  return code === "42703" || code === "PGRST204" || text.includes("column") && text.includes("does not exist");
}
