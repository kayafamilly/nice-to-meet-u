import type { ManagementPeriod } from "@/types/api";

export const managementPeriods: ReadonlyArray<{ value: ManagementPeriod; label: string }> = [
  { value: "day", label: "24 heures" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "30 jours" }
];

export function managementPeriod(value: string | undefined): ManagementPeriod {
  return value === "day" || value === "week" || value === "month" ? value : "month";
}

export function formatManagementChange(value: number | null): string {
  if (value === null) return "Nouveau";
  const percentage = Math.round(Math.abs(value) * 100);
  if (percentage === 0) return "Stable";
  return `${value > 0 ? "+" : "−"}${percentage} %`;
}
