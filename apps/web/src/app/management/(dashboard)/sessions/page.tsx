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
    <ManagementHeading eyebrow="Conversations" title="Sessions" copy="Toutes les sessions planifiées, terminées ou annulées." actions={<Link className="button secondary" href="/api/management/export?type=sessions">Exporter en CSV</Link>} />
    <form className="management-search"><input name="search" defaultValue={search} placeholder="Rechercher une langue, un hôte ou un état…" /><button className="button violet">Rechercher</button></form>
    <section className="management-panel"><div className="management-table-wrap"><table className="management-table"><thead><tr><th>Session</th><th>Hôte</th><th>Date locale</th><th>Participants</th><th>État</th><th></th></tr></thead><tbody>{data.items.map((session) => <tr key={session.id}><td><strong>{session.languageName}</strong><small>{session.note || "Aucune note"}</small></td><td>{session.hostName}</td><td><LocalDate value={session.startsAt} /></td><td>{session.participantCount}/4</td><td><Status value={session.status} /></td><td><Link href={`/management/sessions/${session.id}`}>Détails →</Link></td></tr>)}</tbody></table></div><Pager base="/management/sessions" page={data.page} totalPages={data.totalPages} search={search} /></section>
  </>;
}
