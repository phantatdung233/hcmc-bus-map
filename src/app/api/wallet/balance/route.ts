import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/server-auth";
import { getWalletByUser } from "@/lib/user-store";

export async function GET(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
  }

  const wallet = await getWalletByUser(userId);

  return NextResponse.json({
    userId: wallet.userId,
    balance: wallet.balance,
    updatedAt: wallet.updatedAt,
  });
}
