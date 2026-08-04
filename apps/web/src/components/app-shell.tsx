"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { NotificationCentre } from "@/components/notification-centre";
import { csrfToken } from "@/lib/client/csrf";

export function AppShell({ children, displayName }: { children: React.ReactNode; displayName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const isLiveRoom = pathname.startsWith("/app/session/") && pathname.endsWith("/room");
  const links = [{ href: "/app/sessions", label: "Explore" }, { href: "/app/sessions/new", label: "Create" }, { href: "/app/profile", label: "Profile" }];
  function isActive(href: string): boolean {
    if (href === "/app/sessions/new") return pathname === href;
    if (href === "/app/sessions") return (pathname === href || pathname.startsWith("/app/sessions/") || pathname.startsWith("/app/session/")) && pathname !== "/app/sessions/new";
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  async function logOut() {
    setLoggingOut(true);
    const response = await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": csrfToken() } });
    if (!response.ok) { setLoggingOut(false); return; }
    router.replace("/login");
    router.refresh();
  }
  if (isLiveRoom) return children;
  return <>
    <div className="app-nav-wrap"><header className="shell app-nav">
      <Link className="brand" href="/app/sessions" aria-label="NiceToMeetU Explore"><span className="brand-mark">N</span><strong>NiceToMeetU</strong></Link>
      <nav className="app-nav-links" aria-label="Application navigation">{links.map((link) => <Link key={link.href} className={isActive(link.href) ? "active" : ""} href={link.href as Route}>{link.label}</Link>)}</nav>
      <div className="app-nav-actions"><NotificationCentre /><details className="account-menu"><summary aria-label="Open account menu"><span className="member-name">{displayName}</span><span className="avatar">{displayName.slice(0, 1).toUpperCase()}</span></summary><div className="account-menu-panel"><Link href="/app/profile">Profile</Link><button type="button" disabled={loggingOut} onClick={() => void logOut()}>{loggingOut ? "Logging out…" : "Log out"}</button></div></details></div>
    </header></div>
    {children}
  </>;
}
