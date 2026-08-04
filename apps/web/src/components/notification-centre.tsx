"use client";

import { useEffect, useState } from "react";
import { csrfToken } from "@/lib/client/csrf";
import { DeviceLocalTime } from "@/components/device-local-time";
import type { NotificationCentre as NotificationCentreDto } from "@/types/api";

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function NotificationCentre() {
  const [centre, setCentre] = useState<NotificationCentreDto>({ notifications: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  useEffect(() => {
    const load = () => void fetch("/api/app/notifications", { cache: "no-store" }).then(async (response) => response.ok ? response.json() as Promise<NotificationCentreDto> : null).then((data) => { if (data) setCentre(data); });
    load(); const timer = window.setInterval(load, 30_000); return () => window.clearInterval(timer);
  }, []);

  async function markRead(id: string): Promise<void> {
    const response = await fetch(`/api/app/notifications/${id}/read`, { method: "POST", headers: { "X-CSRF-Token": csrfToken() } });
    if (response.status === 404) {
      setCentre((current) => ({ ...current, notifications: current.notifications.filter((item) => item.id !== id), unreadCount: Math.max(0, current.unreadCount - 1) }));
      return;
    }
    if (!response.ok) throw new Error("Unable to mark notification as read");
    setCentre((current) => ({ ...current, unreadCount: Math.max(0, current.unreadCount - (current.notifications.find((item) => item.id === id)?.readAt ? 0 : 1)), notifications: current.notifications.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) }));
  }

  async function openNotification(id: string, url: string): Promise<void> {
    try { await markRead(id); } catch {}
    window.location.assign(url);
  }

  async function enablePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Push notifications are not supported by this browser.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Browser push remains off. In-app notifications still work.");
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const keyResponse = await fetch("/api/app/push-subscriptions/public-key", { cache: "no-store" });
      if (!keyResponse.ok) throw new Error("Unable to enable push right now.");
      const { publicKey } = await keyResponse.json() as { publicKey: string };
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch("/api/app/push-subscriptions", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() }, body: JSON.stringify(subscription) });
      if (!response.ok) throw new Error("Unable to save browser push permission.");
      setPushMessage("Browser push is enabled.");
    } catch (pushError) { setPushMessage(pushError instanceof Error ? pushError.message : "Unable to enable browser push."); }
  }

  return <div className="notification-wrap">
    <button className="icon-button" type="button" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span aria-hidden="true">●</span>{centre.unreadCount > 0 && <span className="notification-count">{centre.unreadCount}</span>}</button>
    {open && <section className="notification-panel" aria-label="Notification centre"><div className="notification-heading"><div><strong>Notifications</strong><p className="small-copy">{centre.unreadCount ? `${centre.unreadCount} unread` : "You are all caught up"}</p></div><button className="text-button" type="button" onClick={() => void enablePush()}>Enable push</button></div>{pushMessage && <p className="notice">{pushMessage}</p>}{centre.notifications.length === 0 ? <p className="small-copy">New reservations and reminders will appear here.</p> : centre.notifications.map((notification) => <a key={notification.id} className={`notification-item${notification.readAt ? "" : " unread"}`} href={notification.url} onClick={(event) => { event.preventDefault(); void openNotification(notification.id, notification.url); }}><strong>{notification.title}</strong><span>{notification.body}</span><span>{notification.createdAt ? <DeviceLocalTime value={notification.createdAt} options={{ dateStyle: "medium", timeStyle: "short" }} fallback="Recently" /> : "Recently"}</span></a>)}</section>}
  </div>;
}
