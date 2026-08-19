import Link from "next/link";
import { LocalDate, ManagementHeading, Metric, Status } from "@/components/management-ui";
import { managementData } from "@/lib/management/data";
import type { ManagementSessionDetail } from "@/types/api";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await managementData<ManagementSessionDetail>("session", { id });
  return <>
    <Link className="management-back" href="/management/sessions">← Sessions</Link>
    <ManagementHeading eyebrow="Détail de la session" title={`Conversation en ${session.languageName}`} copy={session.note || "Aucune note"} actions={<Status value={session.status} />} />
    <section className="management-metrics"><Metric label="Participants réservés" value={`${session.participantCount}/4`} /><Metric label="Hôte" value={session.hostName} tone="aqua" /><Metric label="Début" value={<LocalDate value={session.startsAt} />} tone="coral" /><Metric label="Durée" value="30 min" tone="neutral" /></section>
    <section className="management-panel"><div className="management-panel-head"><div><p className="eyebrow">Participants</p><h2>Présence et rôles</h2></div></div><div className="management-table-wrap"><table className="management-table"><thead><tr><th>Personne</th><th>Rôle</th><th>Réservation</th><th>Arrivée</th><th>Départ</th></tr></thead><tbody>{session.participants.map((person) => <tr key={person.id}><td><Link href={`/management/users/${person.userId}`}>{person.displayName}</Link></td><td><Status value={person.role} /></td><td><Status value={person.reservationStatus} /></td><td><LocalDate value={person.joinedAt} /></td><td><LocalDate value={person.leftAt} /></td></tr>)}</tbody></table></div></section>
  </>;
}
