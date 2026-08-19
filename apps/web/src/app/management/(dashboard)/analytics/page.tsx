import Link from "next/link";
import { ManagementHeading, Metric, PeriodSelector } from "@/components/management-ui";
import { managementData } from "@/lib/management/data";
import { managementPeriod } from "@/lib/management/period";
import type { ManagementAnalyticsReport } from "@/types/api";

const percent = (value: number) => `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)} %`;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = managementPeriod((await searchParams).period);
  const data = await managementData<ManagementAnalyticsReport>("analytics", { period });
  const max = Math.max(1, ...data.trend.map((item) => item.pageViews));
  return <>
    <ManagementHeading eyebrow="Acquisition et engagement" title="Insights marketing" copy="Comprendre d’où vient l’audience, où elle s’engage et comment les sessions fonctionnent." actions={<PeriodSelector base="/management/analytics" period={period} />} />
    <section className="management-metrics">
      <Metric label="Conversion visite → inscription" value={percent(data.ratios.visitToSignup)} note={`${data.current.registrations} inscription(s)`} tone="coral" />
      <Metric label="Comptes vérifiés" value={percent(data.ratios.verificationRate)} note={`${data.current.verifiedAccounts} compte(s)`} />
      <Metric label="Onboarding terminé" value={percent(data.ratios.onboardingRate)} note={`${data.current.onboardedAccounts} personne(s)`} tone="aqua" />
      <Metric label="Activation session" value={percent(data.ratios.activationRate)} note={`${data.current.activatedAccounts} personne(s)`} tone="neutral" />
    </section>

    <section className="management-panel">
      <div className="management-panel-head"><div><p className="eyebrow">Audience</p><h2>Trafic dans le temps</h2></div><Link href={`/api/management/export?type=analytics&period=${period}`} className="button secondary">Exporter en CSV</Link></div>
      {data.trend.length ? <div className="management-chart">{data.trend.map((item) => <div className="management-bar" key={item.label} title={`${item.label} : ${item.visitors} visiteurs, ${item.visits} visites, ${item.pageViews} pages vues`}><span style={{ height: `${Math.max(4, (item.pageViews / max) * 100)}%` }} /><small>{period === "day" ? item.label.slice(11, 16) : item.label.slice(5)}</small></div>)}</div> : <div className="management-empty"><strong>Aucune donnée sur cette période</strong><p>Changez de période ou revenez après les prochaines visites.</p></div>}
    </section>

    <section className="management-four">
      <Breakdown title="Sources" items={data.sources} />
      <Breakdown title="Campagnes UTM" items={data.campaigns} empty="Aucune campagne UTM détectée." />
      <Breakdown title="Pages consultées" items={data.pages} />
      <Breakdown title="Appareils" items={data.devices} />
    </section>

    <section className="management-split">
      <article className="management-panel"><div className="management-panel-head"><div><p className="eyebrow">Sessions</p><h2>Qualité et remplissage</h2></div><Link href="/management/sessions">Voir les sessions →</Link></div><div className="management-detail-grid"><Metric label="Taux de remplissage" value={percent(data.ratios.fillRate)} /><Metric label="Sessions viables" value={data.current.viableSessions} tone="aqua" /><Metric label="Taux de présence" value={percent(data.ratios.attendanceRate)} tone="coral" /><Metric label="Taux d’absence" value={percent(data.ratios.noShowRate)} tone={data.current.noShows ? "danger" : "neutral"} /></div><div className="management-lifecycle"><div><strong>{data.current.scheduledSessions}</strong><span>Planifiées</span></div><div><strong>{data.current.completedSessions}</strong><span>Terminées</span></div><div><strong>{data.current.cancelledSessions}</strong><span>Annulées</span></div></div></article>
      <SessionBreakdown title="Performance par langue" items={data.languages} />
    </section>
    <SessionBreakdown title="Performance par créneau" items={data.timeSlots} />
  </>;
}

function Breakdown({ title, items, empty = "Aucune donnée." }: { title: string; items: Array<{ label: string; value: number }>; empty?: string }) {
  const total = Math.max(1, ...items.map((item) => item.value));
  return <article className="management-panel"><p className="eyebrow">Répartition</p><h2>{title}</h2><div className="management-breakdown">{items.length ? items.map((item) => <div key={item.label}><div><span>{item.label}</span><strong>{item.value}</strong></div><i style={{ width: `${(item.value / total) * 100}%` }} /></div>) : <p>{empty}</p>}</div></article>;
}

function SessionBreakdown({ title, items }: { title: string; items: Array<{ label: string; sessions: number; reservations: number; attendances: number }> }) {
  return <article className="management-panel"><p className="eyebrow">Sessions</p><h2>{title}</h2>{items.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Segment</th><th>Sessions</th><th>Réservations</th><th>Présences</th></tr></thead><tbody>{items.map((item) => <tr key={item.label}><td><strong>{item.label}</strong></td><td>{item.sessions}</td><td>{item.reservations}</td><td>{item.attendances}</td></tr>)}</tbody></table></div> : <div className="management-empty compact"><strong>Aucune session</strong><p>Ce tableau se remplira automatiquement.</p></div>}</article>;
}
