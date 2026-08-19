import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const destination = new URL("/", request.url);
  destination.searchParams.set("utm_source", "tiktok");
  destination.searchParams.set("utm_medium", "organic_social");
  destination.searchParams.set("utm_campaign", "bio_tiktok");

  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "public, max-age=300");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
