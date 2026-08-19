import Link from "next/link";
import { LocalDate, ManagementHeading, Metric, PeriodSelector, Status } from "@/components/management-ui";
import { managementData } from "@/lib/management/data";
import { managementPeriod } from "@/lib/management/period";
import type { ManagementOverview } from "@/types/api";

const percent = (value: number) => `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)} %`;

export default async function ManagementOverviewPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = managementPeriod((await searchParams).period);
  const data = await managementData<ManagementOverview>("overview", { period });
  const maxTrend = Math.max(1, ...data.trend.map((item) => item.pageViews));

  return <>
    <ManagementHeading eyebrow="Pilotage en production" title="Vue d’ensemble" copy="Les chiffres essentiels pour comprendre le trafic, l’activation et l’activité des sessions." actions={<PeriodSelector base="/management" period={period} />} />
    <section className="management-metrics">
      <Metric label="Visiteurs" value={data.current.visitors} comparison={data.metrics.visitors} tone="coral" />
      <Metric label="Visites" value={data.current.visits} comparison={data.metrics.visits} />
      <Metric label="Pages vues" value={data.current.pageViews} comparison={data.metrics.pageViews} tone="aqua" />
      <Metric label="Inscriptions" value={data.current.registrations} comparison={data.metrics.registrations} tone="neutral" />
    </section>

    <section className="management-split">
      <article className="management-panel">
        <div className="management-panel-head"><div><p className="eyebrow">Parcours marketing</p><h2>De la visite à la première session</h2></div><Link href={`/management/analytics?period=${period}`}>Voir le détail →</Link></div>
        <div className="management-funnel">
          <div><span>Visites</span><strong>{data.current.visits}</strong><small>Point d’entrée</small></div>
          <div><span>Inscriptions</span><strong>{data.current.registrations}</strong><small>{percent(data.ratios.visitToSignup)} des visites</small></div>
          <div><span>E-mails vérifiés</span><strong>{data.current.verifiedAccounts}</strong><small>{percent(data.ratios.verificationRate)} des inscrits</small></div>
          <div><span>Onboarding terminé</span><strong>{data.current.onboardedAccounts}</strong><small>{percent(data.ratios.onboardingRate)} des inscrits</small></div>
          <div><span>Première session</span><strong>{data.current.activatedAccounts}</strong><small>{percent(data.ratios.activationRate)} des inscrits</small></div>
        </div>
      </article>
      <article className="management-panel">
        <p className="eyebrow">À surveiller</p><h2>Signaux utiles</h2>
        <div className="management-alert-list">{data.alerts.map((alert) => <Link className={`management-alert ${alert.tone}`} href={alert.href} key={`${alert.title}-${alert.href}`}><span aria-hidden="true">{alert.tone === "success" ? "✓" : "!"}</span><div><strong>{alert.title}</strong><p>{alert.copy}</p></div></Link>)}</div>
      </article>
    </section>

    <section className="management-panel">
      <div className="management-panel-head"><div><p className="eyebrow">Évolution</p><h2>Pages vues sur la période</h2></div><span className="management-panel-stat">{data.ratios.pagesPerVisit.toFixed(1)} page(s) / visite</span></div>
      {data.trend.length ? <div className="management-chart" aria-label="Évolution des pages vues">{data.trend.map((item) => <div className="management-bar" key={item.label} title={`${item.label} : ${item.pageViews} pages vues`}><span style={{ height: `${Math.max(4, (item.pageViews / maxTrend) * 100)}%` }} /><small>{period === "day" ? item.label.slice(11, 16) : item.label.slice(5)}</small></div>)}</div> : <div className="management-empty"><strong>Aucune visite</strong><p>Les premières données apparaîtront ici automatiquement.</p></div>}
    </section>

    <section className="management-metrics">
      <Metric label="Sessions" value={data.current.sessions} comparison={data.metrics.sessions} tone="aqua" />
      <Metric label="Réservations" value={data.current.reservations} comparison={data.metrics.reservations} />
      <Metric label="Participations" value={data.current.attendances} comparison={data.metrics.attendances} tone="coral" />
      <Metric label="Absences" value={data.current.noShows} comparison={data.metrics.noShows} inverse tone={data.current.noShows ? "danger" : "neutral"} />
    </section>

    <section className="management-panel">
      <div className="management-panel-head"><div><p className="eyebrow">Activité récente</p><h2>Dernières sessions</h2></div><Link href="/management/sessions">Toutes les sessions →</Link></div>
      <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Langue</th><th>Hôte</th><th>Date</th><th>Participants</th><th>État</th><th></th></tr></thead><tbody>{data.recentSessions.map((session) => <tr key={session.id}><td><strong>{session.languageName}</strong></td><td>{session.hostName}</td><td><LocalDate value={session.startsAt} /></td><td>{session.participantCount}/4</td><td><Status value={session.status} /></td><td><Link href={`/management/sessions/${session.id}`}>Ouvrir →</Link></td></tr>)}</tbody></table></div>
    </section>
  </>;
}
