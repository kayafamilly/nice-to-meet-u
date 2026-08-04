"use client";

import { useSyncExternalStore } from "react";
import { formatInTimeZone } from "@/lib/domain/time-zone";

const subscribeToDeviceTimeZone = () => () => undefined;

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function useDeviceTimeZone(): string | null {
  return useSyncExternalStore(subscribeToDeviceTimeZone, deviceTimeZone, () => null);
}

export function DeviceLocalTime({
  value,
  options,
  fallback = "Date pending"
}: {
  value: string;
  options: Intl.DateTimeFormatOptions;
  fallback?: string;
}) {
  const timeZone = useDeviceTimeZone();
  const label = timeZone ? formatInTimeZone(value, timeZone, options) ?? fallback : null;

  return <time dateTime={value} title={timeZone ? `Shown in ${timeZone}` : undefined}>{label ?? "Local time..."}</time>;
}

export function DeviceTimeZone() {
  const timeZone = useDeviceTimeZone();
  return <>{timeZone ?? "Local timezone"}</>;
}
