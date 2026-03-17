import { NextRequest, NextResponse } from "next/server";

import { getTicketsByUser } from "@/lib/mvp-store";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ message: "Thieu x-user-id" }, { status: 401 });
  }

  return NextResponse.json({
    items: getTicketsByUser(userId),
  });
}
