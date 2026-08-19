import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export function GET() {
  const destination = new URL("/", getServerEnv().NEXT_PUBLIC_APP_URL);
  destination.searchParams.set("utm_source", "instagram");
  destination.searchParams.set("utm_medium", "organic_social");
  destination.searchParams.set("utm_campaign", "bio_instagram");

  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "public, max-age=300");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
