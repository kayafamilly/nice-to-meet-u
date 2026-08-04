import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/app-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true }
};

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireCurrentUser();
  // Onboarding is intentionally a separate, minimal flow. The connected shell
  // appears only after the language profile is complete.
  if (!user.onboardingCompleted) return children;
  return <AppShell displayName={user.displayName}>{children}</AppShell>;
}
