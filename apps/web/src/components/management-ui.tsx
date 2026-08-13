import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { DeviceLocalTime } from "@/components/device-local-time";

export function ManagementHeading({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: ReactNode }) { return <header className="management-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{actions}</header>; }
export function Metric({ label, value, note, tone = "violet" }: { label: string; value: ReactNode; note?: string; tone?: string }) { return <article className={`management-metric ${tone}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>; }
export function LocalDate({ value }: { value: string | null }) { return value ? <DeviceLocalTime value={value} options={{ dateStyle: "medium", timeStyle: "short" }} /> : <>—</>; }
export function Pager({ base, page, totalPages, search }: { base: Route; page: number; totalPages: number; search?: string }) { const query = (target: number) => ({ page: String(target), ...(search ? { search } : {}) }); return <nav className="management-pager" aria-label="Pagination"><Link aria-disabled={page <= 1} href={{ pathname: base, query: query(Math.max(1, page - 1)) }}>← Previous</Link><span>Page {page} of {totalPages}</span><Link aria-disabled={page >= totalPages} href={{ pathname: base, query: query(Math.min(totalPages, page + 1)) }}>Next →</Link></nav>; }
export function Status({ value }: { value: string }) { return <span className={`management-status ${value.replaceAll("_", "-")}`}>{value.replaceAll("_", " ")}</span>; }
