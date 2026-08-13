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
    <ManagementHeading eyebrow="Community directory" title="Users" copy="Account activation, profiles, languages and participation in one view." actions={<Link className="button secondary" href="/api/management/export?type=users">Export CSV</Link>} />
    <form className="management-search"><input name="search" defaultValue={search} placeholder="Search name or email…" /><button className="button violet">Search</button></form>
    <section className="management-panel"><div className="management-table-wrap"><table className="management-table"><thead><tr><th>User</th><th>Account</th><th>Created</th><th>Languages</th><th>Sessions</th><th></th></tr></thead><tbody>{data.items.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><small>{user.email}</small></td><td><Status value={user.verified ? user.status : "unverified"} /></td><td><LocalDate value={user.createdAt} /></td><td>{user.languages.slice(0, 2).map((language) => <span className="management-tag" key={`${language.name}-${language.level}`}>{language.name}</span>)}</td><td>{user.sessionStats.total}</td><td><Link href={`/management/users/${user.id}`}>Details →</Link></td></tr>)}</tbody></table></div><Pager base="/management/users" page={data.page} totalPages={data.totalPages} search={search} /></section>
  </>;
}
