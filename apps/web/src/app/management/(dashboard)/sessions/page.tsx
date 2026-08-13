import Link from "next/link";
import { LocalDate, ManagementHeading, Pager, Status } from "@/components/management-ui";
import { managementData } from "@/lib/management/data";
import type { ManagementPage, ManagementSessionDetail } from "@/types/api";

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";
  const data = await managementData<ManagementPage<ManagementSessionDetail>>("sessions", { page, search });
  return <>
    <ManagementHeading eyebrow="Conversation operations" title="Sessions" copy="Every scheduled, completed and cancelled speaking group." actions={<Link className="button secondary" href="/api/management/export?type=sessions">Export CSV</Link>} />
    <form className="management-search"><input name="search" defaultValue={search} placeholder="Search language, host or status…" /><button className="button violet">Search</button></form>
    <section className="management-panel"><div className="management-table-wrap"><table className="management-table"><thead><tr><th>Session</th><th>Host</th><th>Local date</th><th>People</th><th>Status</th><th></th></tr></thead><tbody>{data.items.map((session) => <tr key={session.id}><td><strong>{session.languageName}</strong><small>{session.note || "No note"}</small></td><td>{session.hostName}</td><td><LocalDate value={session.startsAt} /></td><td>{session.participantCount}/4</td><td><Status value={session.status} /></td><td><Link href={`/management/sessions/${session.id}`}>Details →</Link></td></tr>)}</tbody></table></div><Pager base="/management/sessions" page={data.page} totalPages={data.totalPages} search={search} /></section>
  </>;
}
