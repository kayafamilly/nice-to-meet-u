import Link from "next/link";
import { ManagementHeading, Metric } from "@/components/management-ui";
import { managementData } from "@/lib/management/data";
import type { ManagementAnalyticsReport } from "@/types/api";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params.days)) ? Number(params.days) : 30;
  const custom = /^\d{4}-\d{2}-\d{2}$/.test(params.from || "") && /^\d{4}-\d{2}-\d{2}$/.test(params.to || "");
  const data = await managementData<ManagementAnalyticsReport>("analytics", custom ? { from: params.from, to: params.to } : { days });
  const max = Math.max(1, ...data.daily.map((item) => item.pageViews));
  const exportHref = custom ? `/api/management/export?type=analytics&from=${params.from}&to=${params.to}` as const : `/api/management/export?type=analytics&days=${days}` as const;
  return <>
    <ManagementHeading eyebrow="Privacy-first analytics" title="Audience insights" copy="Anonymous trends without raw IP addresses or third-party tracking." actions={<div className="management-range">{[7, 30, 90].map((value) => <Link className={!custom && days === value ? "active" : ""} href={`/management/analytics?days=${value}`} key={value}>{value} days</Link>)}</div>} />
    <form className="management-date-range"><label>From<input name="from" type="date" defaultValue={custom ? params.from : data.from} /></label><label>To<input name="to" type="date" defaultValue={custom ? params.to : data.to} /></label><button className="button secondary">Apply period</button></form>
    <section className="management-metrics"><Metric label="Visitors" value={data.totals.visitors} tone="coral" /><Metric label="Visits" value={data.totals.visits} /><Metric label="Page views" value={data.totals.pageViews} tone="aqua" /><Metric label="Visit → signup" value={`${(data.conversion.registrationRate * 100).toFixed(1)}%`} tone="neutral" /></section>
    <section className="management-panel"><div className="management-panel-head"><div><p className="eyebrow">Daily trend</p><h2>Page views</h2></div><Link href={exportHref} className="button secondary">Export CSV</Link></div><div className="management-chart">{data.daily.map((item) => <div className="management-bar" key={item.day} title={`${item.day}: ${item.pageViews} page views`}><span style={{ height: `${Math.max(4, (item.pageViews / max) * 100)}%` }} /><small>{item.day.slice(5)}</small></div>)}</div></section>
    <section className="management-three"><Breakdown title="Top pages" items={data.pages} /><Breakdown title="Sources" items={data.sources} /><Breakdown title="Devices" items={data.devices} /></section>
  </>;
}

function Breakdown({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  const total = Math.max(1, items.reduce((sum, item) => sum + item.value, 0));
  return <article className="management-panel"><p className="eyebrow">Breakdown</p><h2>{title}</h2><div className="management-breakdown">{items.length ? items.map((item) => <div key={item.label}><div><span>{item.label}</span><strong>{item.value}</strong></div><i style={{ width: `${(item.value / total) * 100}%` }} /></div>) : <p>No data yet.</p>}</div></article>;
}
