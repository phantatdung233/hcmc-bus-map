import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/server-auth";
import { getTicketsByUser } from "@/lib/user-store";

export async function GET(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
  }

  return NextResponse.json({
    items: await getTicketsByUser(userId),
  });
}
