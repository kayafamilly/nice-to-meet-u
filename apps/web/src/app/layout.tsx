import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { DM_Serif_Display, Manrope } from "next/font/google";
import "@livekit/components-styles";
import "@/app/globals.css";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl, websiteStructuredData } from "@/lib/seo";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const editorial = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-editorial" });

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: SITE_NAME,
  title: {
    default: "Language Speaking Practice in Small Groups | NiceToMeetU",
    template: "%s | NiceToMeetU"
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION?.trim()
    ? { google: process.env.GOOGLE_SITE_VERIFICATION.trim() }
    : undefined,
  openGraph: {
    title: "Language Speaking Practice in Small Groups | NiceToMeetU",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "A small international group practising a language together" }]
  },
  twitter: { card: "summary_large_image", title: "Language Speaking Practice in Small Groups | NiceToMeetU", description: SITE_DESCRIPTION, images: ["/og.png"] }
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Reading the nonce makes every route request-rendered. Next.js can then
  // attach the nonce issued by proxy.ts to its framework and RSC scripts,
  // keeping the strict CSP without unsafe-eval or unsafe-inline for scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structuredData = JSON.stringify(websiteStructuredData()).replaceAll("<", "\\u003c");
  return (
    <html lang="en" nonce={nonce} className={`${manrope.variable} ${editorial.variable}`}>
      <head>
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      </head>
      <body nonce={nonce}>{children}</body>
    </html>
  );
}
