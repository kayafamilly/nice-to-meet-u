"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { normalizeAnalyticsPath } from "@/lib/analytics";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const path = normalizeAnalyticsPath(pathname);
    if (!path || navigator.webdriver) return;
    const params = new URLSearchParams(search.toString());
    void fetch("/api/analytics/track", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ eventId: crypto.randomUUID(), path, referrer: document.referrer, utmSource: params.get("utm_source") || "", utmMedium: params.get("utm_medium") || "", utmCampaign: params.get("utm_campaign") || "" })
    });
  }, [pathname, search]);
  return null;
}
