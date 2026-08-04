"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeviceLocalTime } from "@/components/device-local-time";
import { formatRoomDuration, sessionJoinStateAt } from "@/lib/domain/session-room";
import type { SessionSummary } from "@/types/api";

type LiveSnapshot = Pick<SessionSummary, "status" | "participantCount" | "minimumParticipants" | "startsAt" | "endsAt" | "joinOpensAt">;

function snapshotKey(snapshot: LiveSnapshot): string {
  return [snapshot.status, snapshot.participantCount, snapshot.minimumParticipants, snapshot.startsAt, snapshot.endsAt, snapshot.joinOpensAt].join("|");
}

export function SessionLiveActions({
  sessionId,
  initialSnapshot,
  initialServerNow
}: {
  sessionId: string;
  initialSnapshot: LiveSnapshot;
  initialServerNow: string;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [clockOffset] = useState(() => {
    const serverTime = Date.parse(initialServerNow);
    return Number.isFinite(serverTime) ? serverTime - Date.now() : 0;
  });
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  const lastRefreshKey = useRef(snapshotKey(initialSnapshot));
  const joinState = useMemo(() => sessionJoinStateAt({ ...snapshot, now }), [now, snapshot]);
  const previousJoinState = useRef(joinState);

  useEffect(() => {
    const update = () => setNow(Date.now() + clockOffset);
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [clockOffset]);

  useEffect(() => {
    if (previousJoinState.current === joinState) return;
    previousJoinState.current = joinState;
    router.refresh();
  }, [joinState, router]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/app/sessions/${sessionId}`, { cache: "no-store" });
        if (!response.ok) return;
        const latest = await response.json() as SessionSummary;
        if (!active) return;
        const nextSnapshot: LiveSnapshot = {
          status: latest.status,
          participantCount: latest.participantCount,
          minimumParticipants: latest.minimumParticipants,
          startsAt: latest.startsAt,
          endsAt: latest.endsAt,
          joinOpensAt: latest.joinOpensAt
        };
        setSnapshot(nextSnapshot);
        const nextKey = snapshotKey(nextSnapshot);
        if (lastRefreshKey.current !== nextKey) {
          lastRefreshKey.current = nextKey;
          router.refresh();
        }
      } catch {}
    };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(() => void refresh(), 10_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, sessionId]);

  if (joinState === "lobby") {
    return <Link className="button violet" href={`/app/session/${sessionId}/room`}>Test camera and microphone →</Link>;
  }
  if (joinState === "open") {
    return <Link className="button violet" href={`/app/session/${sessionId}/room`}>Enter video room →</Link>;
  }
  if (joinState === "waiting_for_group") {
    return now < Date.parse(snapshot.startsAt)
      ? <p className="notice">One more person is needed. The room opens from two participants.</p>
      : <p className="notice">The session did not reach two people in time and will be cancelled without affecting attendance.</p>;
  }
  if (joinState === "opens_later") {
    const remaining = Math.max(0, Date.parse(snapshot.joinOpensAt) - now);
    return <p className="notice">Device check opens at <DeviceLocalTime value={snapshot.joinOpensAt} options={{ timeStyle: "short" }} /> · in {formatRoomDuration(remaining)}.</p>;
  }
  return <p className="notice">The video room is now closed.</p>;
}
