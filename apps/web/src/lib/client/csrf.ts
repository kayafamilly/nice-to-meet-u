export function csrfToken(): string {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("ntmy-csrf="))
    ?.split("=")[1] ?? "";
}
