"use client";

import { useEffect, useState } from "react";
import type { CommunityMetrics } from "@/types/api";

export function CommunityProof() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      try {
        const response = await fetch("/api/public/community-metrics", { cache: "no-store" });
        if (!response.ok) return;
        const metrics = await response.json() as CommunityMetrics;
        if (
          active
          && Number.isSafeInteger(metrics.verifiedCompletedSessionCount)
          && metrics.verifiedCompletedSessionCount > 0
        ) {
          setCount(metrics.verifiedCompletedSessionCount);
        }
      } catch {
        // Community proof is optional. A failed request must not create a
        // synthetic activity claim or block the public page.
      }
    }

    void loadMetrics();
    return () => { active = false; };
  }, []);

  if (!count) return null;

  return (
    <section className="shell community-proof" aria-label="Verified NiceToMeetU activity">
      <p className="eyebrow">Verified community activity</p>
      <p><strong>{count.toLocaleString("en-US")}</strong> completed group session{count === 1 ? "" : "s"} with at least two confirmed attendees.</p>
    </section>
  );
}
