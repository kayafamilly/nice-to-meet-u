"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { csrfToken } from "@/lib/client/csrf";

const links = [["/management", "Vue d’ensemble"], ["/management/analytics", "Acquisition & sessions"], ["/management/users", "Utilisateurs"], ["/management/sessions", "Sessions"], ["/management/moderation", "Modération"], ["/management/system", "Système"]] as const;
export function ManagementShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  async function logout() { await fetch("/api/management/logout", { method: "POST", headers: { "X-CSRF-Token": csrfToken() } }); router.replace("/management/login"); router.refresh(); }
  return <div className="management-app"><aside className="management-sidebar"><Link className="brand" href="/management"><span className="brand-mark">N</span><span>NiceToMeetU<br/><small>Pilotage</small></span></Link><nav>{links.map(([href, label]) => <Link className={pathname === href || (href !== "/management" && pathname.startsWith(href)) ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav><div className="management-sidebar-foot"><span>Propriétaire · Lecture seule</span><button className="text-button" onClick={() => void logout()}>Se déconnecter</button></div></aside><main className="management-main">{children}</main></div>;
}
