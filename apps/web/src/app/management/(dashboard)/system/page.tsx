import { LocalDate, ManagementHeading, Metric, Status } from "@/components/management-ui";
import { managementSystemStatus } from "@/lib/management/data";

export default async function SystemPage() {
  const data = await managementSystemStatus();
  return <>
    <ManagementHeading eyebrow="Santé opérationnelle" title="Système" copy="État synthétique des services et des éventuels échecs techniques." />
    <section className="management-metrics"><Metric label="Application web" value="Opérationnelle" tone="aqua" /><Metric label="PocketBase" value={data.pocketBase === "healthy" ? "Opérationnel" : "Indisponible"} tone={data.pocketBase === "healthy" ? "aqua" : "danger"} /><Metric label="LiveKit" value={data.liveKit === "healthy" ? "Opérationnel" : "Indisponible"} tone={data.liveKit === "healthy" ? "aqua" : "danger"} /><Metric label="Notifications échouées" value={data.failedNotifications} tone={data.failedNotifications ? "danger" : "neutral"} /><Metric label="Webhooks échoués" value={data.failedWebhooks} tone={data.failedWebhooks ? "danger" : "neutral"} /></section>
    <section className="management-panel"><p className="eyebrow">Services</p><h2>État d’exécution</h2><div className="management-service-list"><div><span>BFF Next.js</span><Status value={data.web} /></div><div><span>PocketBase</span><Status value={data.pocketBase} /></div><div><span>LiveKit</span><Status value={data.liveKit} /></div><div><span>Worker de notifications</span><Status value={data.notificationWorker} /></div><div><span>Dernier signal du worker</span><strong><LocalDate value={data.notificationWorkerLastSeenAt} /></strong></div><div><span>Cycle de vie LiveKit</span><Status value={data.liveKitWorker} /></div><div><span>Dernier signal LiveKit</span><strong><LocalDate value={data.liveKitWorkerLastSeenAt} /></strong></div><div><span>Dernier webhook LiveKit</span><strong><LocalDate value={data.lastWebhookAt} /></strong></div></div><p className="small-copy">Les workers sont surveillés par des signaux authentifiés. La supervision des processus reste assurée par systemd sur le VPS.</p></section>
  </>;
}
