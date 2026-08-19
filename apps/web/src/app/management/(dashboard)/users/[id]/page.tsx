import Link from "next/link";
import { LocalDate, ManagementHeading, Metric, Status } from "@/components/management-ui";
import { managementData } from "@/lib/management/data";
import type { ManagementUserDetail } from "@/types/api";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await managementData<ManagementUserDetail>("user", { id });
  return <>
    <Link className="management-back" href="/management/users">← Utilisateurs</Link>
    <ManagementHeading eyebrow="Profil utilisateur" title={user.displayName} copy={user.email} actions={<Status value={user.verified ? user.status : "unverified"} />} />
    <section className="management-metrics"><Metric label="Sessions" value={user.sessionStats.total} /><Metric label="Présences" value={user.sessionStats.attended} tone="aqua" /><Metric label="Absences" value={user.sessionStats.noShow} tone="coral" /><Metric label="Annulations" value={user.sessionStats.cancelled} tone="neutral" /></section>
    <section className="management-split">
      <article className="management-panel"><p className="eyebrow">Compte</p><dl className="management-definition"><div><dt>Création</dt><dd><LocalDate value={user.createdAt} /></dd></div><div><dt>E-mail vérifié</dt><dd>{user.verified ? "Oui" : "Non"}</dd></div><div><dt>Onboarding</dt><dd>{user.onboardingComplete ? "Terminé" : "Incomplet"}</dd></div><div><dt>Fuseau horaire</dt><dd>{user.timeZone}</dd></div><div><dt>Suspension</dt><dd><LocalDate value={user.suspendedUntil} /></dd></div></dl></article>
      <article className="management-panel"><p className="eyebrow">Langues</p><div className="management-language-list">{user.languages.map((language) => <div key={`${language.name}-${language.level}`}><strong>{language.name}</strong><span>{language.native ? "Natif" : language.level}</span></div>)}</div></article>
    </section>
    <section className="management-panel"><h2>Historique des sessions</h2><div className="management-table-wrap"><table className="management-table"><thead><tr><th>Langue</th><th>Date</th><th>État</th><th>Participants</th><th></th></tr></thead><tbody>{user.sessions?.map((session) => <tr key={session.id}><td>{session.languageName}</td><td><LocalDate value={session.startsAt} /></td><td><Status value={session.status} /></td><td>{session.participantCount}/4</td><td><Link href={`/management/sessions/${session.id}`}>Ouvrir →</Link></td></tr>)}</tbody></table></div></section>
  </>;
}
