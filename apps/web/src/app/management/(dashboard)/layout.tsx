import type { ReactNode } from "react";
import { ManagementShell } from "@/components/management-shell";
import { requireManagementSession } from "@/lib/management/auth";
export default async function ManagementLayout({ children }: { children: ReactNode }) { await requireManagementSession(); return <ManagementShell>{children}</ManagementShell>; }
