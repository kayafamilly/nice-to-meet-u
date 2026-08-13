import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { title: "Management", robots: { index: false, follow: false, noarchive: true } };
export default function ManagementRootLayout({ children }: { children: ReactNode }) { return children; }
