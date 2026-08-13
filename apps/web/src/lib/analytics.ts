export function normalizeAnalyticsPath(pathname: string): string | null {
  const clean = pathname.split("?")[0]?.split("#")[0] || "/";
  if (clean.startsWith("/api/") || clean.startsWith("/management") || clean.includes("/room")) return null;
  if (/^\/app\/sessions\/[^/]+/.test(clean)) return "/app/sessions/:id";
  if (/^\/guides\/[^/]+/.test(clean)) return "/guides/:slug";
  if (/^\/pen-pals\/[^/]+/.test(clean)) return "/pen-pals/:slug";
  return clean.slice(0, 200);
}

export function analyticsDevice(userAgent: string): "desktop" | "mobile" | "tablet" | "other" {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return "desktop";
  return "other";
}
