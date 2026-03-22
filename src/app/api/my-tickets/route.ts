import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const canonicalUrl = new URL("/api/tickets/my", request.url);
  return NextResponse.redirect(canonicalUrl, 307);
}
