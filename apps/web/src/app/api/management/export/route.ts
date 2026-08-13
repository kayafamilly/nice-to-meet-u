import { NextRequest, NextResponse } from "next/server";
import { hasManagementSession, managementFingerprint } from "@/lib/management/auth";
import { csvDocument } from "@/lib/management/csv";
import { managementData, managementInternal } from "@/lib/management/data";
import type { ManagementAnalyticsReport, ManagementPage, ManagementSessionDetail, ManagementUserDetail } from "@/types/api";

async function allPages<T>(section: string): Promise<T[]> {
  const first = await managementData<ManagementPage<T>>(section, { page: 1, perPage: 50 });
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) items.push(...(await managementData<ManagementPage<T>>(section, { page, perPage: 50 })).items);
  return items;
}

export async function GET(request: NextRequest) {
  if (!await hasManagementSession()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const type = request.nextUrl.searchParams.get("type");
  let content = "";
  if (type === "users") {
    const users = await allPages<ManagementUserDetail>("users");
    content = csvDocument([["ID", "Display name", "Email", "Verified", "Status", "Created", "Timezone", "Sessions", "Attended", "No-shows"], ...users.map((user) => [user.id, user.displayName, user.email, user.verified, user.status, user.createdAt, user.timeZone, user.sessionStats.total, user.sessionStats.attended, user.sessionStats.noShow])]);
  } else if (type === "sessions") {
    const sessions = await allPages<ManagementSessionDetail>("sessions");
    content = csvDocument([["ID", "Language", "Host", "Starts", "Ends", "Status", "Participants", "Note"], ...sessions.map((session) => [session.id, session.languageName, session.hostName, session.startsAt, session.endsAt, session.status, session.participantCount, session.note])]);
  } else if (type === "analytics") {
    const days = [7, 30, 90].includes(Number(request.nextUrl.searchParams.get("days"))) ? Number(request.nextUrl.searchParams.get("days")) : 30;
    const from = request.nextUrl.searchParams.get("from") || undefined;
    const to = request.nextUrl.searchParams.get("to") || undefined;
    const report = await managementData<ManagementAnalyticsReport>("analytics", from && to ? { from, to } : { days });
    content = csvDocument([["Day", "Visitors", "Visits", "Page views"], ...report.daily.map((item) => [item.day, item.visitors, item.visits, item.pageViews])]);
  } else return NextResponse.json({ error: "INVALID_EXPORT" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  await managementInternal("/api/ntmy/internal/management/auth-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fingerprint: await managementFingerprint(), outcome: "export", metadata: { type } }) });
  return new NextResponse(content, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nicetomeetu-${type}.csv"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
