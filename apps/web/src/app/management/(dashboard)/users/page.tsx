import Link from "next/link";
import { LocalDate, ManagementHeading, Pager, Status } from "@/components/management-ui";
import { managementData } from "@/lib/management/data";
import type { ManagementPage, ManagementUserDetail } from "@/types/api";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";
  const data = await managementData<ManagementPage<ManagementUserDetail>>("users", { page, search });
  return <>
    <ManagementHeading eyebrow="Communauté" title="Utilisateurs" copy="Activation des comptes, profils, langues et participation dans une seule vue." actions={<Link className="button secondary" href="/api/management/export?type=users">Exporter en CSV</Link>} />
    <form className="management-search"><input name="search" defaultValue={search} placeholder="Rechercher un nom ou un e-mail…" /><button className="button violet">Rechercher</button></form>
    <section className="management-panel"><div className="management-table-wrap"><table className="management-table"><thead><tr><th>Utilisateur</th><th>Compte</th><th>Création</th><th>Langues</th><th>Sessions</th><th></th></tr></thead><tbody>{data.items.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><small>{user.email}</small></td><td><Status value={user.verified ? user.status : "unverified"} /></td><td><LocalDate value={user.createdAt} /></td><td>{user.languages.slice(0, 2).map((language) => <span className="management-tag" key={`${language.name}-${language.level}`}>{language.name}</span>)}</td><td>{user.sessionStats.total}</td><td><Link href={`/management/users/${user.id}`}>Détails →</Link></td></tr>)}</tbody></table></div><Pager base="/management/users" page={data.page} totalPages={data.totalPages} search={search} /></section>
  </>;
}
