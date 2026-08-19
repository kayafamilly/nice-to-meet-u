import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { DeviceLocalTime } from "@/components/device-local-time";
import { formatManagementChange, managementPeriods } from "@/lib/management/period";
import type { ManagementMetric, ManagementPeriod } from "@/types/api";

export function ManagementHeading({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: ReactNode }) { return <header className="management-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{actions}</header>; }
export function Metric({ label, value, note, tone = "violet", comparison, inverse = false }: { label: string; value: ReactNode; note?: string; tone?: string; comparison?: ManagementMetric; inverse?: boolean }) {
  const direction = comparison?.change === null || comparison?.change === 0 ? "neutral" : ((comparison?.change ?? 0) > 0) !== inverse ? "positive" : "negative";
  return <article className={`management-metric ${tone}`}><span>{label}</span><strong>{value}</strong>{comparison ? <small className={`management-change ${direction}`}>{formatManagementChange(comparison.change)} <em>vs période précédente</em></small> : note ? <small>{note}</small> : null}</article>;
}
export function LocalDate({ value }: { value: string | null }) { return value ? <DeviceLocalTime value={value} options={{ dateStyle: "medium", timeStyle: "short" }} /> : <>—</>; }
export function PeriodSelector({ base, period }: { base: Route; period: ManagementPeriod }) { return <nav className="management-range" aria-label="Période d’analyse">{managementPeriods.map((item) => <Link className={period === item.value ? "active" : ""} href={{ pathname: base, query: { period: item.value } }} key={item.value}>{item.label}</Link>)}</nav>; }
export function Pager({ base, page, totalPages, search }: { base: Route; page: number; totalPages: number; search?: string }) { const query = (target: number) => ({ page: String(target), ...(search ? { search } : {}) }); return <nav className="management-pager" aria-label="Pagination"><Link aria-disabled={page <= 1} href={{ pathname: base, query: query(Math.max(1, page - 1)) }}>← Précédent</Link><span>Page {page} sur {totalPages}</span><Link aria-disabled={page >= totalPages} href={{ pathname: base, query: query(Math.min(totalPages, page + 1)) }}>Suivant →</Link></nav>; }
const statusLabels: Record<string, string> = { active: "actif", healthy: "opérationnel", completed: "terminée", attended: "présent", native: "natif", scheduled: "planifiée", verified: "vérifié", practice: "pratique", cancelled: "annulée", unverified: "non vérifié", no_show: "absent", unavailable: "indisponible", attention: "à surveiller", open: "ouvert", reviewing: "en revue", resolved: "résolu", dismissed: "classé", host: "hôte", reserved: "réservé", unknown: "inconnu" };
export function Status({ value }: { value: string }) { return <span className={`management-status ${value.replaceAll("_", "-")}`}>{statusLabels[value] || value.replaceAll("_", " ")}</span>; }
