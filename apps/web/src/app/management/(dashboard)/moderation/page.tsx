import Link from "next/link";
import { LocalDate, ManagementHeading, Pager, Status } from "@/components/management-ui";
import { managementData } from "@/lib/management/data";
import type { ManagementModerationReport, ManagementPage } from "@/types/api";

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const data = await managementData<ManagementPage<ManagementModerationReport>>("moderation", { page });
  return <>
    <ManagementHeading eyebrow="Sécurité" title="Modération" copy="Consultation des signalements transmis par les participants." />
    <section className="management-report-list">{data.items.length ? data.items.map((report) => <article className="management-report" key={report.id}><div><Status value={report.status} /><span className="management-tag">{report.reason.replaceAll("_", " ")}</span></div><h2>{report.reportedUserName ? `Signalement concernant ${report.reportedUserName}` : "Signalement de session"}</h2><p>{report.details || "Aucun détail supplémentaire."}</p><footer><span>Transmis par <Link href={`/management/users/${report.reporterId}`}>{report.reporterName}</Link></span>{report.sessionId && <Link href={`/management/sessions/${report.sessionId}`}>Voir la session →</Link>}<LocalDate value={report.createdAt} /></footer></article>) : <div className="management-empty"><strong>Aucun signalement</strong><p>La file de modération est vide.</p></div>}</section>
    <Pager base="/management/moderation" page={data.page} totalPages={data.totalPages} />
  </>;
}
